import { createHmac, timingSafeEqual } from "crypto";
import { readFileSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import Fastify from "fastify";
import { Pool } from "pg";
import { FileBlobStore, MemoryStore, Store } from "../db/memoryStore";
import { PostgresStore } from "../db/postgresStore";
import { ClaudeModel } from "../model/ClaudeModel";
import { ReturnsModel } from "../model/ReturnsModel";
import { processReturn } from "../process/processReturn";
import { toContractRecord } from "../evidence/contract";
import { pendingRound3Output, Round3AgentInput, toRound3AgentOutput } from "../evidence/round3";
import { DEMO_ORGS, Disposition, PhotoInput } from "../types";

const PORT = Number(process.env.PORT || 8787);
const SECRET = process.env.SESSION_SECRET || "dev-only-change-me";
const ROOT = process.cwd();

const REASON_CODES = [
  "photos_insufficient",
  "identity_wrong",
  "parts_wrong",
  "condition_wrong",
  "disposition_wrong",
  "other",
];

export interface AppDeps {
  store: Store;
  model: ReturnsModel;
}

export function buildApp(deps: AppDeps) {
  const app = Fastify({ logger: false });

  app.get("/health", async () => ({
    ok: true,
    agent: "returns_manager",
    agent_id: "returns-manager@0.1.0",
    stage: "returns",
    round3: { run: "/v1/run", contract: "agent-output/evidence v1.0" },
  }));

  app.post("/session", async (request, reply) => {
    const body = request.body as { organization_id?: string };
    if (!body?.organization_id || !DEMO_ORGS.includes(body.organization_id as (typeof DEMO_ORGS)[number])) {
      return reply.code(400).send({ error: "organization_id must be org_demo_alpha or org_demo_bravo" });
    }
    const token = sign(body.organization_id);
    reply.header("set-cookie", `rtn_session=${token}; HttpOnly; Path=/; SameSite=Lax`);
    return { organization_id: body.organization_id };
  });

  app.post("/agent", async (request, reply) => {
    const org = orgFrom(request.headers.cookie);
    if (!org) return reply.code(401).send({ error: "session required" });
    const body = request.body as AgentBody;
    const photos = (body.photos ?? []).map(decodePhoto);
    const record = await processReturn(
      {
        organization_id: org,
        client_id: body.client_id || "demo-client",
        unit_id: body.unit_id || "",
        order_id: body.order_id || "",
        ordered_sku: body.ordered_sku || "",
        ordered_asin: body.ordered_asin || "",
        product_name: body.product_name || body.ordered_sku || "",
        parts_list: body.parts_list ?? [],
        operator_label: body.operator_label || "operator",
        photos,
        lookalikes: body.lookalikes?.length ? body.lookalikes : lookalikesFor(body.ordered_sku || ""),
        return_destination: body.return_destination ?? "unknown",
      },
      deps.model
    );
    const stored = photos.map((photo, index) => ({
      key: record.images[index].key,
      organization_id: org,
      bytes: photo.bytes,
      content_type: photo.media_type,
    }));
    await deps.store.save(record, stored);
    return record;
  });

  app.get("/records", async (request, reply) => {
    const org = orgFrom(request.headers.cookie);
    if (!org) return reply.code(401).send({ error: "session required" });
    return deps.store.list(org);
  });

  app.get("/records/:id", async (request, reply) => {
    const org = orgFrom(request.headers.cookie);
    if (!org) return reply.code(401).send({ error: "session required" });
    const { id } = request.params as { id: string };
    const record = await deps.store.get(org, id);
    if (!record) return reply.code(404).send({ error: "not found" });
    return record;
  });

  app.get("/v1/records", async (request, reply) => {
    const org = orgFrom(request.headers.cookie);
    if (!org) return reply.code(401).send({ error: "session required" });
    const records = await deps.store.list(org);
    return { records: records.map((record) => toContractRecord(record)), next_cursor: null };
  });

  app.get("/v1/records/:id", async (request, reply) => {
    const org = orgFrom(request.headers.cookie);
    if (!org) return reply.code(401).send({ error: "session required" });
    const { id } = request.params as { id: string };
    const record = await deps.store.get(org, id);
    if (!record) return reply.code(404).send({ error: "not found" });
    return toContractRecord(record);
  });

  /** Round 3 orchestrator entry: Agent Input → Agent Output (fail-open). */
  app.post("/v1/run", runRound3);
  app.post("/run", runRound3);

  async function runRound3(request: { body: unknown }, reply: { code: (n: number) => { send: (b: unknown) => unknown } }) {
    const body = request.body as Round3AgentInput;
    if (!body?.request_id || !body?.workflow_id || !body?.subject?.org_id || !body?.subject?.subject_id) {
      return reply.code(400).send({ error: "request_id, workflow_id, subject.org_id, subject.subject_id required" });
    }
    if (body.stage && body.stage !== "returns") {
      return reply.code(400).send({ error: "stage must be returns" });
    }
    if (!DEMO_ORGS.includes(body.subject.org_id as (typeof DEMO_ORGS)[number])) {
      return reply.code(404).send({ error: "unknown tenant" });
    }
    const ctx = body.context ?? {};
    try {
      const photos = await photosFromRound3(body);
      if (!photos.length) {
        return pendingRound3Output(body, "No usable photos were attached to this Agent Input", { retryable: true });
      }
      const record = await processReturn(
        {
          organization_id: body.subject.org_id,
          client_id: String(ctx.client_id || "round3-orchestrator"),
          unit_id: body.subject.subject_id,
          order_id: String(ctx.order_id || body.subject.subject_id),
          ordered_sku: String(ctx.ordered_sku || "UNKNOWN"),
          ordered_asin: String(ctx.ordered_asin || "UNKNOWN"),
          product_name: String(ctx.product_name || ctx.ordered_sku || body.subject.subject_id),
          parts_list: Array.isArray(ctx.parts_list) ? ctx.parts_list.map(String) : [],
          operator_label: String(ctx.operator_id || "orchestrator"),
          photos,
          lookalikes: lookalikesFor(String(ctx.ordered_sku || "")),
          return_destination: ctx.return_destination ?? "unknown",
        },
        deps.model
      );
      const stored = photos.map((photo, index) => ({
        key: record.images[index].key,
        organization_id: body.subject.org_id,
        bytes: photo.bytes,
        content_type: photo.media_type,
      }));
      await deps.store.save(record, stored);
      return toRound3AgentOutput(record, body);
    } catch (err) {
      const message = err instanceof Error ? err.message : "returns agent failed";
      return pendingRound3Output(body, message, { retryable: true });
    }
  }

  app.post("/records/:id/override", async (request, reply) => {
    const org = orgFrom(request.headers.cookie);
    if (!org) return reply.code(401).send({ error: "session required" });
    const { id } = request.params as { id: string };
    const body = request.body as {
      revised_disposition?: Disposition;
      reason_code?: string;
      reason?: string;
      operator_label?: string;
    };
    if (!body.revised_disposition || !body.reason_code || !body.reason) {
      return reply.code(400).send({ error: "revised_disposition, reason_code, and reason are required" });
    }
    if (!REASON_CODES.includes(body.reason_code)) {
      return reply.code(400).send({ error: "unknown reason_code" });
    }
    const current = await deps.store.get(org, id);
    if (!current) return reply.code(404).send({ error: "not found" });
    const updated = await deps.store.addOverride(org, id, {
      original_disposition: current.outcome.disposition,
      revised_disposition: body.revised_disposition,
      reason_code: body.reason_code,
      reason: body.reason,
      operator_label: body.operator_label || "operator",
      at: new Date().toISOString(),
    });
    if (!updated) return reply.code(404).send({ error: "not found" });
    return updated;
  });

  app.get("/images/*", async (request, reply) => {
    const org = orgFrom(request.headers.cookie);
    if (!org) return reply.code(401).send({ error: "session required" });
    const key = (request.params as { "*": string })["*"];
    const image = await deps.store.getImage(org, key);
    if (!image || image.bytes.length === 0) return reply.code(404).send({ error: "not found" });
    reply.header("content-type", image.content_type);
    reply.header("cache-control", "private, no-store");
    return reply.send(image.bytes);
  });

  app.get("/", async (_request, reply) => page(reply, "index.html"));
  app.get("/evaluation", async (_request, reply) => page(reply, "evaluation.html"));
  app.get("/failures", async (_request, reply) => page(reply, "failures.html"));
  app.get("/about", async (_request, reply) => page(reply, "about.html"));
  app.get("/demo", async (_request, reply) => page(reply, "demo.html"));

  app.get("/static/:file", async (request, reply) => {
    const file = (request.params as { file: string }).file;
    if (file.includes("..") || file.includes("/")) return reply.code(400).send({ error: "bad path" });
    const target = path.join(ROOT, "public", file);
    try {
      const body = await readFile(target);
      const media =
        file.endsWith(".css") ? "text/css"
        : file.endsWith(".js") ? "application/javascript"
        : file.endsWith(".json") ? "application/json"
        : "application/octet-stream";
      reply.type(media).send(body);
    } catch {
      return reply.code(404).send({ error: "static not found" });
    }
  });

  /** Frozen evaluation photos for desk examples (RTN-001, RTN-019, …). */
  app.get("/frozen/:caseId/:file", async (request, reply) => {
    const { caseId, file } = request.params as { caseId: string; file: string };
    if (!/^RTN-\d{3}$/.test(caseId) || file.includes("..") || file.includes("/")) {
      return reply.code(400).send({ error: "bad frozen path" });
    }
    const target = path.join(ROOT, "public", "frozen", caseId, file);
    try {
      const body = await readFile(target);
      const lower = file.toLowerCase();
      const media =
        lower.endsWith(".png") ? "image/png"
        : lower.endsWith(".webp") ? "image/webp"
        : "image/jpeg";
      reply.header("cache-control", "public, max-age=3600");
      reply.type(media).send(body);
    } catch {
      return reply.code(404).send({ error: "frozen photo not found" });
    }
  });

  app.get("/api/frozen/:caseId", async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    if (!/^RTN-\d{3}$/.test(caseId)) return reply.code(400).send({ error: "bad case id" });
    const dir = path.join(ROOT, "public", "frozen", caseId);
    try {
      const { readdirSync } = await import("fs");
      const files = readdirSync(dir)
        .filter((name) => /\.(jpe?g|png|webp)$/i.test(name))
        .sort()
        .map((name) => ({
          key: name,
          url: `/frozen/${caseId}/${name}`,
          quality: name.replace(/\.[^.]+$/, "").replace(/^\d+_?/, "").replace(/_/g, " ") || name,
        }));
      return { case_id: caseId, photos: files };
    } catch {
      return { case_id: caseId, photos: [] };
    }
  });

  app.get("/api/eval/summary", async (_request, reply) => {
    const body = await readFile(path.join(ROOT, "public", "eval-summary.json"), "utf8");
    reply.type("application/json").send(body);
  });

  app.get("/api/eval/failures", async (_request, reply) => {
    const body = await readFile(path.join(ROOT, "public", "eval-failures.json"), "utf8");
    reply.type("application/json").send(body);
  });

  app.get("/docs/:file", async (request, reply) => {
    const file = (request.params as { file: string }).file;
    if (file.includes("..") || file.includes("/")) return reply.code(400).send({ error: "bad path" });
    const target = path.join(ROOT, "docs", file);
    try {
      const body = await readFile(target);
      const media =
        file.endsWith(".md") ? "text/markdown"
        : file.endsWith(".pdf") ? "application/pdf"
        : file.endsWith(".html") ? "text/html"
        : "application/octet-stream";
      if (file.endsWith(".pdf")) reply.header("content-disposition", `inline; filename="${file}"`);
      reply.type(media).send(body);
    } catch {
      return reply.code(404).send({ error: "doc not found" });
    }
  });

  app.get("/eval/:file", async (request, reply) => {
    const file = (request.params as { file: string }).file;
    if (file.includes("..") || file.includes("/")) return reply.code(400).send({ error: "bad path" });
    const target = path.join(ROOT, "eval", file);
    try {
      const body = await readFile(target);
      const media =
        file.endsWith(".json") ? "application/json"
        : file.endsWith(".csv") ? "text/csv"
        : file.endsWith(".md") ? "text/markdown"
        : "application/octet-stream";
      reply.type(media).send(body);
    } catch {
      return reply.code(404).send({ error: "eval file not found" });
    }
  });

  return app;
}

async function page(reply: { type: (t: string) => { send: (b: unknown) => unknown } }, name: string) {
  const html = await readFile(path.join(ROOT, "public", name), "utf8");
  return reply.type("text/html").send(html);
}

interface AgentBody {
  client_id?: string;
  unit_id?: string;
  order_id?: string;
  ordered_sku?: string;
  ordered_asin?: string;
  product_name?: string;
  parts_list?: string[];
  operator_label?: string;
  return_destination?: "seller" | "channel_warehouse" | "unknown";
  lookalikes?: { sku: string; asin: string; product_name: string }[];
  photos?: { filename?: string; media_type?: string; data_base64: string }[];
}

async function photosFromRound3(body: Round3AgentInput): Promise<PhotoInput[]> {
  const out: PhotoInput[] = [];
  for (const row of body.inputs ?? []) {
    if (row.data_base64) {
      out.push({
        filename: path.basename(row.ref) || "photo.jpg",
        media_type: row.media_type || "image/jpeg",
        bytes: Buffer.from(row.data_base64, "base64"),
      });
      continue;
    }
    const candidates = [
      row.ref,
      path.join(ROOT, row.ref),
      path.join(ROOT, "data", "input", body.subject.subject_id, "returns", path.basename(row.ref)),
    ];
    for (const candidate of candidates) {
      try {
        const bytes = await readFile(candidate);
        out.push({
          filename: path.basename(candidate),
          media_type: row.media_type || guessMedia(candidate),
          bytes,
        });
        break;
      } catch {
        /* try next */
      }
    }
  }
  return out.slice(0, 8);
}

function guessMedia(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

function lookalikesFor(sku: string) {
  try {
    const file = path.join(ROOT, "fixtures", "data", "vision-gate-fixtures.json");
    const data = JSON.parse(readFileSync(file, "utf8")) as {
      fixtures: { ordered_sku: string; ordered_asin: string; product_name: string }[];
    };
    const seen = new Set<string>();
    return data.fixtures
      .filter((item) => item.ordered_sku !== sku && !seen.has(item.ordered_sku) && seen.add(item.ordered_sku))
      .map((item) => ({ sku: item.ordered_sku, asin: item.ordered_asin, product_name: item.product_name }))
      .slice(0, 6);
  } catch {
    return [];
  }
}

function decodePhoto(photo: { filename?: string; media_type?: string; data_base64: string }): PhotoInput {
  return {
    filename: photo.filename || "photo.jpg",
    media_type: photo.media_type || "image/jpeg",
    bytes: Buffer.from(photo.data_base64, "base64"),
  };
}

function orgFrom(cookieHeader?: string): string | null {
  const token = readCookie(cookieHeader, "rtn_session");
  if (!token) return null;
  const org = verify(token);
  if (!org || !DEMO_ORGS.includes(org as (typeof DEMO_ORGS)[number])) return null;
  return org;
}

function sign(org: string): string {
  const body = Buffer.from(JSON.stringify({ org })).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verify(token: string): string | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", SECRET).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const parsed = JSON.parse(Buffer.from(body, "base64url").toString()) as { org?: string };
  return parsed.org ?? null;
}

function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  const part = header.split(";").map((p) => p.trim()).find((p) => p.startsWith(`${name}=`));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : null;
}

export function createRuntimeApp() {
  const model = process.env.ANTHROPIC_API_KEY
    ? new ClaudeModel()
    : new FailOpenModel();
  const memory = new MemoryStore();
  const blobRoot = process.env.VERCEL ? "/tmp/rtn-blobs" : path.join(ROOT, process.env.BLOB_DIR || "data/blobs");
  let store: Store = new FileBlobStore(memory, blobRoot);
  if (process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    store = new FileBlobStore(new PostgresStore(pool), blobRoot);
  }
  return buildApp({ store, model });
}

async function main() {
  const app = createRuntimeApp();
  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`returns manager http://localhost:${PORT}`);
}

class FailOpenModel implements ReturnsModel {
  readonly name = "unconfigured";
  async infer(): Promise<never> {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
