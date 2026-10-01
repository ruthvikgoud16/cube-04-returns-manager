import Anthropic from "@anthropic-ai/sdk";
import { AMAZON_CONDITION_SOURCE } from "../rules/amazonCondition";
import { modelOutputJsonSchema } from "../schema/modelOutput";
import { ModelGrade } from "../types";
import { ModelRequest, ModelResponse, ReturnsModel } from "./ReturnsModel";

const SYSTEM = `You grade one returned ecommerce unit from photographs.
You do not choose restock, refurbish, liquidate, or dispose.
Report only what the photographs show.

Identity is visual likeness to the named product. A barcode, SKU, or ASIN is not required.
matches_ordered is true when the photos look like that named product, not merely a near lookalike.
matches_ordered is false only when the photos show a different product.
If the photos do not show enough to judge likeness, set matches_ordered to null and not_observable to true.
If the ordered name, brand, and model are all unknown, set matches_ordered to null and not_observable to true.
Do not invent a barcode, SKU, or ASIN.

Completeness:
parts_seen: required parts that are visible.
parts_missing: required parts the open photos show are absent.
parts_not_in_frame: required parts the photo simply does not show.
Never put a part in parts_missing just because the camera did not point at it.

Condition uses Amazon's published Used grades, sourced from ${AMAZON_CONDITION_SOURCE}:
used_like_new, used_very_good, used_good, used_acceptable.
Grade appearance and packaging only.
If a grade would require knowing that electronics work, and you cannot see that, set not_observable true and amazon_grade unknown.
Do not invent damage, missing parts, or identifiers.`;

export class ClaudeModel implements ReturnsModel {
  readonly name = "claude";
  private client: Anthropic;
  private model: string;

  constructor(apiKey = process.env.ANTHROPIC_API_KEY, model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5") {
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async infer(input: ModelRequest): Promise<ModelResponse> {
    const started = Date.now();
    const imageBlocks = input.photos
      .filter((photo) => photo.quality === "usable")
      .map((photo) => ({
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: mediaType(photo.media_type),
          data: photo.bytes.toString("base64"),
        },
      }));

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1200,
      temperature: 0,
      system: [
        {
          type: "text",
          text: SYSTEM,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: [
        {
          name: "submit_return_grade",
          description: "Submit the visual grade for this one return. Do not include a disposition.",
          input_schema: modelOutputJsonSchema as unknown as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: "tool", name: "submit_return_grade" },
      messages: [
        {
          role: "user",
          content: [
            ...imageBlocks,
            {
              type: "text",
              text: JSON.stringify({
                ordered_sku: input.ordered_sku,
                ordered_asin: input.ordered_asin,
                product_name: input.product_name,
                parts_list: input.parts_list,
                other_seller_products: input.lookalikes ?? [],
              }),
            },
          ],
        },
      ],
    });

    const tool = response.content.find((block) => block.type === "tool_use");
    if (!tool || tool.type !== "tool_use") {
      throw new Error("model returned no tool call");
    }
    return {
      grade: tool.input as ModelGrade,
      model_version: response.model,
      latency_ms: Date.now() - started,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    };
  }
}

function mediaType(value: string): "image/jpeg" | "image/png" | "image/gif" | "image/webp" {
  if (value === "image/png" || value === "image/gif" || value === "image/webp" || value === "image/jpeg") {
    return value;
  }
  return "image/jpeg";
}
