import path from "path";
import { PHOTO_SLOTS, exportPhotoName, sanitizeUploadName } from "./model";

export function caseDir(dest: string, caseId: string): string {
  assertInside(dest, path.join(dest, "cases", caseId));
  return path.join(dest, "cases", caseId);
}

export function photoDest(dest: string, caseId: string, slotFolder: string, originalName: string): string {
  const photo = PHOTO_SLOTS.find((item) => item.folder === slotFolder);
  if (!photo) throw new Error(`unknown photo slot: ${slotFolder}`);
  const filename = exportPhotoName(photo.key === "front" ? "01-front"
    : photo.key === "back" ? "02-back"
    : photo.key === "identification" ? "03-identification"
    : photo.key === "accessories" ? "04-accessories"
    : "05-condition", originalName);
  const full = path.join(caseDir(dest, caseId), "photos", filename);
  assertInside(dest, full);
  return full;
}

export function assertInside(root: string, target: string): void {
  const base = path.resolve(root);
  const resolved = path.resolve(target);
  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    throw new Error(`path escaped export root: ${target}`);
  }
}

export function safeLeaf(filename: string): string {
  return sanitizeUploadName(filename);
}
