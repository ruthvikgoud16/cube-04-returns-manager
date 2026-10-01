import { PHOTO_SLOTS, SLOT_COUNT, allSlots, isAllowedPhoto, slotFromCase } from "./model";
import { Row } from "./csv";

export interface ListedItem {
  name: string;
  kind: "folder" | "file";
}

export interface ProductInspection {
  caseId: string;
  items: ListedItem[];
}

export interface SlotReport {
  caseId: string;
  status: "READY" | "INCOMPLETE" | "UNASSIGNED" | "NOT_LISTED" | "NEEDS_REVIEW";
  missing: string[];
  photos: Record<string, "PASS" | "EMPTY" | "OPTIONAL_EMPTY" | "UNEXPECTED" | "DUPLICATE">;
}

export interface CollectionReport {
  expected: number;
  found: number;
  missingFolders: string[];
  duplicateFolders: string[];
  assigned: number;
  unassigned: number;
  submitted: number;
  incomplete: number;
  ready: number;
  needsReview: number;
  slots: SlotReport[];
  notes: string[];
}

export function validateCollection(folderNames: string[], inspections: ProductInspection[], assignments: Row[]): CollectionReport {
  const expected = allSlots().map((item) => item.folderName);
  const counts = new Map<string, number>();
  for (const name of folderNames) counts.set(name, (counts.get(name) ?? 0) + 1);
  const missingFolders = expected.filter((name) => !counts.has(name));
  const duplicateFolders = [...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name);
  const byCase = new Map(inspections.map((item) => [item.caseId, item]));
  const assignmentByCase = new Map(assignments.map((row) => [row.case_id, row]));
  const slots = expected.map((name) => {
    const item = allSlots().find((slot) => slot.folderName === name)!;
    return reportSlot(item.caseId, byCase.get(item.caseId), assignmentByCase.get(item.caseId));
  });
  return {
    expected: SLOT_COUNT,
    found: expected.filter((name) => counts.has(name)).length,
    missingFolders,
    duplicateFolders,
    assigned: assignments.filter((row) => row.status === "ASSIGNED").length,
    unassigned: assignments.filter((row) => row.status !== "ASSIGNED").length,
    submitted: assignments.filter((row) => row.submitted_at).length,
    incomplete: slots.filter((slot) => slot.status === "INCOMPLETE").length,
    ready: slots.filter((slot) => slot.status === "READY").length,
    needsReview: slots.filter((slot) => slot.status === "NEEDS_REVIEW").length,
    slots,
    notes: duplicateFolders.length ? ["Duplicate product folders are present. Do not create another copy."] : [],
  };
}

function reportSlot(caseId: string, inspection: ProductInspection | undefined, assignment: Row | undefined): SlotReport {
  if (!inspection) {
    return { caseId, status: "NOT_LISTED", missing: ["folder not listed"], photos: {} };
  }
  const names = new Set(inspection.items.filter((item) => item.kind === "folder").map((item) => item.name));
  const files = inspection.items.filter((item) => item.kind === "file");
  const missing: string[] = [];
  if (!files.some((file) => file.name === "00 — STATUS")) missing.push("status file");
  if (!names.has("01 — PRODUCT DETAILS")) missing.push("product details folder");
  if (!files.some((file) => file.name === "PRODUCT DETAILS")) missing.push("product detail template");
  if (!names.has("02 — PHOTOS")) missing.push("photos folder");
  const photos: SlotReport["photos"] = {};
  let bad = false;
  for (const photo of PHOTO_SLOTS) {
    if (!names.has(photo.folder)) {
      missing.push(photo.folder);
      photos[photo.key] = "EMPTY";
      continue;
    }
    const inFolder = files.filter((file) => file.name.startsWith(`${photo.folder}/`));
    const images = inFolder.filter((file) => {
      const leaf = file.name.split("/").pop() ?? "";
      try {
        return isAllowedPhoto(leaf);
      } catch {
        bad = true;
        return false;
      }
    });
    if (inFolder.some((file) => {
      const leaf = file.name.split("/").pop() ?? file.name;
      try {
        return !isAllowedPhoto(leaf);
      } catch {
        return true;
      }
    })) bad = true;
    if (images.length > 1) {
      photos[photo.key] = "DUPLICATE";
      bad = true;
    } else if (images.length === 1) {
      photos[photo.key] = "PASS";
    } else {
      photos[photo.key] = photo.required ? "EMPTY" : "OPTIONAL_EMPTY";
      if (photo.required) missing.push(`${photo.folder} photo`);
    }
  }
  const assigned = assignment?.status === "ASSIGNED";
  let status: SlotReport["status"] = "READY";
  if (!assigned) status = "UNASSIGNED";
  else if (missing.length) status = "INCOMPLETE";
  else if (bad) status = "NEEDS_REVIEW";
  return { caseId, status, missing, photos };
}

export function formatReport(report: CollectionReport): string {
  const lines = [
    "COLLECTION VALIDATION",
    "",
    "Product slots:",
    `${report.expected} expected`,
    `${report.found} found`,
    "",
    `Assigned:`,
    `${report.assigned}`,
    "",
    `Unassigned:`,
    `${report.unassigned}`,
    "",
    `Submitted:`,
    `${report.submitted}`,
    "",
    `Incomplete:`,
    `${report.incomplete}`,
    "",
    `Ready:`,
    `${report.ready}`,
    "",
    `Needs review:`,
    `${report.needsReview}`,
  ];
  if (report.missingFolders.length) lines.push("", "Missing folders:", ...report.missingFolders);
  if (report.duplicateFolders.length) lines.push("", "Duplicate folders:", ...report.duplicateFolders);
  for (const slot of report.slots.filter((item) => item.status !== "NOT_LISTED")) {
    const item = slotFromCase(slot.caseId);
    lines.push("", item.caseId);
    for (const photo of PHOTO_SLOTS) {
      const value = slot.photos[photo.key] ?? "EMPTY";
      lines.push(`${photo.folder}: ${value === "OPTIONAL_EMPTY" ? "OPTIONAL / EMPTY" : value}`);
    }
    lines.push(`Status: ${slot.status}`);
  }
  if (report.notes.length) lines.push("", ...report.notes);
  return lines.join("\n") + "\n";
}
