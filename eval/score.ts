import { existsSync, readFileSync } from "fs";
import path from "path";
import { parseCsv } from "../collection/csv";
import { agreedLabels, CheckScore, GradeRow, LabelRow, scoreAgreed } from "./agreed";

function main() {
  const labelsFile = path.join(__dirname, "labels.csv");
  if (!existsSync(labelsFile)) {
    console.error("eval/labels.csv is missing. No score was calculated.");
    process.exit(2);
  }
  const labels = parseCsv(readFileSync(labelsFile, "utf8")).map((row): LabelRow => ({
    case_id: row.case_id,
    labeler: row.labeler,
    identity: row.identity,
    completeness: row.completeness,
    amazon_condition: row.amazon_condition,
  }));
  const people = new Set(labels.map((row) => row.labeler).filter(Boolean));
  if (people.size < 2) {
    console.error("Second labeler has not been entered. No accuracy, false positive, or false negative number was calculated.");
    process.exit(2);
  }
  const agreed = agreedLabels(labels);
  const gradesFile = path.join(__dirname, "..", "collection", "export", "fifty", "results.json");
  if (!existsSync(gradesFile)) {
    console.error(`${agreed.size} cases have two agreeing labelers. The agent has not graded them. No accuracy was calculated.`);
    process.exit(2);
  }
  const grades = (JSON.parse(readFileSync(gradesFile, "utf8")).products ?? []) as GradeRow[];
  if (grades.length < 50) {
    console.error(`Agent grades so far: ${grades.length} of 50. No accuracy was calculated on a partial run.`);
    process.exit(2);
  }
  const scores = scoreAgreed(agreed, grades);
  console.log(`Agreed cases: ${agreed.size} of 50. Disagreements are not scored.`);
  console.log(`Disposition was not labeled, so it is not scored.`);
  print("identity", scores.identity, true);
  print("completeness", scores.completeness, true);
  print("condition grade", scores.condition, false);
}

function print(name: string, score: CheckScore, passFail: boolean): void {
  const pct = (n: number) => (score.agreed ? `${((n / score.agreed) * 100).toFixed(1)}%` : "n/a");
  const errors = passFail ? `, false positives ${score.false_positives}, false negatives ${score.false_negatives}` : "";
  console.log(`${name}: matched ${score.matched}/${score.agreed} (${pct(score.matched)}), uncertain ${score.agent_uncertain}/${score.agreed} (${pct(score.agent_uncertain)})${errors}`);
}

main();
