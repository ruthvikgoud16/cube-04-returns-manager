import { buildRecord, newImageKey } from "../evidence/build";
import { ReturnsModel } from "../model/ReturnsModel";
import { parseModelGrade } from "../schema/modelOutput";
import { applyPolicy, checksFromVerdicts } from "../policy/policy";
import { assessPhoto } from "../quality/gate";
import { CaptureInput, EvidenceRecord, ImageRef } from "../types";

/**
 * Always returns a record. A model failure, bad frame, or bad schema
 * leaves the operator with the capture and pending_review.
 * At most one model.infer call per invocation.
 */
export async function processReturn(input: CaptureInput, model: ReturnsModel): Promise<EvidenceRecord> {
  const images: ImageRef[] = [];
  for (const photo of input.photos) {
    const assessment = await assessPhoto(photo.bytes);
    images.push({
      key: newImageKey(input.organization_id),
      quality: assessment.quality,
      reasons: assessment.reasons,
      content_type: photo.media_type,
    });
  }

  const usable = input.photos
    .map((photo, index) => ({ ...photo, quality: images[index].quality }))
    .filter((photo) => photo.quality === "usable");

  if (!input.ordered_sku || !input.order_id || !input.unit_id || !input.organization_id) {
    return pending(input, images, 0, "incomplete_input");
  }
  if (usable.length === 0) {
    return pending(input, images, 0, images.length === 0 ? "missing_image" : "unusable_image");
  }

  let raw: unknown;
  let modelVersion: string | null = null;
  let latency: number | null = null;
  try {
    const response = await model.infer({ ...input, photos: usable });
    raw = response.grade;
    modelVersion = response.model_version;
    latency = response.latency_ms;
  } catch (err) {
    return pending(input, images, 1, `model_failure: ${err instanceof Error ? err.message : String(err)}`);
  }

  const parsed = parseModelGrade(raw);
  if (!parsed.ok) {
    return pending(input, images, 1, `schema_invalid: ${parsed.error}`, modelVersion, latency);
  }

  const decision = applyPolicy(parsed.data);
  return buildRecord({
    input,
    images,
    checks: checksFromVerdicts(decision.checks, parsed.data, modelVersion, latency),
    disposition: decision.disposition,
    rationale: decision.rationale,
    grade: parsed.data,
    modelVersion,
    inferenceCallCount: 1,
    failure: null,
    status: decision.disposition === "pending_review" ? "pending_review" : "graded",
  });
}

function pending(
  input: CaptureInput,
  images: ImageRef[],
  calls: number,
  failure: string,
  modelVersion: string | null = null,
  latency: number | null = null
): EvidenceRecord {
  return buildRecord({
    input,
    images,
    checks: checksFromVerdicts(
      { identity: "UNCERTAIN", completeness: "UNCERTAIN", condition: "UNCERTAIN" },
      null,
      modelVersion,
      latency,
      failure
    ),
    disposition: "pending_review",
    rationale: "The capture is saved. The agent did not grade it. The operator decides.",
    grade: null,
    modelVersion,
    inferenceCallCount: calls,
    failure,
    status: "pending_review",
  });
}
