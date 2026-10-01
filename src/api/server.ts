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

  app.get("/health", async () => ({ ok: true, agent: "returns_manager" }));

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

  app.get("/", async (_request, reply) => {
    const html = await readFile(path.join(ROOT, "public", "index.html"), "utf8");
    reply.type("text/html").send(html);
  });

  return app;
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
