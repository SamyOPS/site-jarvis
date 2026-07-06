import type { RhDocumentRow } from "@/features/dashboard/rh/types";

export function matchesRhDocumentFilters(
  document: Pick<RhDocumentRow, "typeLabel" | "periodMonth" | "status" | "uploadedByName" | "employeeName">,
  filters: { type: string; period: string; status: string; creator: string },
  options?: { creatorField?: "uploadedByName" | "employeeName" },
) {
  const creatorField = options?.creatorField ?? "uploadedByName";
  if (filters.type !== "all" && document.typeLabel !== filters.type) return false;
  if (filters.period !== "all" && (document.periodMonth ?? "__none__") !== filters.period) return false;
  if (filters.status !== "all" && document.status !== filters.status) return false;
  if (filters.creator !== "all" && document[creatorField] !== filters.creator) return false;
  return true;
}
