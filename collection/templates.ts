import { PHOTO_SLOTS, Slot } from "./model";
import { contributorReadme } from "./contributorText";

export function productDetails(item: Slot): string {
  return `CUBE 2026 — RTN PRODUCT COLLECTION
PRODUCT ${item.folderName.slice(0, 2)}

IMPORTANT:

This folder is for ONE physical product only.

Please enter information about the actual product you currently have with you.

Do not use internet images.
Do not use AI-generated images.
Do not edit photographs to hide or create damage.

Internal collection identifiers (already assigned — do not change them):
Case ID: ${item.caseId}
Unit ID: ${item.unitId}
Order ID: ${item.orderId}

Order ID is a synthetic collection label. It is not a real Amazon order unless you write a real order id in the notes. If you do not know the SKU or ASIN, write UNKNOWN. Never invent one.

------------------------------------------------------------
A. PERSON PROVIDING THE PRODUCT
------------------------------------------------------------

Name:

Relationship:
Friend / Classmate / Family / Other

------------------------------------------------------------
B. PRODUCT INFORMATION
------------------------------------------------------------

Product Name:

Brand:

Exact Model:

Variant / Storage / Size / Colour:

SKU:
Write UNKNOWN if you do not know it.

ASIN:
Write UNKNOWN if you do not know it.

------------------------------------------------------------
C. COMPONENTS
------------------------------------------------------------

What normally belongs with this product?

List the components/accessories you know are normally included.

Example:
Phone
USB-C cable
Power adapter
Box
Documentation

What are you actually providing?

List exactly what you are providing photographs of.

Is anything missing?

YES / NO / NOT SURE

If yes, what is missing?

------------------------------------------------------------
D. VISIBLE PHYSICAL CONDITION
------------------------------------------------------------

Visible condition:

No visible damage
Minor visible wear
Visible damage
Significant visible damage
Not sure

Describe only what is physically visible.

Do not guess internal faults or functionality.

------------------------------------------------------------
E. PHOTO CHECK
------------------------------------------------------------

Upload photographs into 02 — PHOTOS.

01 — FRONT
Take one clear photo of the front/main side of the physical product.

02 — BACK
Take one clear photo of the back.

03 — IDENTIFICATION
Take a clear photo showing useful physical identification information such as model marking, label, branding, ports, shape, or other physical identifiers. Do not intentionally capture unnecessary personal information.

04 — ACCESSORIES
Place all components and accessories you are providing together and photograph them clearly.

05 — CONDITION
Take a close-up of visible scratches, cracks, dents, broken parts, or worn cables. Leave this folder empty if there is genuinely nothing useful to photograph.

Do not choose restock, refurbish, liquidate, or dispose.
Do not decide the evaluation result.
You are only recording the physical product and facts you can see.
`;
}

export function statusDoc(item: Slot): string {
  return `CUBE 2026 — PRODUCT ${item.folderName.slice(0, 2)}

Case ID:
${item.caseId}

Unit ID:
${item.unitId}

Order ID:
${item.orderId}

Order ID is internal collection metadata. It is not a real Amazon order.

Assigned To:
____________

Assigned Email:
____________

STATUS:
UNASSIGNED

DETAILS:
[ ] Product details completed

PHOTOS:
${PHOTO_SLOTS.map((photo) => `[ ] ${photo.folder}${photo.required ? "" : " (optional)"}`).join("\n")}

VALIDATION:
[ ] Required information present
[ ] Required photos present
[ ] No obvious duplicate
[ ] Ready for import

An empty folder is not a completed submission.
`;
}

export function readmeDoc(): string {
  return contributorReadme();
}
