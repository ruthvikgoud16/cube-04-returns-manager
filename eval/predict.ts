import { readFileSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import { ClaudeModel } from "../src/model/ClaudeModel";
import { ReturnsModel } from "../src/model/ReturnsModel";
import { processReturn } from "../src/process/processReturn";

interface Fixture {
  case_id: string;
  organization_id: string;
  client_id: string;
  ordered_sku: string;
  ordered_asin: string;
  product_name: string;
  parts_list: string[];
  photos: string[];
  expected_disposition: string;
  test_objective: string;
}

class RefusalModel implements ReturnsModel {
  readonly name = "unconfigured";
  async infer(): Promise<never> {
    throw new Error("ANTHROPIC_API_KEY is not set. Predictions were not graded.");
  }
}

async function main() {
  const root = path.join(__dirname, "..");
  const fixturePath = path.join(root, "fixtures", "data", "vision-gate-fixtures.json");
  const fixtures = (JSON.parse(readFileSync(fixturePath, "utf8")) as { fixtures: Fixture[] }).fixtures;
  const model: ReturnsModel = process.env.ANTHROPIC_API_KEY ? new ClaudeModel() : new RefusalModel();
  const outDir = path.join(root, "eval", "out");
  mkdirSync(outDir, { recursive: true });
  const rows = [];
  for (const fixture of fixtures) {
    const others = fixtures
      .filter((item) => item.ordered_sku !== fixture.ordered_sku)
      .filter((item, index, list) => list.findIndex((candidate) => candidate.ordered_sku === item.ordered_sku) === index)
      .slice(0, 6)
      .map((item) => ({ sku: item.ordered_sku, asin: item.ordered_asin, product_name: item.product_name }));
    const photos = fixture.photos.map((rel) => ({
      filename: path.basename(rel),
      media_type: "image/jpeg",
      bytes: readFileSync(path.join(root, rel)),
    }));
    const record = await processReturn(
      {
        organization_id: fixture.organization_id,
        client_id: fixture.client_id,
        unit_id: fixture.case_id,
        order_id: fixture.case_id,
        ordered_sku: fixture.ordered_sku,
        ordered_asin: fixture.ordered_asin,
        product_name: fixture.product_name,
        parts_list: fixture.parts_list,
        operator_label: "eval",
        photos,
        lookalikes: others,
      },
      model
    );
    rows.push({
      case_id: fixture.case_id,
      developer_expectation: fixture.expected_disposition,
      note: fixture.test_objective,
      disposition: record.outcome.disposition,
      status: record.status,
      failure: record.failure,
      inference_call_count: record.inference_call_count,
      checks: record.checks,
      amazon_condition: record.returns.amazon_condition,
      content_hash: record.content_hash,
    });
    console.log(`${fixture.case_id} ${record.outcome.disposition} calls=${record.inference_call_count}`);
  }
  writeFileSync(path.join(outDir, "predictions.json"), JSON.stringify(rows, null, 2));
  console.log(`wrote ${rows.length} predictions. This file is not a scored result.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
