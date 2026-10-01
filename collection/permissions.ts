import { isEmail, slotFromCase } from "./model";

export interface PermissionChange {
  caseId: string;
  folderName: string;
  email: string;
  role: "writer";
  action: "grant" | "revoke";
}

export function planAssignment(caseId: string, email: string, name: string): PermissionChange {
  const clean = email.trim();
  if (!isEmail(clean)) throw new Error(`missing or invalid email: ${email || "(empty)"}`);
  if (!name.trim()) throw new Error("assigned name is required");
  const item = slotFromCase(caseId);
  return { caseId: item.caseId, folderName: item.folderName, email: clean, role: "writer", action: "grant" };
}

export function planRevoke(caseId: string, email: string): PermissionChange {
  const item = slotFromCase(caseId);
  if (!isEmail(email)) throw new Error(`cannot revoke ${caseId}: no assigned email`);
  return { caseId: item.caseId, folderName: item.folderName, email, role: "writer", action: "revoke" };
}

/** The one shared link. View only. Never writer, commenter, or organizer. */
export const ROOT_LINK_PERMISSION = { type: "anyone" as const, role: "reader" as const };

export function describeDryRun(change: PermissionChange, limitedAccess: boolean): string[] {
  const lines = [
    `${change.action.toUpperCase()} ${change.role} on ${change.folderName} for ${change.email}`,
    "The root folder is not made editable.",
    "Other product folders will not be changed.",
    "The project owner keeps access.",
  ];
  if (!limitedAccess) {
    lines.push(
      "LIMITATION: limited access is not confirmed on this folder. The root link will stay private. The contributor receives access only to this product folder, not edit rights on the whole collection."
    );
  } else {
    lines.push("Limited access is on, so a reader of the root folder cannot edit or open this product unless they are assigned to it.");
  }
  return lines;
}
