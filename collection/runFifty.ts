import { execFileSync } from "child_process";
import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { parseCsv } from "./csv";
import { slot } from "./model";
import { ClaudeModel } from "../src/model/ClaudeModel";
import { ModelRequest, ReturnsModel } from "../src/model/ReturnsModel";
import { processReturn } from "../src/process/processReturn";
import { PhotoInput } from "../src/types";
import { loadState } from "./operations";

loadEnv();

const dest = path.join(process.cwd(), "collection", "export", "fifty");
const outFile = process.env.RTN_RESULTS
  ? path.resolve(process.env.RTN_RESULTS)
  : path.join(dest, "results.json");
fs.mkdirSync(path.dirname(outFile), { recursive: true });

const onlyCase = argValue("--only");
const brokenDownload = process.argv.includes("--broken-download");
const FOLDER = "application/vnd.google-apps.folder";

type IngestState = "graded" | "ingestion_retry" | "genuinely_no_photo" | "model_error";

interface SavedGrade {
  case_id: string;
  product_name: string;
  state: IngestState;
  status: string;
  disposition: string;
  calls: number;
  failure: string | null;
  notes: string[];
  identity: string;
  completeness: string;
  condition: string;
  amazon_grade: string;
  photos_found: number;
  download_ok: number;
}

interface DriveFile {
  id: string;
  name?: string;
  mimeType?: string;
}

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
  const names = productNames();
  const done = loadDone();
  const model = new Meter(new ClaudeModel());
  seedMeter(model);
  const state = loadState();
  const catalog = names.map((name, index) => ({ sku: `RTN-${String(index + 1).padStart(3, "0")}`, asin: "UNKNOWN", product_name: name }));
  for (let n = 1; n <= 50; n += 1) {
    const item = slot(n);
    if (onlyCase && item.caseId !== onlyCase) continue;
    const prior = done.find((row) => row.case_id === item.caseId);
    if (prior && finished(prior)) continue;
    try {
      const acquired = await acquire(item.caseId, item.folderName, state.nodes);
      if (acquired.kind !== "ready") {
        upsert(done, blank(item.caseId, names[n - 1], acquired.kind, acquired.failure, acquired.notes, acquired.photosFound, acquired.downloadOk));
        save(done, model);
        if (acquired.failure && /quota|rate|403/i.test(acquired.failure)) sleep(25);
        continue;
      }
      console.log(`[${item.caseId}] DOWNLOAD_OK=${acquired.photos.length}`);
      const record = await processReturn(
        {
          organization_id: "org_demo_alpha",
          client_id: "collection-50",
          unit_id: item.unitId,
          order_id: item.orderId,
          ordered_sku: "UNKNOWN",
          ordered_asin: "UNKNOWN",
          product_name: names[n - 1],
          parts_list: [names[n - 1]],
          operator_label: "collection",
          lookalikes: catalog.filter((entry) => entry.sku !== item.caseId),
          photos: acquired.photos,
        },
        model
      );
      const calls = record.inference_call_count;
      console.log(`[${item.caseId}] MODEL_CALL=${calls}`);
      if (calls < 1) {
        console.log(`[${item.caseId}] INGESTION_RETRYABLE`);
        upsert(done, blank(item.caseId, names[n - 1], "ingestion_retry", record.failure ?? "model was not called", acquired.notes, acquired.photosFound, acquired.photos.length));
        save(done, model);
        continue;
      }
      console.log(`[${item.caseId}] RESULT=${record.outcome.disposition}`);
      upsert(done, {
        case_id: item.caseId,
        product_name: names[n - 1],
        state: record.failure ? "model_error" : "graded",
        status: record.status,
        disposition: record.outcome.disposition,
        calls,
        failure: record.failure,
        notes: acquired.notes,
        identity: verdict(record, "identity"),
        completeness: verdict(record, "completeness"),
        condition: verdict(record, "condition"),
        amazon_grade: record.returns.amazon_condition,
        photos_found: acquired.photosFound,
        download_ok: acquired.photos.length,
      });
      save(done, model);
      const spent = estimate(model);
      console.log(`${item.caseId} ${record.outcome.disposition} spent≈$${spent}`);
      if (spent >= 3) {
        console.log("Stopped to keep API credit for the rest of the project.");
        break;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`[${item.caseId}] INGESTION_RETRYABLE`);
      console.log(`[${item.caseId}] MODEL_CALL=0`);
      upsert(done, blank(item.caseId, names[n - 1], "ingestion_retry", message, [], 0, 0));
      save(done, model);
      if (/credit|invalid x-api-key|authentication/i.test(message)) break;
      if (/quota|rate|403/i.test(message)) sleep(25);
    }
  }
  save(done, model);
}

type Acquire =
  | { kind: "ready"; photos: PhotoInput[]; notes: string[]; photosFound: number; downloadOk: number }
  | { kind: "ingestion_retry" | "genuinely_no_photo"; failure: string | null; notes: string[]; photosFound: number; downloadOk: number };

async function acquire(
  caseId: string,
  folderName: string,
  nodes: Record<string, { id: string }>
): Promise<Acquire> {
  const product = nodes[folderName];
  const photoFolder = nodes[`${folderName}/02 — PHOTOS`];
  if (!product?.id || !photoFolder?.id) {
    console.log(`[${caseId}] DRIVE_LOOKUP_ERROR attempt=1/3`);
    console.log(`[${caseId}] INGESTION_RETRYABLE`);
    console.log(`[${caseId}] MODEL_CALL=0`);
    return { kind: "ingestion_retry", failure: "product or PHOTOS folder was not resolved", notes: [], photosFound: 0, downloadOk: 0 };
  }
  console.log(`[${caseId}] DRIVE_LOOKUP`);
  let found: DriveFile[];
  try {
    found = discoverImages(photoFolder.id, caseId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`[${caseId}] INGESTION_RETRYABLE`);
    console.log(`[${caseId}] MODEL_CALL=0`);
    return { kind: "ingestion_retry", failure: message, notes: [], photosFound: 0, downloadOk: 0 };
  }
  console.log(`[${caseId}] PHOTOS_FOUND=${found.length}`);
  if (found.length === 0) {
    console.log(`[${caseId}] DOWNLOAD_OK=0`);
    console.log(`[${caseId}] GENUINELY_NO_PHOTO`);
    console.log(`[${caseId}] MODEL_CALL=0`);
    return { kind: "genuinely_no_photo", failure: null, notes: ["photos folder listed and contained no images"], photosFound: 0, downloadOk: 0 };
  }
  if (brokenDownload) {
    try {
      downloadFile("not-a-real-file-id", caseId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`[${caseId}] INGESTION_RETRYABLE`);
      console.log(`[${caseId}] MODEL_CALL=0`);
      return { kind: "ingestion_retry", failure: message, notes: ["forced download failure"], photosFound: found.length, downloadOk: 0 };
    }
  }
  const photos: PhotoInput[] = [];
  const seen = new Set<string>();
  const notes: string[] = [];
  try {
    for (let index = 0; index < found.length; index += 1) {
      const label = `photo-${index + 1}`;
      if (photos.length >= 8) {
        notes.push(`${label}: extra`);
        continue;
      }
      const bytes = downloadFile(found[index].id, caseId);
      if (!bytes.length || !isImageBytes(bytes)) throw new Error(`downloaded file ${found[index].id} is empty or not an image`);
      const jpeg = await shrink(bytes);
      if (!jpeg.length) throw new Error(`converted file ${found[index].id} is empty`);
      const hash = createHash("sha256").update(jpeg).digest("hex");
      if (seen.has(hash)) {
        notes.push(`${label}: duplicate`);
        continue;
      }
      seen.add(hash);
      photos.push({ bytes: jpeg, media_type: "image/jpeg", filename: `${label}.jpg` });
      notes.push(`${label}: included`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`[${caseId}] INGESTION_RETRYABLE`);
    console.log(`[${caseId}] MODEL_CALL=0`);
    return { kind: "ingestion_retry", failure: message, notes, photosFound: found.length, downloadOk: photos.length };
  }
  if (photos.length < 1) {
    console.log(`[${caseId}] INGESTION_RETRYABLE`);
    console.log(`[${caseId}] MODEL_CALL=0`);
    return { kind: "ingestion_retry", failure: "no usable image bytes after download", notes, photosFound: found.length, downloadOk: 0 };
  }
  return { kind: "ready", photos, notes, photosFound: found.length, downloadOk: photos.length };
}

function discoverImages(photosFolderId: string, caseId: string): DriveFile[] {
  const top = listChildren(photosFolderId, caseId);
  const images = top.filter(isImageFile);
  for (const folder of top.filter(isFolder)) {
    const nested = listChildren(folder.id, caseId);
    for (const file of nested.filter(isImageFile)) images.push(file);
  }
  const seen = new Set<string>();
  return images.filter((file) => {
    if (seen.has(file.id)) return false;
    seen.add(file.id);
    return true;
  });
}

function listChildren(parentId: string, caseId: string): DriveFile[] {
  return withRetry(caseId, "DRIVE_LOOKUP_ERROR", () => {
    const result = driveCall("GOOGLEDRIVE_FIND_FILE", { q: `'${parentId}' in parents and trashed = false`, pageSize: 100 });
    const files = result.data?.files ?? result.files;
    if (!Array.isArray(files)) throw new Error("Drive file list was missing");
    if (result.data?.nextPageToken || result.nextPageToken || result.data?.incompleteSearch === true) {
      throw new Error("Drive file list was incomplete");
    }
    return files as DriveFile[];
  });
}

function downloadFile(fileId: string, caseId: string): Buffer {
  return withRetry(caseId, "DOWNLOAD_ERROR", () => {
    const result = driveCall("GOOGLEDRIVE_DOWNLOAD_FILE", { fileId });
    const url = findUrl(result);
    if (!url) throw new Error(`no download url for ${fileId}`);
    const bytes = execFileSync("curl", ["-fsSL", "--max-time", "40", url], { encoding: "buffer", maxBuffer: 30_000_000 });
    if (!bytes.length) throw new Error(`empty download for ${fileId}`);
    return bytes;
  });
}

function withRetry<T>(caseId: string, label: string, fn: () => T): T {
  let last = "Drive request failed";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return fn();
    } catch (err) {
      last = err instanceof Error ? err.message : String(err);
      console.log(`[${caseId}] ${label} attempt=${attempt}/3`);
      if (attempt < 3) sleep(5 * 2 ** (attempt - 1));
    }
  }
  throw new Error(last);
}

function driveCall(slug: string, data: Record<string, unknown>): any {
  sleep(2.5);
  const stdout = execFileSync("composio", ["execute", slug, "-d", JSON.stringify(data)], { encoding: "utf8", maxBuffer: 20_000_000 });
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error(stdout.slice(0, 180));
  const parsed = JSON.parse(stdout.slice(start, end + 1));
  if (parsed.successful === false) {
    const message = String(parsed.error || parsed.data?.message || "Drive request failed");
    throw new Error(message.slice(0, 180));
  }
  return parsed;
}

function isImageFile(file: DriveFile): boolean {
  return Boolean(file.id) && String(file.mimeType || "").startsWith("image/");
}

function isFolder(file: DriveFile): boolean {
  return file.mimeType === FOLDER && Boolean(file.id);
}

function isImageBytes(bytes: Buffer): boolean {
  if (bytes.length < 12) return false;
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return true;
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return true;
  if (bytes.slice(0, 4).toString("ascii") === "GIF8") return true;
  if (bytes.slice(0, 4).toString("ascii") === "RIFF" && bytes.slice(8, 12).toString("ascii") === "WEBP") return true;
  return bytes.slice(4, 8).toString("ascii") === "ftyp";
}

function finished(row: SavedGrade): boolean {
  return row.state === "graded" || row.state === "model_error" || row.state === "genuinely_no_photo";
}

function blank(
  caseId: string,
  productName: string,
  state: "ingestion_retry" | "genuinely_no_photo",
  failure: string | null,
  notes: string[],
  photosFound: number,
  downloadOk: number
): SavedGrade {
  return {
    case_id: caseId,
    product_name: productName,
    state,
    status: state,
    disposition: "",
    calls: 0,
    failure,
    notes,
    identity: "",
    completeness: "",
    condition: "",
    amazon_grade: "",
    photos_found: photosFound,
    download_ok: downloadOk,
  };
}

function upsert(rows: SavedGrade[], row: SavedGrade): void {
  const index = rows.findIndex((item) => item.case_id === row.case_id);
  if (index >= 0) rows[index] = row;
  else rows.push(row);
}

function verdict(record: { checks: { check_key: string; verdict: string }[] }, key: string): string {
  return record.checks.find((check) => check.check_key === key)?.verdict ?? "";
}

function productNames(): string[] {
  const rows = parseCsv(fs.readFileSync(path.join(process.cwd(), "eval", "labels-rishik-goud.csv"), "utf8"));
  return rows.map((row) => row.product_name);
}

function loadDone(): SavedGrade[] {
  if (!fs.existsSync(outFile)) return [];
  const raw = JSON.parse(fs.readFileSync(outFile, "utf8")).products ?? [];
  const kept: SavedGrade[] = [];
  for (const row of raw) {
    const normalized = normalize(row);
    if (normalized) kept.push(normalized);
    else console.log(`removed false row ${row.case_id}`);
  }
  return kept;
}

function normalize(row: Partial<SavedGrade> & { case_id?: string }): SavedGrade | null {
  if (!row.case_id) return null;
  if (row.state === "graded" || row.state === "model_error" || row.state === "genuinely_no_photo" || row.state === "ingestion_retry") {
    return row as SavedGrade;
  }
  if (row.calls === 1 && !row.failure) return { ...emptyShell(row.case_id), ...row, state: "graded" } as SavedGrade;
  if (row.calls === 1 && row.failure) return { ...emptyShell(row.case_id), ...row, state: "model_error" } as SavedGrade;
  return null;
}

function emptyShell(caseId: string): SavedGrade {
  return blank(caseId, "", "ingestion_retry", null, [], 0, 0);
}

function seedMeter(model: Meter): void {
  if (!fs.existsSync(outFile)) return;
  const saved = JSON.parse(fs.readFileSync(outFile, "utf8"));
  model.inputTokens = Number(saved.input_tokens) || 0;
  model.outputTokens = Number(saved.output_tokens) || 0;
}

function save(products: SavedGrade[], model: Meter): void {
  fs.writeFileSync(outFile, JSON.stringify({
    products,
    input_tokens: model.inputTokens,
    output_tokens: model.outputTokens,
    estimated_usd: estimate(model),
  }, null, 2));
}

function estimate(model: Meter): number {
  return Number(((model.inputTokens * 3 + model.outputTokens * 15) / 1_000_000).toFixed(4));
}

async function shrink(bytes: Buffer): Promise<Buffer> {
  const meta = await sharp(bytes, { failOn: "none" }).rotate().metadata();
  const width = meta.width ?? 1;
  const height = meta.height ?? 1;
  const long = Math.max(width, height);
  const short = Math.min(width, height);
  const scale = Math.max(480 / short, Math.min(1, 768 / long));
  return sharp(bytes, { failOn: "none" }).rotate().resize(Math.round(width * scale), Math.round(height * scale), { fit: "fill" }).jpeg({ quality: 75 }).toBuffer();
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

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function sleep(seconds: number): void {
  execFileSync("sleep", [String(seconds)]);
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
