export type DocumentStatus = "pending" | "validated" | "rejected";

export function normalizeJoinOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function formatDate(value: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleDateString("fr-FR");
}

export function formatMonth(value: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "-"
    : parsed.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export function formatDocumentStatus(value: DocumentStatus) {
  if (value === "validated") return "Valide";
  if (value === "rejected") return "Refuse";
  return "En attente";
}
