import { createHash } from "crypto";
import { EvidenceRecord, Verdict } from "../types";

const CHECK_MAP = {
  identity: "identity_match",
  completeness: "completeness",
  condition: "condition",
} as const;

export type Round3AgentInput = {
  schema_version?: string;
  request_id: string;
  workflow_id: string;
  stage: "returns";
  subject: {
    org_id: string;
    subject_id: string;
    route?: "fba" | "mfn" | "unknown";
  };
  inputs?: { ref: string; kind?: string; sha256?: string | null; data_base64?: string; media_type?: string }[];
  previous_evidence?: { record_id: string; stage?: string }[];
  context?: Record<string, unknown> & {
    product_name?: string;
    ordered_sku?: string;
    ordered_asin?: string;
    order_id?: string;
    parts_list?: string[];
    operator_id?: string;
    client_id?: string;
    captured_at?: string;
    return_destination?: "seller" | "channel_warehouse" | "unknown";
  };
};

/** Map a stored Returns record into Round 3 Agent Output + Evidence Record v1.0. */
export function toRound3AgentOutput(
  record: EvidenceRecord,
  input: Pick<Round3AgentInput, "request_id" | "workflow_id" | "previous_evidence" | "inputs">,
  opts: { agentId?: string; imageSha256?: Record<string, string | null> } = {}
) {
  const agentId = opts.agentId ?? "returns-manager@0.1.0";
  const upstream = (input.previous_evidence ?? []).map((row) => row.record_id).filter(Boolean);
  const checks = record.checks.map((check) => {
    const verdict = check.verdict as Verdict;
    const row: Record<string, unknown> = {
      check_key: CHECK_MAP[check.check_key],
      verdict,
      confidence: check.confidence,
      detail: check.detail,
      evidence_refs: (record.images || []).map((image) => image.key),
      expected: check.check_key === "identity" ? record.subject.product_name : undefined,
      observed:
        check.check_key === "completeness"
          ? {
              seen: record.returns.parts_seen,
              missing: record.returns.parts_missing,
              not_in_frame: record.returns.parts_not_in_frame,
            }
          : check.check_key === "condition"
            ? { amazon_condition: record.returns.amazon_condition, observed_state: record.returns.observed_state }
            : { matches: verdict === "PASS" },
    };
    if (verdict === "UNCERTAIN") {
      row.uncertain_reason =
        check.check_key === "completeness"
          ? "insufficient_evidence"
          : record.failure
            ? "model_error"
            : "other";
    }
    return row;
  });

  const decisionVerdict = rollup(checks.map((c) => c.verdict as Verdict));
  const status =
    record.status === "pending_review" || record.failure
      ? record.failure
        ? "error"
        : "pending"
      : "completed";

  const inputs = (record.images || []).map((image) => ({
    ref: image.key,
    sha256: opts.imageSha256?.[image.key] ?? null,
    kind: "image" as const,
  }));

  const evidenceBase = {
    schema_version: "1.0",
    record_id: stableRecordId(input.request_id, record.record_id),
    workflow_id: input.workflow_id,
    stage: "returns" as const,
    agent_id: agentId,
    subject: {
      org_id: record.organization_id,
      subject_id: record.subject.unit_id,
      unit_id: record.subject.unit_id,
      unit_scope: "unit" as const,
      refs: {
        order_id: record.subject.order_id,
        sku: empty(record.subject.ordered_sku),
        asin: empty(record.subject.ordered_asin),
        product_name: record.subject.product_name,
      },
    },
    client_id: record.client_id,
    status,
    captured_at: record.captured_at,
    produced_at: new Date().toISOString(),
    latency_ms: maxLatency(record),
    operator_id: record.operator_label,
    model: {
      name: record.model_version ? "claude" : record.failure ? "none" : "rules",
      version: record.model_version || "policy_v1",
      provider: record.model_version ? "anthropic" : null,
      prompt_version: "returns-v1",
      calls: record.inference_call_count,
      cost_usd: null,
    },
    inputs,
    checks,
    decision: {
      verdict: status === "completed" ? decisionVerdict : ("UNCERTAIN" as Verdict),
      outcome: record.outcome.disposition,
      confidence: null,
      reason: record.outcome.rationale,
      needs_human: record.outcome.disposition === "pending_review" || decisionVerdict === "UNCERTAIN",
    },
    payload: {
      amazon_condition: record.returns.amazon_condition,
      observed_state: record.returns.observed_state,
      parts_missing: record.returns.parts_missing,
      parts_seen: record.returns.parts_seen,
      parts_not_in_frame: record.returns.parts_not_in_frame,
      policy_version: record.outcome.policy_version,
      return_destination: record.returns.return_destination,
      rule_source: record.returns.amazon_condition_rule_source,
      condition_graded: !record.failure,
      schema_internal: record.schema_version,
    },
    upstream_refs: upstream,
    overrides: record.overrides.map((entry) => ({
      overridden_at: entry.at,
      overridden_by: entry.operator_label,
      target: "decision",
      original_verdict: "UNCERTAIN" as Verdict,
      new_verdict: "UNCERTAIN" as Verdict,
      reason: `${entry.original_disposition} → ${entry.revised_disposition}: ${entry.reason}`,
    })),
    error: record.failure
      ? { code: "model_or_capture_failure", message: record.failure, retryable: true }
      : null,
  };

  const content_hash = contentHash(evidenceBase);
  const evidence = { ...evidenceBase, content_hash };

  return {
    schema_version: "1.0",
    workflow_id: input.workflow_id,
    stage: "returns" as const,
    agent_id: agentId,
    status,
    verdict: evidence.decision.verdict,
    confidence: evidence.decision.confidence,
    timestamp: evidence.produced_at,
    model: evidence.model,
    error: evidence.error,
    next_step_recommendation: {
      action: evidence.decision.needs_human ? "review" : "continue",
      reason: evidence.decision.reason,
    },
    evidence,
  };
}

export function pendingRound3Output(
  input: Round3AgentInput,
  message: string,
  opts: { agentId?: string; retryable?: boolean } = {}
) {
  const agentId = opts.agentId ?? "returns-manager@0.1.0";
  const produced_at = new Date().toISOString();
  const evidenceBase = {
    schema_version: "1.0",
    record_id: stableRecordId(input.request_id, `RTN-${input.subject.subject_id}`),
    workflow_id: input.workflow_id,
    stage: "returns" as const,
    agent_id: agentId,
    subject: {
      org_id: input.subject.org_id,
      subject_id: input.subject.subject_id,
      unit_id: input.subject.subject_id,
      unit_scope: "unit" as const,
      refs: {},
    },
    client_id: input.context?.client_id ?? null,
    status: "pending" as const,
    captured_at: input.context?.captured_at ?? produced_at,
    produced_at,
    latency_ms: null,
    operator_id: input.context?.operator_id ?? null,
    model: { name: "none", version: "0", provider: null, prompt_version: null, calls: 0, cost_usd: null },
    inputs: (input.inputs ?? []).map((row) => ({
      ref: row.ref,
      sha256: row.sha256 ?? null,
      kind: (row.kind as "image") || "image",
    })),
    checks: [] as unknown[],
    decision: {
      verdict: "UNCERTAIN" as Verdict,
      outcome: "pending_review",
      confidence: null,
      reason: message,
      needs_human: true,
    },
    payload: { fail_open: true },
    upstream_refs: (input.previous_evidence ?? []).map((row) => row.record_id),
    overrides: [] as unknown[],
    error: { code: "pending", message, retryable: opts.retryable ?? true },
  };
  const content_hash = contentHash(evidenceBase);
  const evidence = { ...evidenceBase, content_hash };
  return {
    schema_version: "1.0",
    workflow_id: input.workflow_id,
    stage: "returns" as const,
    agent_id: agentId,
    status: "pending" as const,
    verdict: "UNCERTAIN" as Verdict,
    confidence: null,
    timestamp: produced_at,
    model: evidence.model,
    error: evidence.error,
    next_step_recommendation: { action: "review" as const, reason: message },
    evidence,
  };
}

function rollup(verdicts: Verdict[]): Verdict {
  if (verdicts.some((v) => v === "FAIL")) return "FAIL";
  if (!verdicts.length || verdicts.some((v) => v === "UNCERTAIN")) return "UNCERTAIN";
  return "PASS";
}

function maxLatency(record: EvidenceRecord): number | null {
  const values = record.checks.map((c) => c.latency_ms).filter((v): v is number => v != null);
  return values.length ? Math.max(...values) : null;
}

function empty(value: string): string | null {
  const cleaned = value.trim();
  if (!cleaned || cleaned.toUpperCase() === "UNKNOWN") return null;
  return cleaned;
}

function stableRecordId(requestId: string, fallback: string): string {
  const digest = createHash("sha256").update(requestId).digest("hex").slice(0, 12);
  if (fallback.startsWith("RTN-")) return fallback;
  return `RTN-${digest}`;
}

function contentHash(record: Record<string, unknown>): string {
  const { content_hash: _drop, overrides: _o, ...rest } = record as {
    content_hash?: string;
    overrides?: unknown;
  } & Record<string, unknown>;
  void _drop;
  void _o;
  return createHash("sha256").update(canonical(rest)).digest("hex");
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`).join(",")}}`;
}
