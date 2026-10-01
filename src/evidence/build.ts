import { createHash, randomBytes } from "crypto";
import { AMAZON_CONDITION_SOURCE } from "../rules/amazonCondition";
import {
  CaptureInput,
  CheckResult,
  Disposition,
  EvidenceRecord,
  ImageRef,
  ModelGrade,
} from "../types";

export const AGENT_VERSION = "0.1.0";

export function newRecordId(): string {
  return `RTN-${randomBytes(6).toString("hex")}`;
}

export function newImageKey(organizationId: string): string {
  return `${organizationId}/${randomBytes(16).toString("hex")}`;
}

export function contentHash(record: Omit<EvidenceRecord, "content_hash">): string {
  return createHash("sha256").update(canonical(record)).digest("hex");
}

function canonical(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return Object.fromEntries(entries.map(([k, v]) => [k, sortValue(v)]));
  }
  return value;
}

export function buildRecord(args: {
  input: CaptureInput;
  images: ImageRef[];
  checks: CheckResult[];
  disposition: Disposition;
  rationale: string;
  grade: ModelGrade | null;
  modelVersion: string | null;
  inferenceCallCount: number;
  failure: string | null;
  status: EvidenceRecord["status"];
  capturedAt?: string;
  recordId?: string;
}): EvidenceRecord {
  const capturedAt = args.capturedAt ?? new Date().toISOString();
  const grade = args.grade;
  const withoutHash = {
    record_id: args.recordId ?? newRecordId(),
    schema_version: "rtn-0.1-provisional" as const,
    organization_id: args.input.organization_id,
    client_id: args.input.client_id,
    agent: { name: "returns_manager" as const, version: AGENT_VERSION },
    subject: {
      unit_id: args.input.unit_id,
      order_id: args.input.order_id,
      ordered_sku: args.input.ordered_sku,
      ordered_asin: args.input.ordered_asin,
      product_name: args.input.product_name,
    },
    captured_at: capturedAt,
    operator_label: args.input.operator_label,
    images: args.images,
    checks: args.checks,
    returns: {
      parts_list: args.input.parts_list,
      parts_seen: grade?.completeness.parts_seen ?? [],
      parts_missing: grade?.completeness.parts_missing ?? [],
      parts_not_in_frame: grade?.completeness.parts_not_in_frame ?? [],
      observed_state: grade?.condition.observed_state ?? "uncertain",
      amazon_condition: grade?.condition.amazon_grade ?? "unknown",
      amazon_condition_rule_source: AMAZON_CONDITION_SOURCE,
      return_destination: args.input.return_destination ?? "unknown",
      received_at: capturedAt,
      lookalikes_considered: args.input.lookalikes ?? [],
    },
    outcome: {
      disposition: args.disposition,
      policy_version: "policy_v1" as const,
      rationale: args.rationale,
    },
    overrides: [],
    status: args.status,
    model_version: args.modelVersion,
    inference_call_count: args.inferenceCallCount,
    failure: args.failure,
  };
  return { ...withoutHash, content_hash: contentHash(withoutHash) };
}
