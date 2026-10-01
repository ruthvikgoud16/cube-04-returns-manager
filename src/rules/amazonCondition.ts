/**
 * Names and source for Amazon's published Used condition grades.
 * The page mixes function ("fully functions") with appearance.
 * Photographs can support appearance only. Function that is not visible
 * is recorded as not observable, never as a passing grade.
 */
export const AMAZON_CONDITION_SOURCE =
  "https://www.amazon.com/gp/help/customer/display.html?nodeId=201889720";

export const AMAZON_USED_GRADES = [
  "used_like_new",
  "used_very_good",
  "used_good",
  "used_acceptable",
] as const;

export type AmazonGrade = (typeof AMAZON_USED_GRADES)[number] | "unknown";

export const GRADE_LABEL: Record<AmazonGrade, string> = {
  used_like_new: "Used - Like New",
  used_very_good: "Used - Very Good",
  used_good: "Used - Good",
  used_acceptable: "Used - Acceptable",
  unknown: "Unknown",
};

export const OBSERVED_STATES = [
  "factory_sealed",
  "opened_unused",
  "signs_of_use",
  "damaged",
  "empty_box",
  "uncertain",
] as const;

export type ObservedState = (typeof OBSERVED_STATES)[number];
