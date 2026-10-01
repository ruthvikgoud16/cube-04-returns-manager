import { execFileSync } from "child_process";
import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { ClaudeModel } from "../src/model/ClaudeModel";
import { ModelRequest, ReturnsModel } from "../src/model/ReturnsModel";
import { processReturn } from "../src/process/processReturn";
import { loadState } from "./operations";
import { PHOTO_SLOTS, slot } from "./model";

loadEnv();

const state = loadState();
const dest = path.join(process.cwd(), "collection", "export", "five");
fs.mkdirSync(dest, { recursive: true });

class Meter implements ReturnsModel {
  name = "claude";
  inputTokens = 0;
  outputTokens = 0;
  constructor(private inner: ClaudeModel) {}
  async infer(input: ModelRequest) {
    const response = await this.inner.infer(input);
    this.inputTokens += response.usage?.input_tokens ?? 0;
    this.outputTokens += response.usage?.output_tokens ?? 0;
    return response;
  }
}

async function main() {
  const model = new Meter(new ClaudeModel());
  const reports = [];
  for (let n = 1; n <= 5; n += 1) {
    const item = slot(n);
    const photos = [];
    const seen = new Set<string>();
    const notes: string[] = [];
    for (const view of PHOTO_SLOTS) {
      const folder = state.nodes[`${item.folderName}/02 — PHOTOS/${view.folder}`];
      if (!folder) continue;
      const file = findImage(folder.id);
      if (!file) {
        notes.push(`${view.key}: empty`);
        continue;
      }
      const bytes = await shrink(download(file.id));
      const hash = createHash("sha256").update(bytes).digest("hex");
      if (seen.has(hash)) {
        notes.push(`${view.key}: same photo as an earlier view`);
        continue;
      }
      seen.add(hash);
      photos.push({ bytes, media_type: "image/jpeg", filename: `${view.key}.jpg` });
      notes.push(`${view.key}: included`);
    }
    const record = await processReturn(
      {
        organization_id: "org_demo_alpha",
        client_id: "collection-test",
        unit_id: item.unitId,
        order_id: item.orderId,
        ordered_sku: "UNKNOWN",
        ordered_asin: "UNKNOWN",
        product_name: "unspecified physical product",
        parts_list: ["the photographed product"],
        operator_label: "collection",
        photos,
      },
      model
    );
    reports.push({
      case_id: item.caseId,
      status: record.status,
      disposition: record.outcome.disposition,
      calls: record.inference_call_count,
      failure: record.failure,
      notes,
      identity: record.checks.find((check) => check.check_key === "identity")?.verdict ?? null,
      completeness: record.checks.find((check) => check.check_key === "completeness")?.verdict ?? null,
      condition: record.checks.find((check) => check.check_key === "condition")?.verdict ?? null,
      amazon_grade: record.returns.amazon_condition,
    });
    console.log(JSON.stringify(reports[reports.length - 1]));
    console.log(`tokens so far in=${model.inputTokens} out=${model.outputTokens}`);
  }
  const summary = {
    products: reports,
    input_tokens: model.inputTokens,
    output_tokens: model.outputTokens,
    estimated_usd: Number(((model.inputTokens * 3 + model.outputTokens * 15) / 1_000_000).toFixed(4)),
  };
  fs.writeFileSync(path.join(dest, "results.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ estimated_usd: summary.estimated_usd, input_tokens: summary.input_tokens, output_tokens: summary.output_tokens }));
}

function findImage(parentId: string): { id: string } | null {
  const result = execute("GOOGLEDRIVE_FIND_FILE", { q: `'${parentId}' in parents and trashed = false`, pageSize: 10 });
  const files = result.files || result.data?.files || [];
  const image = files.find((file: { mimeType?: string }) => String(file.mimeType || "").startsWith("image/"));
  return image ? { id: image.id } : null;
}

function download(fileId: string): Buffer {
  const result = execute("GOOGLEDRIVE_DOWNLOAD_FILE", { fileId });
  const url = findUrl(result);
  if (!url) throw new Error(`no download url for ${fileId}`);
  return execFileSync("curl", ["-fsSL", url], { encoding: "buffer", maxBuffer: 30_000_000 });
}

async function shrink(bytes: Buffer): Promise<Buffer> {
  const meta = await sharp(bytes, { failOn: "none" }).rotate().metadata();
  const width = meta.width ?? 1;
  const height = meta.height ?? 1;
  const long = Math.max(width, height);
  const short = Math.min(width, height);
  const scale = Math.max(480 / short, Math.min(1, 768 / long));
  return sharp(bytes, { failOn: "none" })
    .rotate()
    .resize(Math.round(width * scale), Math.round(height * scale), { fit: "fill" })
    .jpeg({ quality: 75 })
    .toBuffer();
}

function execute(slug: string, data: Record<string, unknown>): any {
  const stdout = execFileSync("composio", ["execute", slug, "-d", JSON.stringify(data)], { encoding: "utf8" });
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  return JSON.parse(stdout.slice(start, end + 1));
}

function findUrl(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.s3url === "string") return record.s3url;
  for (const child of Object.values(record)) {
    const found = findUrl(child);
    if (found) return found;
  }
  return undefined;
}

function loadEnv(): void {
  const file = path.join(process.cwd(), ".env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
