import fs from "fs";
import os from "os";
import path from "path";
import { DriveClient, DriveItem } from "../collection/drive";
import { sanitizeUploadName, slot } from "../collection/model";
import { createCollection, assignProduct, ensureRegistries, exportDataset, collectionPaths, publishRootLink } from "../collection/operations";
import { planAssignment, ROOT_LINK_PERMISSION } from "../collection/permissions";
import { emptyRegistries } from "../collection/registry";
import { parseCsv } from "../collection/csv";
import { collectionPlan, expectedFolderCount } from "../collection/tree";
import { photoDest } from "../collection/exportPaths";
import { validateCollection } from "../collection/validate";

class MemoryDrive implements DriveClient {
  next = 1;
  items: { id: string; name: string; parent: string | null; kind: "folder" | "doc"; body?: string }[] = [];
  limited = new Set<string>();
  grants: string[] = [];
  anyone = false;
  failLimited = false;

  async findChild(parentId: string | null, name: string, kind: "folder" | "doc") {
    return this.items.find((item) => item.parent === parentId && item.name === name && item.kind === kind) ?? null;
  }
  async createFolder(parentId: string | null, name: string) {
    return this.add(parentId, name, "folder");
  }
  async createDoc(parentId: string, name: string, text: string) {
    const item = this.add(parentId, name, "doc");
    item.body = text;
    return item;
  }
  async setLimitedAccess(fileId: string): Promise<"set" | "NOT_VERIFIABLE"> {
    if (this.failLimited) return "NOT_VERIFIABLE";
    this.limited.add(fileId);
    return "set";
  }
  async grantWriter(fileId: string, email: string) {
    this.grants.push(`${fileId}:${email}`);
  }
  async revokeEmail() {}
  async shareAnyoneReader() {
    this.anyone = true;
  }
  async shareAnyoneWriter() {
    this.anyone = true;
  }
  async clearLimitedAccess(fileId: string): Promise<"cleared" | "NOT_VERIFIABLE"> {
    this.limited.delete(fileId);
    return "cleared";
  }
  async listPermissions() {
    return "NOT_VERIFIABLE" as const;
  }
  async listChildren() {
    return "NOT_VERIFIABLE" as const;
  }
  async getLimitedAccess(fileId: string) {
    return this.limited.has(fileId);
  }
  private add(parent: string | null, name: string, kind: "folder" | "doc"): DriveItem & { parent: string | null; kind: "folder" | "doc"; body?: string } {
    const item = { id: `id-${this.next++}`, name, parent, kind, mimeType: kind };
    this.items.push(item);
    return item;
  }
}

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "rtn-collection-"));
}

describe("collection structure", () => {
  it("plans 50 product slots and stable names", () => {
    const folders = collectionPlan().filter((node) => node.kind === "folder");
    expect(expectedFolderCount()).toBe(folders.length);
    expect(folders.filter((node) => node.limitedAccess)).toHaveLength(50);
    expect(slot(1).folderName).toBe("01 — PRODUCT 01");
    expect(slot(50)).toMatchObject({ caseId: "RTN-050", unitId: "UNIT-050", orderId: "ORD-050", folderName: "50 — PRODUCT 50" });
    expect(folders.filter((node) => node.name === "01 — FRONT")).toHaveLength(50);
    const details = collectionPlan().find((node) => node.name === "PRODUCT DETAILS" && node.path.startsWith("01 — PRODUCT 01"));
    expect(details?.body).toContain("Write UNKNOWN");
    expect(details?.body).not.toContain("RESTOCK");
  });

  it("creates the tree once and reuses it on the second run", async () => {
    const root = tempRoot();
    const drive = new MemoryDrive();
    await createCollection(drive, false, root);
    const first = drive.items.length;
    await createCollection(drive, false, root);
    expect(drive.items.length).toBe(first);
    expect(drive.limited.size).toBe(50);
    expect(drive.anyone).toBe(false);
    const state = JSON.parse(fs.readFileSync(collectionPaths(root).state, "utf8"));
    expect(state.limitedAccess).toBe("enabled");
    await publishRootLink(drive, false, root);
    expect(drive.anyone).toBe(true);
  });

  it("does not publish the root link when limited access cannot be set", async () => {
    const root = tempRoot();
    const drive = new MemoryDrive();
    drive.failLimited = true;
    const lines = await createCollection(drive, false, root);
    expect(drive.anyone).toBe(false);
    expect(lines.join("\n")).toContain("NOT shared");
    await expect(publishRootLink(drive, false, root)).rejects.toThrow(/Refusing to share the root/);
  });

  it("dry-run creates nothing", async () => {
    const drive = new MemoryDrive();
    const lines = await createCollection(drive, true, tempRoot());
    expect(drive.items).toHaveLength(0);
    expect(lines[0]).toMatch(/would create/);
  });
});

describe("assignments and validation", () => {
  it("writes 50 unassigned registry rows and rejects a bad email or a second slot", async () => {
    const root = tempRoot();
    ensureRegistries(root, "2026-09-29T00:00:00Z");
    const rows = parseCsv(fs.readFileSync(collectionPaths(root).assignments, "utf8"));
    expect(rows).toHaveLength(50);
    expect(rows.every((row) => row.status === "UNASSIGNED")).toBe(true);
    expect(emptyRegistries("t").cases).toContain("RTN-001,UNIT-001,ORD-001");
    expect(() => planAssignment("RTN-001", "not-an-email", "Deepika")).toThrow(/email/);
    const drive = new MemoryDrive();
    await createCollection(drive, false, root);
    await assignProduct(drive, "RTN-001", "deepika@example.com", "Deepika", false, root);
    await expect(assignProduct(drive, "RTN-002", "deepika@example.com", "Deepika", false, root)).rejects.toThrow(/already assigned/);
    const dry = await assignProduct(null, "RTN-003", "akshita@example.com", "Akshita", true, root);
    expect(dry[0]).toBe("DRY RUN");
    expect(dry.join("\n")).toContain("The root folder is not made editable.");
    expect(ROOT_LINK_PERMISSION).toEqual({ type: "anyone", role: "reader" });
    expect(drive.grants.some((grant) => grant.endsWith("akshita@example.com"))).toBe(false);
  });

  it("marks missing required photos incomplete and an empty condition slot optional", () => {
    const assignments = [{ case_id: "RTN-001", status: "ASSIGNED", submitted_at: "", assigned_email: "a@b.co" }];
    const items = [
      { name: "00 — STATUS", kind: "file" as const },
      { name: "01 — PRODUCT DETAILS", kind: "folder" as const },
      { name: "PRODUCT DETAILS", kind: "file" as const },
      { name: "02 — PHOTOS", kind: "folder" as const },
      { name: "01 — FRONT", kind: "folder" as const },
      { name: "01 — FRONT/front.jpg", kind: "file" as const },
      { name: "02 — BACK", kind: "folder" as const },
      { name: "02 — BACK/back.jpg", kind: "file" as const },
      { name: "03 — IDENTIFICATION", kind: "folder" as const },
      { name: "03 — IDENTIFICATION/label.jpg", kind: "file" as const },
      { name: "04 — ACCESSORIES", kind: "folder" as const },
      { name: "04 — ACCESSORIES/cable.jpg", kind: "file" as const },
      { name: "05 — CONDITION", kind: "folder" as const },
    ];
    const ready = validateCollection(["01 — PRODUCT 01"], [{ caseId: "RTN-001", items }], assignments);
    expect(ready.slots[0].photos.condition).toBe("OPTIONAL_EMPTY");
    expect(ready.slots[0].status).toBe("READY");
    const missing = validateCollection(
      ["01 — PRODUCT 01"],
      [{ caseId: "RTN-001", items: items.filter((item) => !item.name.startsWith("01 — FRONT/")) }],
      assignments
    );
    expect(missing.slots[0].status).toBe("INCOMPLETE");
    const dup = validateCollection(
      ["01 — PRODUCT 01", "01 — PRODUCT 01"],
      [{
        caseId: "RTN-001",
        items: [...items, { name: "01 — FRONT/front-2.jpg", kind: "file" }],
      }],
      assignments
    );
    expect(dup.duplicateFolders).toContain("01 — PRODUCT 01");
    expect(dup.slots[0].photos.front).toBe("DUPLICATE");
  });
});

describe("export safety", () => {
  it("rejects path escape and writes no photo bytes", () => {
    expect(() => sanitizeUploadName("../../Product-02/photo.jpg")).not.toThrow();
    expect(sanitizeUploadName("../../Product-02/photo.jpg")).toBe("photo.jpg");
    expect(() => sanitizeUploadName("..")).toThrow(/rejected/);
    const root = tempRoot();
    ensureRegistries(root);
    const dest = path.join(root, "out");
    const lines = exportDataset(dest, root);
    expect(lines.join(" ")).toContain("NOT_DOWNLOADED");
    expect(fs.existsSync(path.join(dest, "cases", "RTN-001", "metadata.json"))).toBe(true);
    expect(fs.readdirSync(path.join(dest, "cases", "RTN-001", "photos"))).toHaveLength(0);
    expect(() => photoDest(dest, "RTN-001", "01 — FRONT", "../RTN-002/secret.jpg")).not.toThrow();
    const target = photoDest(dest, "RTN-001", "01 — FRONT", "../RTN-002/secret.jpg");
    expect(target.startsWith(path.resolve(dest))).toBe(true);
    expect(target.includes(`${path.sep}RTN-002${path.sep}`)).toBe(false);
  });
});
