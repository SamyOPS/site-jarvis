import type { ColumnKey, DashboardDocumentListItem } from "./columns";

export function formatCreatedDate(value: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  return parsed.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatFileSize(value: number | null) {
  if (!value || value <= 0) return "—";

  const units = ["o", "Ko", "Mo", "Go"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const digits = size >= 10 || unitIndex === 0 ? 0 : 1;
  return `${size.toLocaleString("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} ${units[unitIndex]}`;
}

export function formatActionDetails(details: string | null | undefined) {
  if (!details) return null;

  return details.replace(/^Commentaire RH\s*:\s*/i, "").trim() || null;
}

export function getStatusBadgeClass(statusLabel: string | null | undefined) {
  const normalized = (statusLabel ?? "").trim().toLowerCase();

  if (
    normalized.includes("valide") ||
    normalized.includes("validé") ||
    normalized.includes("validated")
  ) {
    return "bg-emerald-100 text-emerald-700";
  }

  if (
    normalized.includes("refuse") ||
    normalized.includes("refusé") ||
    normalized.includes("rejected")
  ) {
    return "bg-rose-100 text-rose-700";
  }

  if (
    normalized.includes("en attente") ||
    normalized.includes("pending")
  ) {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-slate-100 text-[#0A1A2F]/75";
}

export function getHiddenColumnValues<T extends DashboardDocumentListItem>(
  item: T,
  visibleColumns: ColumnKey[],
) {
  const values: string[] = [];

  if (!visibleColumns.includes("type") && item.typeLabel) {
    values.push(item.typeLabel);
  }
  if (!visibleColumns.includes("status") && item.statusLabel) {
    values.push(item.statusLabel);
  }
  if (!visibleColumns.includes("period") && item.periodLabel && item.periodLabel !== "-") {
    values.push(item.periodLabel);
  }
  if (!visibleColumns.includes("owner") && item.ownerName) {
    values.push(item.ownerName);
  }
  if (!visibleColumns.includes("createdAt")) {
    const createdAt = formatCreatedDate(item.createdAt);
    if (createdAt !== "-") {
      values.push(createdAt);
    }
  }
  if (!visibleColumns.includes("size")) {
    const fileSize = formatFileSize(item.sizeBytes);
    if (fileSize !== "—") {
      values.push(fileSize);
    }
  }

  return values;
}

export function getFileExtension(fileName: string) {
  const segments = fileName.toLowerCase().split(".");
  return segments.length > 1 ? segments.at(-1) ?? "" : "";
}
