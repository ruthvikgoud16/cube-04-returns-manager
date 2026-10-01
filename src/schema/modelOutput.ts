import { z } from "zod";
import { AMAZON_USED_GRADES, OBSERVED_STATES } from "../rules/amazonCondition";
import { ModelGrade } from "../types";

export const modelGradeSchema = z.object({
  identity: z.object({
    matches_ordered: z.boolean().nullable(),
    not_observable: z.boolean(),
    readable_identifier: z.string().nullable(),
    confused_with_sku: z.string().nullable(),
    confidence: z.number().min(0).max(1).nullable(),
    evidence: z.string().min(1),
  }),
  completeness: z.object({
    parts_seen: z.array(z.string()),
    parts_missing: z.array(z.string()),
    parts_not_in_frame: z.array(z.string()),
    confidence: z.number().min(0).max(1).nullable(),
    evidence: z.string().min(1),
  }),
  condition: z.object({
    observed_state: z.enum(OBSERVED_STATES),
    amazon_grade: z.enum([...AMAZON_USED_GRADES, "unknown"] as const),
    not_observable: z.boolean(),
    confidence: z.number().min(0).max(1).nullable(),
    evidence: z.string().min(1),
  }),
  uncertainty_reasons: z.array(z.string()),
});

export function parseModelGrade(raw: unknown): { ok: true; data: ModelGrade } | { ok: false; error: string } {
  const parsed = modelGradeSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  return { ok: true, data: parsed.data };
}

export const modelOutputJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["identity", "completeness", "condition", "uncertainty_reasons"],
  properties: {
    identity: {
      type: "object",
      additionalProperties: false,
      required: [
        "matches_ordered",
        "not_observable",
        "readable_identifier",
        "confused_with_sku",
        "confidence",
        "evidence",
      ],
      properties: {
        matches_ordered: { type: ["boolean", "null"] },
        not_observable: { type: "boolean" },
        readable_identifier: { type: ["string", "null"] },
        confused_with_sku: { type: ["string", "null"] },
        confidence: { type: ["number", "null"] },
        evidence: { type: "string" },
      },
    },
    completeness: {
      type: "object",
      additionalProperties: false,
      required: ["parts_seen", "parts_missing", "parts_not_in_frame", "confidence", "evidence"],
      properties: {
        parts_seen: { type: "array", items: { type: "string" } },
        parts_missing: { type: "array", items: { type: "string" } },
        parts_not_in_frame: { type: "array", items: { type: "string" } },
        confidence: { type: ["number", "null"] },
        evidence: { type: "string" },
      },
    },
    condition: {
      type: "object",
      additionalProperties: false,
      required: ["observed_state", "amazon_grade", "not_observable", "confidence", "evidence"],
      properties: {
        observed_state: { type: "string", enum: [...OBSERVED_STATES] },
        amazon_grade: { type: "string", enum: [...AMAZON_USED_GRADES, "unknown"] },
        not_observable: { type: "boolean" },
        confidence: { type: ["number", "null"] },
        evidence: { type: "string" },
      },
    },
    uncertainty_reasons: { type: "array", items: { type: "string" } },
  },
} as const;
