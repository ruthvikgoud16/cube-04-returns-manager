import { execFileSync } from "child_process";
import { escapeDriveName } from "./model";
import { ROOT_LINK_PERMISSION } from "./permissions";

export interface DriveItem {
  id: string;
  name: string;
  mimeType?: string;
  inheritedPermissionsDisabled?: boolean;
}

export interface DrivePermission {
  id?: string;
  emailAddress?: string;
  role?: string;
  type?: string;
}

export interface DriveClient {
  findChild(parentId: string | null, name: string, kind: "folder" | "doc"): Promise<DriveItem | null>;
  createFolder(parentId: string | null, name: string): Promise<DriveItem>;
  createDoc(parentId: string, name: string, text: string): Promise<DriveItem>;
  setLimitedAccess(fileId: string): Promise<"set" | "NOT_VERIFIABLE">;
  clearLimitedAccess(fileId: string): Promise<"cleared" | "NOT_VERIFIABLE">;
  grantWriter(fileId: string, email: string): Promise<void>;
  revokeEmail(fileId: string, email: string): Promise<void>;
  shareAnyoneReader(fileId: string): Promise<void>;
  shareAnyoneWriter(fileId: string): Promise<void>;
  listPermissions(fileId: string): Promise<DrivePermission[] | "NOT_VERIFIABLE">;
  listChildren(parentId: string): Promise<DriveItem[] | "NOT_VERIFIABLE">;
  getLimitedAccess(fileId: string): Promise<boolean | "NOT_VERIFIABLE">;
}

const FOLDER = "application/vnd.google-apps.folder";
const DOC = "application/vnd.google-apps.document";

export class ComposioDrive implements DriveClient {
  async findChild(parentId: string | null, name: string, kind: "folder" | "doc"): Promise<DriveItem | null> {
    const mime = kind === "folder" ? FOLDER : DOC;
    const parent = parentId ? `'${parentId}' in parents and ` : "";
    const q = `${parent}name = '${escapeDriveName(name)}' and mimeType = '${mime}' and trashed = false`;
    const result = await execute("GOOGLEDRIVE_FIND_FILE", { q, pageSize: 10, supportsAllDrives: true });
    const files = filesOf(result);
    return files[0] ?? null;
  }

  async createFolder(parentId: string | null, name: string): Promise<DriveItem> {
    const result = await execute("GOOGLEDRIVE_CREATE_FOLDER", parentId ? { name, parent_id: parentId } : { name });
    const id = idOf(result);
    if (!id) throw new Error(`Drive did not return an id for folder ${name}`);
    return { id, name, mimeType: FOLDER };
  }

  async createDoc(parentId: string, name: string, text: string): Promise<DriveItem> {
    const result = await execute("GOOGLEDRIVE_CREATE_FILE_FROM_TEXT", {
      file_name: name,
      text_content: text,
      mime_type: DOC,
      parent_id: parentId,
    });
    const id = idOf(result);
    if (!id) throw new Error(`Drive did not return an id for document ${name}: ${JSON.stringify(result).slice(0, 300)}`);
    return { id, name, mimeType: DOC };
  }

  async setLimitedAccess(fileId: string): Promise<"set" | "NOT_VERIFIABLE"> {
    try {
      await proxy(
        `https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`,
        "PATCH",
        { inheritedPermissionsDisabled: true }
      );
      return "set";
    } catch {
      return "NOT_VERIFIABLE";
    }
  }

  async clearLimitedAccess(fileId: string): Promise<"cleared" | "NOT_VERIFIABLE"> {
    try {
      await proxy(
        `https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`,
        "PATCH",
        { inheritedPermissionsDisabled: false }
      );
      return "cleared";
    } catch {
      return "NOT_VERIFIABLE";
    }
  }

  async grantWriter(fileId: string, email: string): Promise<void> {
    await execute("GOOGLEDRIVE_CREATE_PERMISSION", {
      file_id: fileId,
      type: "user",
      role: "writer",
      email_address: email,
      send_notification_email: true,
    });
  }

  async revokeEmail(fileId: string, email: string): Promise<void> {
    const permissions = await this.listPermissions(fileId);
    if (permissions === "NOT_VERIFIABLE") throw new Error("NOT_VERIFIABLE: cannot list permissions to revoke");
    const match = permissions.find((item) => item.emailAddress?.toLowerCase() === email.toLowerCase());
    if (!match?.id) return;
    await proxy(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions/${match.id}`, "DELETE");
  }

  async shareAnyoneReader(fileId: string): Promise<void> {
    if (ROOT_LINK_PERMISSION.role !== "reader" || ROOT_LINK_PERMISSION.type !== "anyone") {
      throw new Error("root link must stay view-only");
    }
    await execute("GOOGLEDRIVE_CREATE_PERMISSION", {
      file_id: fileId,
      type: ROOT_LINK_PERMISSION.type,
      role: ROOT_LINK_PERMISSION.role,
    });
    const permissions = await this.listPermissions(fileId);
    if (permissions === "NOT_VERIFIABLE") return;
    const broadEditor = permissions.find((item) => item.type === "anyone" && item.role && item.role !== "reader");
    if (broadEditor?.id) {
      await proxy(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions/${broadEditor.id}`, "DELETE");
      throw new Error("root link was not left as view-only");
    }
  }

  async shareAnyoneWriter(fileId: string): Promise<void> {
    const existing = await this.listPermissions(fileId);
    if (existing !== "NOT_VERIFIABLE") {
      const current = existing.find((item) => item.type === "anyone");
      if (current?.role === "writer") return;
      if (current?.id) {
        await proxy(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions/${current.id}`, "DELETE");
      }
    }
    await execute("GOOGLEDRIVE_CREATE_PERMISSION", { file_id: fileId, type: "anyone", role: "writer" });
  }

  async listPermissions(fileId: string): Promise<DrivePermission[] | "NOT_VERIFIABLE"> {
    try {
      const result = await proxy(
        `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?fields=permissions(id,emailAddress,role,type)`,
        "GET"
      );
      const permissions = result.permissions ?? result.data?.permissions;
      return Array.isArray(permissions) ? permissions : "NOT_VERIFIABLE";
    } catch {
      return "NOT_VERIFIABLE";
    }
  }

  async listChildren(parentId: string): Promise<DriveItem[] | "NOT_VERIFIABLE"> {
    try {
      const result = await execute("GOOGLEDRIVE_FIND_FILE", {
        q: `'${parentId}' in parents and trashed = false`,
        pageSize: 100,
        supportsAllDrives: true,
      });
      return filesOf(result);
    } catch {
      return "NOT_VERIFIABLE";
    }
  }

  async getLimitedAccess(fileId: string): Promise<boolean | "NOT_VERIFIABLE"> {
    try {
      const result = await proxy(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,inheritedPermissionsDisabled&supportsAllDrives=true`,
        "GET"
      );
      if (typeof result.inheritedPermissionsDisabled === "boolean") return result.inheritedPermissionsDisabled;
      return "NOT_VERIFIABLE";
    } catch {
      return "NOT_VERIFIABLE";
    }
  }
}

function execute(slug: string, data: Record<string, unknown>): any {
  const stdout = execFileSync("composio", ["execute", slug, "-d", JSON.stringify(data)], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return parseJson(stdout);
}

function proxy(url: string, method: string, body?: unknown): any {
  const args = ["proxy", url, "--toolkit", "googledrive", "-X", method, "-H", "content-type: application/json"];
  if (body !== undefined) args.push("-d", JSON.stringify(body));
  const stdout = execFileSync("composio", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return parseJson(stdout);
}

function parseJson(stdout: string): any {
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error(stdout.slice(0, 400));
  return JSON.parse(stdout.slice(start, end + 1));
}

function idOf(result: any): string | undefined {
  const url = result?.display_url || result?.data?.display_url || result?.webViewLink || result?.data?.webViewLink || "";
  const fromUrl = String(url).match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
  return result?.id || result?.file_id || result?.data?.id || result?.data?.file_id || result?.data?.file?.id || fromUrl;
}

function filesOf(result: any): DriveItem[] {
  const files = result.files || result.data?.files || [];
  return Array.isArray(files) ? files : [];
}
