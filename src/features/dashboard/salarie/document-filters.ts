import type { SalarieDocumentRow } from "@/features/dashboard/salarie/types";

export function matchesSalarieDocumentFilters(
  document: Pick<SalarieDocumentRow, "typeLabel" | "periodMonth" | "status">,
  filters: { type: string; period: string; status: string },
) {
  if (filters.type !== "all" && document.typeLabel !== filters.type) return false;
  if (filters.period !== "all" && (document.periodMonth ?? "__none__") !== filters.period) return false;
  if (filters.status !== "all" && document.status !== filters.status) return false;
  return true;
}
