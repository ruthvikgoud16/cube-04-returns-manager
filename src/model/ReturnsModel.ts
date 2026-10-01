import { CaptureInput, ModelGrade } from "../types";

export interface ModelRequest extends CaptureInput {
  photos: Array<CaptureInput["photos"][number] & { quality: "usable" | "unusable" }>;
}

export interface ModelResponse {
  grade: ModelGrade;
  model_version: string;
  latency_ms: number;
  usage?: { input_tokens: number; output_tokens: number };
}

export interface ReturnsModel {
  readonly name: string;
  infer(input: ModelRequest): Promise<ModelResponse>;
}
