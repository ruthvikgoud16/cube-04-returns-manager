import { toRound3AgentOutput, pendingRound3Output } from "../src/evidence/round3";
import { EvidenceRecord } from "../src/types";

function sampleRecord(partial: Partial<EvidenceRecord> = {}): EvidenceRecord {
  return {
    record_id: "RTN-TEST-1",
    schema_version: "rtn-0.1-provisional",
    organization_id: "org_demo_alpha",
    client_id: "demo",
    agent: { name: "returns_manager", version: "0.1.0" },
    subject: {
      unit_id: "UNIT-0014",
      order_id: "ORD-1",
      ordered_sku: "SKU-1",
      ordered_asin: "B0TEST",
      product_name: "Test product",
    },
    captured_at: "2026-10-01T00:00:00Z",
    operator_label: "desk",
    images: [{ key: "org_demo_alpha/a.jpg", quality: "usable", reasons: [], content_type: "image/jpeg" }],
    checks: [
      { check_key: "identity", verdict: "PASS", confidence: 0.9, detail: "match", model_version: "claude", latency_ms: 10 },
      { check_key: "completeness", verdict: "PASS", confidence: 0.8, detail: "parts", model_version: "claude", latency_ms: 10 },
      { check_key: "condition", verdict: "PASS", confidence: 0.7, detail: "very good", model_version: "claude", latency_ms: 10 },
    ],
    returns: {
      parts_list: ["unit"],
      parts_seen: ["unit"],
      parts_missing: [],
      parts_not_in_frame: [],
      observed_state: "signs_of_use",
      amazon_condition: "used_very_good",
      amazon_condition_rule_source: "https://www.amazon.com/gp/help/customer/display.html?nodeId=201889720",
      return_destination: "unknown",
      received_at: "2026-10-01T00:00:00Z",
      lookalikes_considered: [],
    },
    outcome: { disposition: "restock", policy_version: "policy_v1", rationale: "complete very good" },
    overrides: [],
    status: "graded",
    model_version: "claude-sonnet-4-5",
    inference_call_count: 1,
    failure: null,
    content_hash: "abc",
    ...partial,
  };
}

describe("round3 adapter", () => {
  it("maps checks to Round 3 keys and builds content_hash", () => {
    const out = toRound3AgentOutput(sampleRecord(), {
      request_id: "req-1",
      workflow_id: "WF-org_demo_alpha-UNIT-0014",
      previous_evidence: [{ record_id: "RCV-0014" }],
    });
    expect(out.stage).toBe("returns");
    expect(out.status).toBe("completed");
    expect(out.verdict).toBe("PASS");
    expect(out.evidence.checks.map((c) => String(c.check_key))).toEqual([
      "identity_match",
      "completeness",
      "condition",
    ]);
    expect(out.evidence.upstream_refs).toEqual(["RCV-0014"]);
    expect(out.evidence.content_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(out.evidence.decision.outcome).toBe("restock");
  });

  it("fail-open pending output stays UNCERTAIN", () => {
    const out = pendingRound3Output(
      {
        request_id: "req-2",
        workflow_id: "WF-x",
        stage: "returns",
        subject: { org_id: "org_demo_alpha", subject_id: "UNIT-9" },
        previous_evidence: [],
      },
      "timeout"
    );
    expect(out.status).toBe("pending");
    expect(out.verdict).toBe("UNCERTAIN");
    expect(out.evidence.decision.outcome).toBe("pending_review");
    expect(out.evidence.checks).toEqual([]);
  });
});
