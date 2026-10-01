export const ROOT_NAME = "CUBE 2026 — RTN PRODUCT COLLECTION";
export const README_NAME = "00 — READ ME FIRST";
export const SLOT_COUNT = 50;

export const PHOTO_SLOTS = [
  { folder: "01 — FRONT", key: "front", required: true },
  { folder: "02 — BACK", key: "back", required: true },
  { folder: "03 — IDENTIFICATION", key: "identification", required: true },
  { folder: "04 — ACCESSORIES", key: "accessories", required: true },
  { folder: "05 — CONDITION", key: "condition", required: false },
] as const;

const ALLOWED_PHOTO = new Set(["jpg", "jpeg", "png", "webp", "heic"]);

export interface Slot {
  n: number;
  caseId: string;
  unitId: string;
  orderId: string;
  productSlot: string;
  folderName: string;
}

export interface PlannedNode {
  path: string;
  name: string;
  parentPath: string | null;
  kind: "folder" | "doc";
  body?: string;
  limitedAccess: boolean;
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

export function slot(n: number): Slot {
  if (n < 1 || n > SLOT_COUNT) throw new Error(`product slot ${n} is outside 1–${SLOT_COUNT}`);
  return {
    n,
    caseId: `RTN-${pad3(n)}`,
    unitId: `UNIT-${pad3(n)}`,
    orderId: `ORD-${pad3(n)}`,
    productSlot: `PRODUCT ${pad2(n)}`,
    folderName: `${pad2(n)} — PRODUCT ${pad2(n)}`,
  };
}

export function allSlots(): Slot[] {
  return Array.from({ length: SLOT_COUNT }, (_, i) => slot(i + 1));
}

export function slotFromCase(caseId: string): Slot {
  const match = /^RTN-(\d{3})$/.exec(caseId.trim());
  if (!match) throw new Error(`case_id must look like RTN-001, received ${caseId}`);
  return slot(Number(match[1]));
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function escapeDriveName(name: string): string {
  return name.replace(/'/g, "\\'");
}

export function sanitizeUploadName(filename: string): string {
  const base = filename.replace(/\\/g, "/").split("/").pop() ?? "";
  if (!base || base === "." || base === ".." || base.includes("..")) {
    throw new Error(`rejected filename: ${filename}`);
  }
  const cleaned = base.replace(/[^A-Za-z0-9._-]+/g, "_");
  if (!cleaned || cleaned === "." || cleaned === "..") throw new Error(`rejected filename: ${filename}`);
  return cleaned.slice(0, 120);
}

export function photoExtension(filename: string): string {
  const safe = sanitizeUploadName(filename);
  const ext = safe.includes(".") ? safe.split(".").pop()!.toLowerCase() : "";
  return ext;
}

export function isAllowedPhoto(filename: string): boolean {
  return ALLOWED_PHOTO.has(photoExtension(filename));
}

export function exportPhotoName(slotKey: string, original: string): string {
  const safe = sanitizeUploadName(original);
  const ext = photoExtension(safe);
  return `${slotKey}.${ext}`;
}
