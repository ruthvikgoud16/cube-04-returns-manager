import { AmazonGrade } from "../rules/amazonCondition";
import { CheckResult, Disposition, ModelGrade, Verdict } from "../types";

export const POLICY_VERSION = "policy_v1" as const;

export interface PolicyDecision {
  disposition: Disposition;
  rationale: string;
  policy_version: typeof POLICY_VERSION;
  checks: {
    identity: Verdict;
    completeness: Verdict;
    condition: Verdict;
  };
}

/**
 * policy_v1 is this build's seller ruleset, not an Amazon rule.
 * dispose is intentionally unreachable. A destroyed unit stays pending_review
 * until a person chooses dispose.
 * Confidence numbers are stored on the checks and never promote UNCERTAIN to PASS.
 */
export function verdictsFromGrade(grade: ModelGrade): PolicyDecision["checks"] {
  const identity: Verdict = grade.identity.not_observable || grade.identity.matches_ordered === null
    ? "UNCERTAIN"
    : grade.identity.matches_ordered
      ? "PASS"
      : "FAIL";

  let completeness: Verdict;
  if (grade.completeness.parts_missing.length > 0) {
    completeness = "FAIL";
  } else if (grade.completeness.parts_not_in_frame.length > 0) {
    completeness = "UNCERTAIN";
  } else {
    completeness = "PASS";
  }

  const condition: Verdict =
    grade.condition.not_observable || grade.condition.amazon_grade === "unknown"
      ? "UNCERTAIN"
      : "PASS";

  return { identity, completeness, condition };
}

export function applyPolicy(grade: ModelGrade): PolicyDecision {
  const checks = verdictsFromGrade(grade);
  if (checks.identity === "UNCERTAIN" || checks.completeness === "UNCERTAIN" || checks.condition === "UNCERTAIN") {
    return {
      checks,
      disposition: "pending_review",
      policy_version: POLICY_VERSION,
      rationale: "At least one check is UNCERTAIN. The operator decides. UNCERTAIN is not a pass.",
    };
  }
  if (checks.identity === "FAIL") {
    return {
      checks,
      disposition: "pending_review",
      policy_version: POLICY_VERSION,
      rationale: "The observed item does not match the ordered product. A person decides what to do with it.",
    };
  }

  const gradeName = grade.condition.amazon_grade as AmazonGrade;
  const missing = checks.completeness === "FAIL";

  if (!missing && (gradeName === "used_like_new" || gradeName === "used_very_good")) {
    return {
      checks,
      disposition: "restock",
      policy_version: POLICY_VERSION,
      rationale: "Identity matches, required parts are visible, and the visual grade is Like New or Very Good.",
    };
  }
  if (!missing && gradeName === "used_good") {
    return {
      checks,
      disposition: "refurbish",
      policy_version: POLICY_VERSION,
      rationale: "Visual grade is Used - Good. policy_v1 does not restock Good without a person.",
    };
  }
  if (!missing && gradeName === "used_acceptable") {
    return {
      checks,
      disposition: "liquidate",
      policy_version: POLICY_VERSION,
      rationale: "Visual grade is Used - Acceptable. policy_v1 liquidates rather than restocking.",
    };
  }
  if (missing && (gradeName === "used_like_new" || gradeName === "used_very_good")) {
    return {
      checks,
      disposition: "refurbish",
      policy_version: POLICY_VERSION,
      rationale: "A required part is visibly missing. Condition is otherwise strong enough to refurbish.",
    };
  }
  return {
    checks,
    disposition: "liquidate",
    policy_version: POLICY_VERSION,
    rationale: "A required part is visibly missing and the visual grade is Good or Acceptable.",
  };
}

export function checksFromVerdicts(
  checks: PolicyDecision["checks"],
  grade: ModelGrade | null,
  modelVersion: string | null,
  latencyMs: number | null,
  failureDetail?: string
): CheckResult[] {
  const detail = (key: "identity" | "completeness" | "condition", fallback: string) =>
    failureDetail ?? grade?.[key].evidence ?? fallback;
  return [
    {
      check_key: "identity",
      verdict: checks.identity,
      confidence: grade?.identity.confidence ?? null,
      detail: detail("identity", "No model grade"),
      model_version: modelVersion,
      latency_ms: latencyMs,
    },
    {
      check_key: "completeness",
      verdict: checks.completeness,
      confidence: grade?.completeness.confidence ?? null,
      detail: detail("completeness", "No model grade"),
      model_version: modelVersion,
      latency_ms: latencyMs,
    },
    {
      check_key: "condition",
      verdict: checks.condition,
      confidence: grade?.condition.confidence ?? null,
      detail: detail("condition", "No model grade"),
      model_version: modelVersion,
      latency_ms: latencyMs,
    },
  ];
}
