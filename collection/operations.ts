import fs from "fs";
import path from "path";
import { parseCsv, toCsv } from "./csv";
import { DriveClient } from "./drive";
import { caseDir, photoDest } from "./exportPaths";
import { allSlots, PHOTO_SLOTS, slotFromCase } from "./model";
import { describeDryRun, planAssignment, planRevoke } from "./permissions";
import { ASSIGNMENT_HEADERS, CASE_HEADERS, assignRow, emptyRegistries, revokeRow } from "./registry";
import { collectionPlan } from "./tree";
import { formatReport, ListedItem, validateCollection } from "./validate";

export interface CollectionState {
  rootId?: string;
  rootUrl?: string;
  limitedAccess: "unknown" | "enabled" | "unsupported" | "shared-edit";
  nodes: Record<string, { id: string; kind: "folder" | "doc" }>;
}

export function collectionPaths(root = process.cwd()) {
  return {
    state: path.join(root, "collection", ".state", "drive.json"),
    cases: path.join(root, "collection", "case-registry.csv"),
    assignments: path.join(root, "collection", "assignments.csv"),
  };
}

export function loadState(root = process.cwd()): CollectionState {
  const file = collectionPaths(root).state;
  if (!fs.existsSync(file)) return { limitedAccess: "unknown", nodes: {} };
  return JSON.parse(fs.readFileSync(file, "utf8")) as CollectionState;
}

export function saveState(state: CollectionState, root = process.cwd()): void {
  const file = collectionPaths(root).state;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
}

export function ensureRegistries(root = process.cwd(), now = new Date().toISOString()): void {
  const files = collectionPaths(root);
  if (fs.existsSync(files.cases) || fs.existsSync(files.assignments)) return;
  const created = emptyRegistries(now);
  fs.mkdirSync(path.join(root, "collection"), { recursive: true });
  fs.writeFileSync(files.cases, created.cases);
  fs.writeFileSync(files.assignments, created.assignments);
}

export async function createCollection(client: DriveClient, dryRun: boolean, root = process.cwd()): Promise<string[]> {
  ensureRegistries(root);
  const state = loadState(root);
  const lines: string[] = [];
  let limitedOk = true;
  for (const node of collectionPlan()) {
    if (state.nodes[node.path]) {
      lines.push(`reuse ${node.path || node.name}`);
      continue;
    }
    if (dryRun) {
      lines.push(`would create ${node.kind} ${node.path || node.name}`);
      continue;
    }
    const parentId = node.parentPath === null ? null : state.nodes[node.parentPath]?.id;
    if (node.parentPath !== null && !parentId) throw new Error(`parent missing for ${node.path}`);
    const existing = await client.findChild(parentId, node.name, node.kind);
    const created = existing ?? (node.kind === "folder"
      ? await client.createFolder(parentId, node.name)
      : await client.createDoc(parentId!, node.name, node.body ?? ""));
    state.nodes[node.path] = { id: created.id, kind: node.kind };
    if (!node.path) {
      state.rootId = created.id;
      state.rootUrl = `https://drive.google.com/drive/folders/${created.id}`;
    }
    if (node.limitedAccess) {
      const result = await client.setLimitedAccess(created.id);
      if (result !== "set") limitedOk = false;
    }
    lines.push(`${existing ? "found" : "created"} ${node.path || node.name}`);
    saveState(state, root);
  }
  if (dryRun) return lines;
  state.limitedAccess = limitedOk ? "enabled" : "unsupported";
  saveState(state, root);
  lines.push("Root stays private to the owner. It is not shared until collection:publish, and only after two Google accounts have tested edit isolation.");
  if (!limitedOk) {
    lines.push("LIMITATION: limited access could not be confirmed. The root was NOT shared with anyone.");
  }
  return lines;
}

export async function shareOneLink(client: DriveClient, dryRun: boolean, root = process.cwd()): Promise<string[]> {
  const state = loadState(root);
  if (!state.rootId || !state.rootUrl) throw new Error("Drive collection is not created yet.");
  if (dryRun) return ["DRY RUN", `would share one edit link for all 50 products: ${state.rootUrl}`];
  for (const item of allSlots()) {
    const node = state.nodes[item.folderName];
    if (!node) throw new Error(`missing ${item.folderName}`);
    const opened = await client.clearLimitedAccess(node.id);
    if (opened !== "cleared") throw new Error(`Could not open ${item.folderName} inside the shared folder.`);
  }
  await client.shareAnyoneWriter(state.rootId);
  const permissions = await client.listPermissions(state.rootId);
  if (permissions !== "NOT_VERIFIABLE") {
    const anyone = permissions.find((entry) => entry.type === "anyone");
    if (anyone?.role !== "writer") throw new Error("The single link is not an edit link.");
  }
  const sample = await client.getLimitedAccess(state.nodes[allSlots()[0].folderName].id);
  if (sample !== false) throw new Error("Product folders are still locked, so the one link would not allow uploads.");
  state.limitedAccess = "shared-edit";
  saveState(state, root);
  return [
    state.rootUrl,
    "Anyone with this link can open the one folder and edit every product in it.",
  ];
}

export async function publishRootLink(client: DriveClient, dryRun: boolean, root = process.cwd()): Promise<string[]> {
  const state = loadState(root);
  if (!state.rootId) throw new Error("Drive collection is not created yet.");
  if (state.limitedAccess !== "enabled") {
    throw new Error("Refusing to share the root. Limited access is not enabled, so a shared root would expose other products.");
  }
  if (dryRun) return ["DRY RUN", "would share the root as anyone/reader only", state.rootUrl ?? ""];
  for (const item of allSlots()) {
    const node = state.nodes[item.folderName];
    if (!node) throw new Error(`missing ${item.folderName}`);
    const limited = await client.getLimitedAccess(node.id);
    if (limited !== true) throw new Error(`Refusing to share the root. ${item.folderName} limited access is ${String(limited)}.`);
  }
  await client.shareAnyoneReader(state.rootId);
  return [`root link is view-only: ${state.rootUrl}`];
}

export async function assignProduct(client: DriveClient | null, caseId: string, email: string, name: string, dryRun: boolean, root = process.cwd()): Promise<string[]> {
  ensureRegistries(root);
  const state = loadState(root);
  const change = planAssignment(caseId, email, name);
  const limited = state.limitedAccess === "enabled";
  const lines = describeDryRun(change, limited);
  if (dryRun) return ["DRY RUN", ...lines];
  const files = collectionPaths(root);
  const assignments = parseCsv(fs.readFileSync(files.assignments, "utf8"));
  const cases = parseCsv(fs.readFileSync(files.cases, "utf8"));
  const now = new Date().toISOString();
  const nextAssignments = assignRow(assignments, change.caseId, name, change.email, now);
  const nextCases = assignRow(cases, change.caseId, name, change.email, now);
  const folder = state.nodes[change.folderName];
  if (!folder) throw new Error(`Drive folder for ${change.folderName} is not created yet. Run collection:create first.`);
  if (!client) throw new Error("Drive client is required to grant access.");
  await client.grantWriter(folder.id, change.email);
  fs.writeFileSync(files.assignments, toCsv([...ASSIGNMENT_HEADERS], nextAssignments));
  fs.writeFileSync(files.cases, toCsv([...CASE_HEADERS], nextCases));
  lines.unshift(`assigned ${change.caseId} to ${change.email}`);
  lines.push(state.rootUrl ? `root: ${state.rootUrl}` : "root link is not shared");
  lines.push(`product folder id: ${folder.id}`);
  return lines;
}

export async function revokeProduct(client: DriveClient | null, caseId: string, dryRun: boolean, root = process.cwd()): Promise<string[]> {
  const item = slotFromCase(caseId);
  const files = collectionPaths(root);
  const assignments = parseCsv(fs.readFileSync(files.assignments, "utf8"));
  const row = assignments.find((entry) => entry.case_id === item.caseId);
  const email = row?.assigned_email ?? "";
  const change = planRevoke(item.caseId, email);
  if (dryRun) return ["DRY RUN", ...describeDryRun(change, loadState(root).limitedAccess === "enabled")];
  const state = loadState(root);
  const folder = state.nodes[item.folderName];
  if (folder && client) await client.revokeEmail(folder.id, email);
  fs.writeFileSync(files.assignments, toCsv([...ASSIGNMENT_HEADERS], revokeRow(assignments, item.caseId)));
  const cases = parseCsv(fs.readFileSync(files.cases, "utf8"));
  fs.writeFileSync(files.cases, toCsv([...CASE_HEADERS], revokeRow(cases, item.caseId)));
  return [`revoked ${item.caseId} from ${email}`];
}

export async function verifyPermissions(client: DriveClient | null, root = process.cwd()): Promise<string[]> {
  const state = loadState(root);
  const assignmentFile = collectionPaths(root).assignments;
  const assignments = fs.existsSync(assignmentFile) ? parseCsv(fs.readFileSync(assignmentFile, "utf8")) : [];
  const lines: string[] = [];
  if (state.rootId && client) {
    const rootPermissions = await client.listPermissions(state.rootId);
    lines.push("ROOT");
    if (rootPermissions === "NOT_VERIFIABLE") {
      lines.push("Anyone-with-link role: NOT_VERIFIABLE");
    } else {
      const anyone = rootPermissions.filter((entry) => entry.type === "anyone");
      const roles = anyone.map((entry) => entry.role || "unknown");
      lines.push(`Anyone-with-link role: ${roles.join(", ") || "absent"}`);
      if (roles.some((role) => role !== "reader")) lines.push("Root edit exposure: FAIL");
      else lines.push("Root edit exposure: view-only or private");
    }
  }
  if (!state.rootId || !client) {
    return ["Drive collection is not connected. Isolation: NOT_VERIFIABLE", "A second Google account has not edited a folder from here. Cross-account edit test: NOT_VERIFIABLE"];
  }
  for (const item of allSlots()) {
    const node = state.nodes[item.folderName];
    const assigned = assignments.find((row) => row.case_id === item.caseId)?.assigned_email || "(unassigned)";
    if (!node) {
      lines.push(`${item.folderName}`, `Assigned: ${assigned}`, "Isolation: NOT_VERIFIABLE");
      continue;
    }
    const limited = await client.getLimitedAccess(node.id);
    const permissions = await client.listPermissions(node.id);
    lines.push(item.folderName);
    lines.push(`Assigned: ${assigned}`);
    lines.push("Owner/Admin: connected Google account");
    if (limited === "NOT_VERIFIABLE" || permissions === "NOT_VERIFIABLE") {
      lines.push("Isolation: NOT_VERIFIABLE");
    } else if (limited === true) {
      lines.push("Isolation: configured (limited access on). Cross-account edit test: NOT_VERIFIABLE");
    } else {
      lines.push("Isolation: NOT configured. Root link was not opened to everyone.");
    }
    if (permissions !== "NOT_VERIFIABLE") {
      const writers = permissions.filter((entry) => entry.role === "writer").map((entry) => entry.emailAddress || entry.type);
      lines.push(`Direct writers visible to the API: ${writers.join(", ") || "none listed"}`);
    }
  }
  lines.push("Cross-account edit test: NOT_VERIFIABLE — this command can read permission metadata. It cannot log in as a second person.");
  return lines;
}

export async function validateLive(client: DriveClient | null, root = process.cwd()): Promise<string> {
  ensureRegistries(root);
  const state = loadState(root);
  const assignments = parseCsv(fs.readFileSync(collectionPaths(root).assignments, "utf8"));
  if (!state.rootId || !client) {
    const report = validateCollection([], [], assignments);
    return formatReport(report) + "Drive contents: NOT_VERIFIED. Run collection:create after Google is connected.\n";
  }
  const children = await client.listChildren(state.rootId);
  if (children === "NOT_VERIFIABLE") {
    return "Drive listing: NOT_VERIFIABLE\n";
  }
  const folders = children.filter((item) => item.mimeType === "application/vnd.google-apps.folder").map((item) => item.name);
  const inspections = [];
  for (const item of allSlots()) {
    const folder = state.nodes[item.folderName];
    if (!folder) continue;
    const items = await collectItems(client, folder.id, "");
    inspections.push({ caseId: item.caseId, items });
  }
  return formatReport(validateCollection(folders, inspections, assignments));
}

async function collectItems(client: DriveClient, folderId: string, prefix: string): Promise<ListedItem[]> {
  const children = await client.listChildren(folderId);
  if (children === "NOT_VERIFIABLE") return [];
  const items: ListedItem[] = [];
  for (const child of children) {
    const rel = prefix ? `${prefix}/${child.name}` : child.name;
    if (child.mimeType === "application/vnd.google-apps.folder") {
      const folderName = rel.split("/").pop() ?? child.name;
      items.push({ name: folderName, kind: "folder" });
      items.push(...(await collectItems(client, child.id, rel)).map((item) => (
        item.kind === "file" ? { name: `${folderName}/${item.name.split("/").pop()}`, kind: "file" as const } : item
      )));
    } else {
      items.push({ name: prefix ? `${prefix.split("/").pop()}/${child.name}` : child.name, kind: "file" });
    }
  }
  return items;
}

export function exportDataset(dest: string, root = process.cwd()): string[] {
  ensureRegistries(root);
  const assignments = parseCsv(fs.readFileSync(collectionPaths(root).assignments, "utf8"));
  fs.mkdirSync(dest, { recursive: true });
  const manifest = ["case_id,unit_id,order_id,product_slot,assigned_name,status,photo_bytes"];
  for (const row of assignments) {
    const dir = caseDir(dest, row.case_id);
    fs.mkdirSync(path.join(dir, "photos"), { recursive: true });
    const metadata = {
      case_id: row.case_id,
      unit_id: row.unit_id,
      order_id: row.order_id,
      product_slot: row.product_slot,
      assigned_name: row.assigned_name,
      assigned_email: row.assigned_email,
      status: row.status,
      order_id_meaning: "Synthetic collection identifier unless a real order was written by the contributor.",
      photo_bytes: "NOT_DOWNLOADED",
      photo_slots: PHOTO_SLOTS.map((photo) => photo.folder),
    };
    fs.writeFileSync(path.join(dir, "metadata.json"), JSON.stringify(metadata, null, 2));
    manifest.push([row.case_id, row.unit_id, row.order_id, row.product_slot, row.assigned_name, row.status, "NOT_DOWNLOADED"].join(","));
    photoDest(dest, row.case_id, "01 — FRONT", "placeholder.jpg");
  }
  fs.writeFileSync(path.join(dest, "manifest.csv"), manifest.join("\n") + "\n");
  fs.writeFileSync(
    path.join(dest, "README.md"),
    "Photo bytes are not in this export. Google Drive file download is a separate step. This manifest does not invent images or labels.\n"
  );
  return [`wrote ${dest}`, "photo bytes: NOT_DOWNLOADED"];
}
