import sharp from "sharp";
import { buildApp } from "../src/api/server";
import { MemoryStore } from "../src/db/memoryStore";
import { ReturnsModel } from "../src/model/ReturnsModel";
import { applyPolicy } from "../src/policy/policy";
import { processReturn } from "../src/process/processReturn";
import { assessPhoto } from "../src/quality/gate";
import { CaptureInput, ModelGrade } from "../src/types";

function grade(partial: Partial<ModelGrade> = {}): ModelGrade {
  return {
    identity: {
      matches_ordered: true,
      not_observable: false,
      readable_identifier: null,
      confused_with_sku: null,
      confidence: 0.4,
      evidence: "the ordered product is visible",
      ...partial.identity,
    },
    completeness: {
      parts_seen: ["unit"],
      parts_missing: [],
      parts_not_in_frame: [],
      confidence: 0.4,
      evidence: "listed parts are visible",
      ...partial.completeness,
    },
    condition: {
      observed_state: "opened_unused",
      amazon_grade: "used_like_new",
      not_observable: false,
      confidence: 0.2,
      evidence: "no visible wear",
      ...partial.condition,
    },
    uncertainty_reasons: partial.uncertainty_reasons ?? [],
  };
}

class ScriptedModel implements ReturnsModel {
  readonly name = "scripted";
  calls = 0;
  constructor(private behavior: "grade" | "throw" | "bad" = "grade", private payload = grade()) {}
  async infer() {
    this.calls += 1;
    if (this.behavior === "throw") throw new Error("timeout");
    if (this.behavior === "bad") return { grade: { no: true } as unknown as ModelGrade, model_version: "scripted", latency_ms: 3 };
    return { grade: this.payload, model_version: "scripted", latency_ms: 4 };
  }
}

async function photo(kind: "sharp" | "flat" | "tiny"): Promise<CaptureInput["photos"][number]> {
  if (kind === "tiny") {
    const bytes = await sharp({ create: { width: 40, height: 40, channels: 3, background: "#888" } }).jpeg().toBuffer();
    return { filename: "tiny.jpg", media_type: "image/jpeg", bytes };
  }
  if (kind === "flat") {
    const bytes = await sharp({ create: { width: 800, height: 800, channels: 3, background: "#777" } }).jpeg().toBuffer();
    return { filename: "flat.jpg", media_type: "image/jpeg", bytes };
  }
  const raw = Buffer.alloc(800 * 800);
  for (let i = 0; i < raw.length; i++) raw[i] = (i * 17) % 255;
  const bytes = await sharp(raw, { raw: { width: 800, height: 800, channels: 1 } }).jpeg().toBuffer();
  return { filename: "noise.jpg", media_type: "image/jpeg", bytes };
}

function capture(photos: CaptureInput["photos"]): CaptureInput {
  return {
    organization_id: "org_demo_alpha",
    client_id: "seller-a",
    unit_id: "UNIT-1",
    order_id: "ORD-1",
    ordered_sku: "SKU-1",
    ordered_asin: "B0TEST",
    product_name: "Test lamp",
    parts_list: ["lamp", "cable"],
    operator_label: "op",
    photos,
  };
}

describe("policy_v1", () => {
  it("restocks a matching, complete, like-new return even when confidence is low", () => {
    const decision = applyPolicy(grade());
    expect(decision.disposition).toBe("restock");
    expect(decision.checks.identity).toBe("PASS");
  });

  it("does not treat an unobservable identity as a pass", () => {
    const decision = applyPolicy(grade({ identity: { matches_ordered: null, not_observable: true, readable_identifier: null, confused_with_sku: null, confidence: 0.99, evidence: "no mark" } }));
    expect(decision.checks.identity).toBe("UNCERTAIN");
    expect(decision.disposition).toBe("pending_review");
  });

  it("holds a visible mismatch for a person", () => {
    expect(applyPolicy(grade({ identity: { matches_ordered: false, not_observable: false, readable_identifier: "TIMEX", confused_with_sku: "CASIO", confidence: 0.9, evidence: "timex" } })).disposition).toBe("pending_review");
  });

  it("marks a part that is not in frame as uncertain, and a visible miss as fail", () => {
    expect(applyPolicy(grade({ completeness: { parts_seen: ["lamp"], parts_missing: [], parts_not_in_frame: ["cable"], confidence: 0.8, evidence: "cable not shown" } })).checks.completeness).toBe("UNCERTAIN");
    expect(applyPolicy(grade({ completeness: { parts_seen: ["lamp"], parts_missing: ["cable"], parts_not_in_frame: [], confidence: 0.8, evidence: "empty slot" } })).disposition).toBe("refurbish");
  });

  it("never emits dispose", () => {
    const grades = [
      grade(),
      grade({ condition: { observed_state: "damaged", amazon_grade: "used_acceptable", not_observable: false, confidence: 1, evidence: "dents" } }),
      grade({ completeness: { parts_seen: [], parts_missing: ["lamp"], parts_not_in_frame: [], confidence: 1, evidence: "gone" }, condition: { observed_state: "damaged", amazon_grade: "used_acceptable", not_observable: false, confidence: 1, evidence: "dents" } }),
    ];
    expect(grades.map((item) => applyPolicy(item).disposition)).not.toContain("dispose");
  });
});

describe("processReturn", () => {
  it("calls the model once and saves a graded record", async () => {
    const model = new ScriptedModel();
    const shot = await photo("sharp");
    const record = await processReturn(capture([shot]), model);
    expect(model.calls).toBe(1);
    expect(record.inference_call_count).toBe(1);
    expect(record.outcome.disposition).toBe("restock");
    expect(record.content_hash).toHaveLength(64);
  });

  it("does not call the model for an unusable frame and still returns a record", async () => {
    const model = new ScriptedModel();
    const record = await processReturn(capture([await photo("flat")]), model);
    expect(model.calls).toBe(0);
    expect(record.status).toBe("pending_review");
    expect(record.failure).toBe("unusable_image");
    expect(record.checks.every((check) => check.verdict === "UNCERTAIN")).toBe(true);
  });

  it("keeps the capture when the model throws or returns junk", async () => {
    const thrown = await processReturn(capture([await photo("sharp")]), new ScriptedModel("throw"));
    expect(thrown.failure).toMatch(/model_failure/);
    expect(thrown.outcome.disposition).toBe("pending_review");
    const bad = await processReturn(capture([await photo("sharp")]), new ScriptedModel("bad"));
    expect(bad.failure).toMatch(/schema_invalid/);
    expect(bad.inference_call_count).toBe(1);
  });
});

describe("quality and tenancy", () => {
  it("rejects a flat frame and accepts a varied frame", async () => {
    expect((await assessPhoto((await photo("flat")).bytes)).quality).toBe("unusable");
    expect((await assessPhoto((await photo("sharp")).bytes)).quality).toBe("usable");
  });

  it("keeps alpha records and images away from bravo", async () => {
    const store = new MemoryStore();
    const model = new ScriptedModel();
    const app = buildApp({ store, model });
    const login = await app.inject({ method: "POST", url: "/session", payload: { organization_id: "org_demo_alpha" } });
    const cookie = login.headers["set-cookie"] as string;
    const shot = (await photo("sharp")).bytes.toString("base64");
    const created = await app.inject({
      method: "POST",
      url: "/agent",
      headers: { cookie },
      payload: {
        unit_id: "UNIT-A",
        order_id: "ORD-A",
        ordered_sku: "SKU-A",
        ordered_asin: "B0A",
        product_name: "Alpha lamp",
        parts_list: ["lamp"],
        photos: [{ media_type: "image/jpeg", data_base64: shot }],
      },
    });
    const record = created.json();
    const bravoLogin = await app.inject({ method: "POST", url: "/session", payload: { organization_id: "org_demo_bravo" } });
    const bravo = bravoLogin.headers["set-cookie"] as string;
    const list = await app.inject({ method: "GET", url: "/records", headers: { cookie: bravo } });
    expect(list.json()).toEqual([]);
    const hidden = await app.inject({ method: "GET", url: `/records/${record.record_id}`, headers: { cookie: bravo } });
    expect(hidden.statusCode).toBe(404);
    const image = await app.inject({ method: "GET", url: `/images/${record.images[0].key}`, headers: { cookie: bravo } });
    expect(image.statusCode).toBe(404);
    const own = await app.inject({ method: "GET", url: `/images/${record.images[0].key}`, headers: { cookie } });
    expect(own.statusCode).toBe(200);

    const overridden = await app.inject({
      method: "POST",
      url: `/records/${record.record_id}/override`,
      headers: { cookie },
      payload: { revised_disposition: "liquidate", reason_code: "condition_wrong", reason: "scratch on the base" },
    });
    expect(overridden.json().overrides).toHaveLength(1);
    expect(overridden.json().overrides[0].original_disposition).toBe("restock");
    expect(overridden.json().content_hash).not.toBe(record.content_hash);
    await app.close();
  });
});
