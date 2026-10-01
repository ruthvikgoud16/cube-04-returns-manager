import { ComposioDrive } from "./drive";
import fs from "fs";
import { parseCsv } from "./csv";
import {
  assignProduct,
  collectionPaths,
  createCollection,
  ensureRegistries,
  exportDataset,
  loadState,
  publishRootLink,
  shareOneLink,
  revokeProduct,
  validateLive,
  verifyPermissions,
} from "./operations";

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const dryRun = rest.includes("--dry-run");
  const args = rest.filter((arg) => arg !== "--dry-run");
  const client = () => new ComposioDrive();
  if (command === "create") {
    console.log((await createCollection(client(), dryRun)).join("\n"));
    return;
  }
  if (command === "publish") {
    console.log((await publishRootLink(client(), dryRun)).join("\n"));
    return;
  }
  if (command === "share") {
    console.log((await shareOneLink(client(), dryRun)).join("\n"));
    return;
  }
  if (command === "list" || command === "status") {
    ensureRegistries();
    const rows = parseCsv(fs.readFileSync(collectionPaths().assignments, "utf8"));
    const state = loadState();
    console.log(state.rootUrl || "Drive root not created yet.");
    for (const row of rows) console.log(`${row.case_id}\t${row.product_slot}\t${row.status}\t${row.assigned_email || "-"}`);
    return;
  }
  if (command === "assign") {
    const [caseId, email, ...nameParts] = args;
    const name = nameParts.join(" ");
    if (!name) throw new Error("assigned name is required. Example: collection:assign -- RTN-001 person@example.com Deepika");
    console.log((await assignProduct(dryRun ? null : client(), caseId, email, name, dryRun)).join("\n"));
    return;
  }
  if (command === "revoke") {
    console.log((await revokeProduct(dryRun ? null : client(), args[0], dryRun)).join("\n"));
    return;
  }
  if (command === "validate") {
    console.log(await runOrOffline((drive) => validateLive(drive)));
    return;
  }
  if (command === "verify-permissions") {
    const text = await runOrOffline(async (drive) => (await verifyPermissions(drive)).join("\n"));
    console.log(text);
    return;
  }
  if (command === "export") {
    const dest = args[0] || "collection/export";
    console.log(exportDataset(dest).join("\n"));
    return;
  }
  throw new Error("Commands: create, publish, list, assign, revoke, status, validate, export, verify-permissions");
}

async function runOrOffline<T>(fn: (drive: ComposioDrive | null) => Promise<T>): Promise<T> {
  try {
    return await fn(new ComposioDrive());
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    console.error("Google Drive is not available. Result below is local only.");
    return fn(null);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
