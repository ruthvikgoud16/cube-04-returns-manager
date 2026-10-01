import { Pool } from "pg";
import { PostgresStore } from "../src/db/postgresStore";
import { buildRecord } from "../src/evidence/build";
import { CaptureInput } from "../src/types";

const url = process.env.DATABASE_URL;
const describePg = url ? describe : describe.skip;

describePg("postgres row level security", () => {
  const pool = new Pool({ connectionString: url });
  const store = new PostgresStore(pool);

  afterAll(async () => {
    await pool.end();
  });

  it("does not return alpha rows or image keys to bravo", async () => {
    const input: CaptureInput = {
      organization_id: "org_demo_alpha",
      client_id: "seller-a",
      unit_id: "UNIT-PG",
      order_id: "ORD-PG",
      ordered_sku: "SKU-PG",
      ordered_asin: "B0PG",
      product_name: "Isolated unit",
      parts_list: ["unit"],
      operator_label: "op",
      photos: [],
    };
    const record = buildRecord({
      input,
      images: [{ key: "org_demo_alpha/secretphoto", quality: "usable", reasons: [], content_type: "image/jpeg" }],
      checks: [],
      disposition: "pending_review",
      rationale: "test",
      grade: null,
      modelVersion: null,
      inferenceCallCount: 0,
      failure: "test",
      status: "pending_review",
      recordId: `RTN-pg-${Date.now()}`,
      capturedAt: new Date().toISOString(),
    });
    await store.save(record, [
      { key: record.images[0].key, organization_id: "org_demo_alpha", bytes: Buffer.alloc(0), content_type: "image/jpeg" },
    ]);
    expect(await store.list("org_demo_bravo")).toEqual([]);
    expect(await store.get("org_demo_bravo", record.record_id)).toBeNull();
    expect(await store.getImage("org_demo_bravo", record.images[0].key)).toBeNull();
    expect((await store.get("org_demo_alpha", record.record_id))?.record_id).toBe(record.record_id);
  });
});
