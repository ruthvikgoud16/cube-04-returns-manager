import sharp from "sharp";

export interface QualityAssessment {
  quality: "usable" | "unusable";
  reasons: string[];
}

/** Capture gates, not accuracy targets. A frame that fails is not graded. */
export const MIN_EDGE_PX = 480;
export const MIN_LAPLACIAN_VARIANCE = 12;
export const MIN_MEAN = 18;
export const MAX_MEAN = 245;

export async function assessPhoto(bytes: Buffer): Promise<QualityAssessment> {
  const reasons: string[] = [];
  let image;
  try {
    image = sharp(bytes, { failOn: "none" }).rotate();
      const meta = await image.metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (width < MIN_EDGE_PX || height < MIN_EDGE_PX) reasons.push("frame_too_small");

    const { data, info } = await image
      .clone()
      .resize(256, 256, { fit: "inside" })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const mean = average(data);
    if (mean < MIN_MEAN) reasons.push("too_dark");
    if (mean > MAX_MEAN) reasons.push("blown_out");

    const variance = laplacianVariance(data, info.width, info.height);
    if (variance < MIN_LAPLACIAN_VARIANCE) reasons.push("too_blurry");

    return { quality: reasons.length ? "unusable" : "usable", reasons };
  } catch {
    return { quality: "unusable", reasons: ["unreadable_file"] };
  }
}

function average(data: Buffer): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i];
  return data.length ? sum / data.length : 0;
}

function laplacianVariance(data: Buffer, width: number, height: number): number {
  if (width < 3 || height < 3) return 0;
  const values: number[] = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap =
        4 * data[i] -
        data[i - 1] -
        data[i + 1] -
        data[i - width] -
        data[i + width];
      values.push(lap);
    }
  }
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return variance;
}
