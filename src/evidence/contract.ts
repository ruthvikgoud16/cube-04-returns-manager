import { createHash } from "crypto";
import { EvidenceRecord } from "../types";

const VERDICT = { PASS: "pass", FAIL: "fail", UNCERTAIN: "uncertain" } as const;

/** Recovery's fixed 1.1 view of a returns record. The stored record stays rtn-0.1-provisional. */
export function toContractRecord(
  record: EvidenceRecord,
  images: { key: string; sha256: string | null; bytes: number; taken_at: string }[] = []
) {
  const checks = record.checks.map((check) => ({
    check_key: check.check_key,
    verdict: VERDICT[check.verdict],
    confidence: check.confidence,
    detail: {
      text: check.detail,
      disposition: record.outcome.disposition,
      policy_version: record.outcome.policy_version,
      rationale: record.outcome.rationale,
      amazon_condition: record.returns.amazon_condition,
      parts_seen: record.returns.parts_seen,
      parts_missing: record.returns.parts_missing,
      parts_not_in_frame: record.returns.parts_not_in_frame,
    },
    model_version: check.model_version ?? "",
    latency_ms: check.latency_ms ?? 0,
  }));
  const imageRows = (images.length ? images : record.images.map((image) => ({
    key: image.key,
    sha256: null,
    bytes: 0,
    taken_at: record.captured_at,
  }))).map((image) => ({
    key: image.key,
    sha256: image.sha256,
    bytes: image.bytes,
    taken_at: image.taken_at,
  }));
  const hashes = imageRows.map((image) => image.sha256 ?? "").join("");
  const content_hash = createHash("sha256").update(hashes + JSON.stringify(checks)).digest("hex");
  return {
    record_id: record.record_id,
    schema_version: "1.1",
    organization_id: record.organization_id,
    client_id: record.client_id,
    agent: "returns",
    subject: {
      type: "unit",
      asin: empty(record.subject.ordered_asin),
      sku: empty(record.subject.ordered_sku),
      order_id: record.subject.order_id,
      po_line_id: record.subject.unit_id,
      shipment_id: null,
      quantity_expected: 1,
      quantity_observed: 1,
    },
    captured_at: record.captured_at,
    operator_label: record.operator_label,
    images: imageRows,
    checks,
    outcome: {
      decision: record.outcome.disposition,
      decided_by: record.overrides.length ? "operator" : "agent",
      decided_at: record.overrides.at(-1)?.at ?? record.captured_at,
    },
    overrides: record.overrides.map((entry) => ({
      check_key: "disposition",
      from_verdict: entry.original_disposition,
      to_verdict: entry.revised_disposition,
      reason: entry.reason,
      by: entry.operator_label,
      at: entry.at,
    })),
    status: record.status === "pending_review" ? "pending" : "complete",
    content_hash,
  };
}

function empty(value: string): string | null {
  const cleaned = value.trim();
  if (!cleaned || cleaned.toUpperCase() === "UNKNOWN") return null;
  return cleaned;
}
