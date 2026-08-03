import type { SalarieDocumentRow } from "@/features/dashboard/salarie/types";

export function normalizeDocumentLabel(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * Les libelles de type de document viennent de la table `document_types`, la
 * denomination exacte peut donc varier ("Fiche de paie", "Bulletin de salaire"...).
 * On reconnait la famille "paie" plutot qu'un libelle unique.
 */
export function isPayslipDocumentLabel(value: string) {
  const normalizedLabel = normalizeDocumentLabel(value);
  return (
    normalizedLabel.includes("paie") ||
    normalizedLabel.includes("paye") ||
    normalizedLabel.includes("bulletin") ||
    normalizedLabel.includes("salaire")
  );
}

export function matchesSalarieDocumentFilters(
  document: Pick<SalarieDocumentRow, "typeLabel" | "periodMonth" | "status">,
  filters: { type: string; period: string; status: string },
) {
  if (filters.type !== "all" && document.typeLabel !== filters.type) return false;
  if (filters.period !== "all" && (document.periodMonth ?? "__none__") !== filters.period) return false;
  if (filters.status !== "all" && document.status !== filters.status) return false;
  return true;
}
