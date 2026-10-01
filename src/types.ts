import { AmazonGrade, ObservedState } from "./rules/amazonCondition";

export const DEMO_ORGS = ["org_demo_alpha", "org_demo_bravo"] as const;
export type DemoOrg = (typeof DEMO_ORGS)[number];

export type Verdict = "PASS" | "FAIL" | "UNCERTAIN";
export type Disposition = "restock" | "refurbish" | "liquidate" | "dispose" | "pending_review";
export type RecordStatus = "graded" | "pending_review";

export interface Lookalike {
  sku: string;
  asin: string;
  product_name: string;
}

export interface PhotoInput {
  filename: string;
  media_type: string;
  bytes: Buffer;
}

export interface CaptureInput {
  organization_id: string;
  client_id: string;
  unit_id: string;
  order_id: string;
  ordered_sku: string;
  ordered_asin: string;
  product_name: string;
  parts_list: string[];
  operator_label: string;
  photos: PhotoInput[];
  lookalikes?: Lookalike[];
  return_destination?: "seller" | "channel_warehouse" | "unknown";
}

export interface ModelGrade {
  identity: {
    matches_ordered: boolean | null;
    not_observable: boolean;
    readable_identifier: string | null;
    confused_with_sku: string | null;
    confidence: number | null;
    evidence: string;
  };
  completeness: {
    parts_seen: string[];
    parts_missing: string[];
    parts_not_in_frame: string[];
    confidence: number | null;
    evidence: string;
  };
  condition: {
    observed_state: ObservedState;
    amazon_grade: AmazonGrade;
    not_observable: boolean;
    confidence: number | null;
    evidence: string;
  };
  uncertainty_reasons: string[];
}

export interface CheckResult {
  check_key: "identity" | "completeness" | "condition";
  verdict: Verdict;
  confidence: number | null;
  detail: string;
  model_version: string | null;
  latency_ms: number | null;
}

export interface OverrideEntry {
  original_disposition: Disposition;
  revised_disposition: Disposition;
  reason_code: string;
  reason: string;
  operator_label: string;
  at: string;
}

export interface ImageRef {
  key: string;
  quality: "usable" | "unusable";
  reasons: string[];
  content_type: string;
}

export interface EvidenceRecord {
  record_id: string;
  schema_version: "rtn-0.1-provisional";
  organization_id: string;
  client_id: string;
  agent: { name: "returns_manager"; version: string };
  subject: {
    unit_id: string;
    order_id: string;
    ordered_sku: string;
    ordered_asin: string;
    product_name: string;
  };
  captured_at: string;
  operator_label: string;
  images: ImageRef[];
  checks: CheckResult[];
  returns: {
    parts_list: string[];
    parts_seen: string[];
    parts_missing: string[];
    parts_not_in_frame: string[];
    observed_state: ObservedState | "uncertain";
    amazon_condition: AmazonGrade;
    amazon_condition_rule_source: string;
    return_destination: "seller" | "channel_warehouse" | "unknown";
    received_at: string;
    lookalikes_considered: Lookalike[];
  };
  outcome: {
    disposition: Disposition;
    policy_version: "policy_v1";
    rationale: string;
  };
  overrides: OverrideEntry[];
  status: RecordStatus;
  model_version: string | null;
  inference_call_count: number;
  failure: string | null;
  content_hash: string;
}
