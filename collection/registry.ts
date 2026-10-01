import { allSlots, Slot } from "./model";
import { Row, toCsv } from "./csv";

export const CASE_HEADERS = [
  "case_id",
  "unit_id",
  "order_id",
  "product_slot",
  "status",
  "assigned_to",
  "assigned_email",
  "created_at",
  "notes",
] as const;

export const ASSIGNMENT_HEADERS = [
  "case_id",
  "unit_id",
  "order_id",
  "product_slot",
  "assigned_name",
  "assigned_email",
  "status",
  "assigned_at",
  "submitted_at",
  "validated_at",
  "notes",
] as const;

export function emptyRegistries(now: string): { cases: string; assignments: string } {
  const cases: Row[] = allSlots().map((item) => rowFromSlot(item, now));
  const assignments: Row[] = allSlots().map((item) => ({
    case_id: item.caseId,
    unit_id: item.unitId,
    order_id: item.orderId,
    product_slot: item.productSlot,
    assigned_name: "",
    assigned_email: "",
    status: "UNASSIGNED",
    assigned_at: "",
    submitted_at: "",
    validated_at: "",
    notes: "Order ID is synthetic collection metadata, not a real Amazon order.",
  }));
  return {
    cases: toCsv([...CASE_HEADERS], cases),
    assignments: toCsv([...ASSIGNMENT_HEADERS], assignments),
  };
}

function rowFromSlot(item: Slot, now: string): Row {
  return {
    case_id: item.caseId,
    unit_id: item.unitId,
    order_id: item.orderId,
    product_slot: item.productSlot,
    status: "UNASSIGNED",
    assigned_to: "",
    assigned_email: "",
    created_at: now,
    notes: "Order ID is synthetic collection metadata, not a real Amazon order.",
  };
}

export function assignRow(rows: Row[], caseId: string, name: string, email: string, now: string): Row[] {
  const existing = rows.find((row) => row.case_id === caseId && row.status === "ASSIGNED" && row.assigned_email && row.assigned_email !== email);
  if (existing) {
    throw new Error(`${caseId} is already assigned to ${existing.assigned_email}`);
  }
  const claimed = rows.find((row) => row.assigned_email === email && row.case_id !== caseId && row.status === "ASSIGNED");
  if (claimed) {
    throw new Error(`${email} is already assigned to ${claimed.case_id}`);
  }
  return rows.map((row) =>
    row.case_id === caseId
      ? { ...row, assigned_name: name, assigned_to: name, assigned_email: email, status: "ASSIGNED", assigned_at: row.assigned_at || now }
      : row
  );
}

export function revokeRow(rows: Row[], caseId: string): Row[] {
  return rows.map((row) =>
    row.case_id === caseId
      ? {
          ...row,
          assigned_name: "",
          assigned_to: "",
          assigned_email: "",
          status: "UNASSIGNED",
          assigned_at: "",
          submitted_at: "",
          validated_at: "",
        }
      : row
  );
}
