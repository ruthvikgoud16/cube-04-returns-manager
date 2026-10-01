export interface LabelRow {
  case_id: string;
  labeler: string;
  identity: string;
  completeness: string;
  amazon_condition: string;
}

export interface GradeRow {
  case_id: string;
  identity: string;
  completeness: string;
  condition: string;
  amazon_grade: string;
}

export interface CheckScore {
  agreed: number;
  matched: number;
  false_positives: number;
  false_negatives: number;
  agent_uncertain: number;
}

export function agreedLabels(rows: LabelRow[]): Map<string, LabelRow> {
  const byCase = new Map<string, LabelRow[]>();
  for (const row of rows) {
    const list = byCase.get(row.case_id) ?? [];
    list.push(row);
    byCase.set(row.case_id, list);
  }
  const agreed = new Map<string, LabelRow>();
  for (const [caseId, list] of byCase) {
    const people = new Set(list.map((row) => row.labeler));
    if (people.size < 2) continue;
    const [first] = list;
    const same = list.every((row) =>
      row.identity === first.identity &&
      row.completeness === first.completeness &&
      row.amazon_condition === first.amazon_condition
    );
    if (same) agreed.set(caseId, first);
  }
  return agreed;
}

export function scoreAgreed(labels: Map<string, LabelRow>, grades: GradeRow[]): Record<"identity" | "completeness" | "condition", CheckScore> {
  const blank = (): CheckScore => ({ agreed: 0, matched: 0, false_positives: 0, false_negatives: 0, agent_uncertain: 0 });
  const scores = { identity: blank(), completeness: blank(), condition: blank() };
  for (const grade of grades) {
    const label = labels.get(grade.case_id);
    if (!label) continue;
    tally(scores.identity, label.identity, grade.identity);
    tally(scores.completeness, label.completeness, grade.completeness);
    tallyGrade(scores.condition, label.amazon_condition, grade.amazon_grade, grade.condition);
  }
  return scores;
}

function tallyGrade(score: CheckScore, humanGrade: string, agentGrade: string, agentVerdict: string): void {
  score.agreed += 1;
  if (agentVerdict === "UNCERTAIN" || agentGrade === "unknown") score.agent_uncertain += 1;
  if (humanGrade === agentGrade) score.matched += 1;
}

function tally(score: CheckScore, human: string, agent: string): void {
  score.agreed += 1;
  if (agent === "UNCERTAIN" || agent === "unknown") score.agent_uncertain += 1;
  if (human === agent) score.matched += 1;
  if (agent === "PASS" && human === "FAIL") score.false_positives += 1;
  if (agent === "FAIL" && human === "PASS") score.false_negatives += 1;
}
