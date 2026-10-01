import { PHOTO_SLOTS, PlannedNode, ROOT_NAME, Slot, allSlots } from "./model";
import { productDetails, readmeDoc, statusDoc } from "./templates";

export function collectionPlan(): PlannedNode[] {
  const nodes: PlannedNode[] = [
    { path: "", name: ROOT_NAME, parentPath: null, kind: "folder", limitedAccess: false },
    { path: "00 — READ ME FIRST", name: "00 — READ ME FIRST", parentPath: "", kind: "doc", body: readmeDoc(), limitedAccess: false },
  ];
  for (const item of allSlots()) nodes.push(...productPlan(item));
  return nodes;
}

export function productPlan(item: Slot): PlannedNode[] {
  const root = item.folderName;
  const photos = `${root}/02 — PHOTOS`;
  const details = `${root}/01 — PRODUCT DETAILS`;
  const nodes: PlannedNode[] = [
    { path: root, name: item.folderName, parentPath: "", kind: "folder", limitedAccess: true },
    { path: `${root}/00 — STATUS`, name: "00 — STATUS", parentPath: root, kind: "doc", body: statusDoc(item), limitedAccess: false },
    { path: details, name: "01 — PRODUCT DETAILS", parentPath: root, kind: "folder", limitedAccess: false },
    {
      path: `${details}/PRODUCT DETAILS`,
      name: "PRODUCT DETAILS",
      parentPath: details,
      kind: "doc",
      body: productDetails(item),
      limitedAccess: false,
    },
    { path: photos, name: "02 — PHOTOS", parentPath: root, kind: "folder", limitedAccess: false },
  ];
  for (const photo of PHOTO_SLOTS) {
    nodes.push({
      path: `${photos}/${photo.folder}`,
      name: photo.folder,
      parentPath: photos,
      kind: "folder",
      limitedAccess: false,
    });
  }
  return nodes;
}

export function expectedFolderCount(): number {
  return collectionPlan().filter((node) => node.kind === "folder").length;
}
