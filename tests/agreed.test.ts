import { agreedLabels, scoreAgreed } from "../eval/agreed";
import { buildRecord } from "../src/evidence/build";
import { toContractRecord } from "../src/evidence/contract";
import { CaptureInput } from "../src/types";

describe("agreed labels", () => {
  it("keeps a case only when two people match and counts a false positive", () => {
    const labels = agreedLabels([
      { case_id: "RTN-001", labeler: "Rishik Goud", identity: "PASS", completeness: "PASS", amazon_condition: "used_very_good" },
      { case_id: "RTN-001", labeler: "Lasya", identity: "PASS", completeness: "PASS", amazon_condition: "used_very_good" },
      { case_id: "RTN-002", labeler: "Rishik Goud", identity: "PASS", completeness: "UNCERTAIN", amazon_condition: "used_very_good" },
      { case_id: "RTN-002", labeler: "Lasya", identity: "UNCERTAIN", completeness: "PASS", amazon_condition: "used_very_good" },
    ]);
    expect([...labels.keys()]).toEqual(["RTN-001"]);
    const scores = scoreAgreed(labels, [{
      case_id: "RTN-001",
      identity: "PASS",
      completeness: "FAIL",
      condition: "PASS",
      amazon_grade: "used_very_good",
    }]);
    expect(scores.identity.matched).toBe(1);
    expect(scores.completeness.false_negatives).toBe(1);
    expect(scores.condition.matched).toBe(1);
  });
});

describe("contract 1.1 projection", () => {
  it("keeps returns facts inside check detail and does not invent an asin", () => {
    const input: CaptureInput = {
      organization_id: "org_demo_alpha",
      client_id: "c",
      unit_id: "UNIT-001",
      order_id: "ORD-001",
      ordered_sku: "UNKNOWN",
      ordered_asin: "UNKNOWN",
      product_name: "Samsung Book",
      parts_list: ["Samsung Book"],
      operator_label: "op",
      photos: [],
    };
    const record = buildRecord({
      input,
      images: [],
      checks: [{ check_key: "identity", verdict: "UNCERTAIN", confidence: null, detail: "no likeness", model_version: null, latency_ms: null }],
      disposition: "pending_review",
      rationale: "identity uncertain",
      grade: null,
      modelVersion: null,
      inferenceCallCount: 1,
      failure: null,
      status: "pending_review",
    });
    const projected = toContractRecord(record);
    expect(projected.schema_version).toBe("1.1");
    expect(projected.agent).toBe("returns");
    expect(projected.subject.asin).toBeNull();
    expect(projected.subject.sku).toBeNull();
    expect(projected.checks[0].verdict).toBe("uncertain");
    expect(projected.checks[0].detail.rationale).toBe("identity uncertain");
    expect(projected.status).toBe("pending");
    expect(projected.content_hash).toHaveLength(64);
  });
});
