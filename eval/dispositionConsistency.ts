/**
 * Reads the frozen labels and frozen grades only.
 * Calls the existing applyPolicy. Does not call the model and does not write the freeze.
 */
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { parseCsv } from "../collection/csv";
import { applyPolicy } from "../src/policy/policy";
import { AmazonGrade } from "../src/rules/amazonCondition";
import { ModelGrade } from "../src/types";
import { agreedLabels, LabelRow } from "./agreed";

const FREEZE = path.join(__dirname, "frozen", "2026-10-01T1015Z");
const NO_PHOTO = new Set(["RTN-017", "RTN-026", "RTN-032"]);

interface SavedGrade {
  case_id: string;
  state?: string;
  calls?: number;
  disposition?: string;
  identity?: string;
  completeness?: string;
  condition?: string;
  amazon_grade?: string;
}

function blankGrade(identity: string, completeness: string, amazon: string, conditionUncertain: boolean): ModelGrade {
  const amazonGrade = (amazon || "unknown") as AmazonGrade;
  return {
    identity: {
      matches_ordered: identity === "UNCERTAIN" ? null : identity === "PASS",
      not_observable: identity === "UNCERTAIN",
      readable_identifier: null,
      confused_with_sku: null,
      confidence: null,
      evidence: "policy input reconstructed from a saved verdict",
    },
    completeness: {
      parts_seen: [],
      parts_missing: completeness === "FAIL" ? ["required part recorded as missing"] : [],
      parts_not_in_frame: completeness === "UNCERTAIN" ? ["required part recorded as not in frame"] : [],
      confidence: null,
      evidence: "policy input reconstructed from a saved verdict",
    },
    condition: {
      observed_state: "uncertain",
      amazon_grade: amazonGrade,
      not_observable: conditionUncertain || amazonGrade === "unknown",
      confidence: null,
      evidence: "policy input reconstructed from a saved verdict",
    },
    uncertainty_reasons: [],
  };
}

function norm(identity: string, completeness: string, amazon: string): string {
  return [identity, completeness, amazon].join("|");
}

function main() {
  const labels = parseCsv(readFileSync(path.join(FREEZE, "labels.csv"), "utf8")).map((row): LabelRow => ({
    case_id: row.case_id,
    labeler: row.labeler,
    identity: row.identity,
    completeness: row.completeness,
    amazon_condition: row.amazon_condition,
  }));
  const agreed = agreedLabels(labels);
  const products = (JSON.parse(readFileSync(path.join(FREEZE, "results.json"), "utf8")).products ?? []) as SavedGrade[];
  const byId = new Map(products.map((row) => [row.case_id, row]));

  const comparable = [...agreed.keys()]
    .filter((id) => !NO_PHOTO.has(id))
    .filter((id) => {
      const row = byId.get(id);
      return row?.state === "graded" && row.calls === 1 && row.identity && row.completeness && row.amazon_grade && row.disposition;
    })
    .sort();

  const cases = comparable.map((caseId) => {
    const human = agreed.get(caseId)!;
    const saved = byId.get(caseId)!;
    const humanDecision = applyPolicy(blankGrade(
      human.identity,
      human.completeness,
      human.amazon_condition,
      human.amazon_condition === "unknown"
    ));
    const agentDecision = applyPolicy(blankGrade(
      saved.identity || "",
      saved.completeness || "",
      saved.amazon_grade || "unknown",
      saved.condition === "UNCERTAIN"
    ));
    const humanInputs = norm(human.identity, human.completeness, human.amazon_condition);
    const agentInputs = norm(saved.identity || "", saved.completeness || "", saved.amazon_grade || "");
    const sameInputs = humanInputs === agentInputs && (saved.condition !== "UNCERTAIN" || human.amazon_condition === "unknown");
    const consistent = humanDecision.disposition === saved.disposition;
    const policyMatchesSaved = agentDecision.disposition === saved.disposition;
    let classification = "match";
    let explanation = "The disposition policy_v1 assigns from the agreed human checks is the disposition saved for the agent.";
    if (!consistent && sameInputs) {
      classification = "true_policy_mapping_inconsistency";
      explanation = "The agreed human checks and the saved agent checks normalize to the same policy input, but the saved disposition differs from policy_v1.";
    } else if (!consistent) {
      classification = "upstream_perception_mismatch";
      const diffs: string[] = [];
      if (human.identity !== saved.identity) diffs.push(`identity human ${human.identity} / agent ${saved.identity}`);
      if (human.completeness !== saved.completeness) diffs.push(`completeness human ${human.completeness} / agent ${saved.completeness}`);
      if (human.amazon_condition !== saved.amazon_grade) diffs.push(`amazon condition human ${human.amazon_condition} / agent ${saved.amazon_grade}`);
      if (saved.condition === "UNCERTAIN" && human.amazon_condition !== "unknown") diffs.push("agent condition verdict UNCERTAIN");
      explanation = `policy_v1 saw different check results. ${diffs.join("; ")}. Human-derived disposition ${humanDecision.disposition}. Saved agent disposition ${saved.disposition}.`;
    }
    if (!policyMatchesSaved) {
      classification = "true_policy_mapping_inconsistency";
      explanation = `policy_v1 applied to the saved agent checks returns ${agentDecision.disposition}, which is not the saved disposition ${saved.disposition}. ${explanation}`;
    }
    return {
      case_id: caseId,
      human_checks: {
        identity: human.identity,
        completeness: human.completeness,
        amazon_condition: human.amazon_condition,
      },
      human_derived_policy_disposition: humanDecision.disposition,
      agent_checks: {
        identity: saved.identity,
        completeness: saved.completeness,
        condition: saved.condition,
        amazon_grade: saved.amazon_grade,
      },
      policy_disposition_from_agent_checks: agentDecision.disposition,
      actual_agent_disposition: saved.disposition,
      consistent,
      policy_mapping_matches_saved_agent_checks: policyMatchesSaved,
      classification,
      mismatch_explanation: consistent ? null : explanation,
    };
  });

  const mismatches = cases.filter((row) => !row.consistent);
  const mappingBreaks = cases.filter((row) => !row.policy_mapping_matches_saved_agent_checks);
  const out = {
    statement: "This is a policy-consistency analysis, not an independently human-labeled disposition accuracy measurement.",
    policy_version: "policy_v1",
    sources: {
      labels: "eval/frozen/2026-10-01T1015Z/labels.csv",
      results: "eval/frozen/2026-10-01T1015Z/results.json",
    },
    excluded_disagreements: [...new Set(labels.map((row) => row.case_id))].filter((id) => !agreed.has(id)).sort(),
    excluded_no_model_output: ["RTN-017", "RTN-026", "RTN-032"],
    comparable_cases: cases.length,
    policy_consistent_dispositions: cases.length - mismatches.length,
    policy_consistency_rate: Number((((cases.length - mismatches.length) / cases.length) * 100).toFixed(1)),
    mismatch_count: mismatches.length,
    mismatch_case_ids: mismatches.map((row) => row.case_id),
    true_policy_mapping_inconsistency_case_ids: mappingBreaks.map((row) => row.case_id),
    every_disposition_mismatch_is_upstream: mismatches.every((row) => row.classification === "upstream_perception_mismatch"),
    cases,
  };
  const dest = path.join(__dirname, "disposition-policy-consistency.json");
  writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");
  console.log(JSON.stringify({
    comparable: out.comparable_cases,
    consistent: out.policy_consistent_dispositions,
    rate: out.policy_consistency_rate,
    mismatches: out.mismatch_case_ids,
    mapping_breaks: out.true_policy_mapping_inconsistency_case_ids,
    every_upstream: out.every_disposition_mismatch_is_upstream,
  }, null, 2));
}

main();
