export function sanitizeFileName(fileName: string) {
  const trimmed = fileName.trim().toLowerCase();
  const parts = trimmed.split(".");
  const extension = parts.length > 1 ? parts.pop() ?? "" : "";
  const base = parts.join(".") || trimmed;

  const safeBase = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  const safeExtension = extension.replace(/[^a-z0-9]/g, "").slice(0, 10);
  return safeExtension ? `${safeBase || "document"}.${safeExtension}` : safeBase || "document";
}

export function formatPeriodKey(periodMonth: string | null) {
  if (!periodMonth) return "no-period";
  const parsed = new Date(periodMonth);
  if (Number.isNaN(parsed.getTime())) return "no-period";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function buildEmployeeDocumentPath(args: {
  employeeId: string;
  documentTypeId: string;
  periodMonth: string | null;
  fileName: string;
}) {
  const timestamp = Date.now();
  const safeName = sanitizeFileName(args.fileName);
  const periodKey = formatPeriodKey(args.periodMonth);
  return `${args.employeeId}/${args.documentTypeId}/${periodKey}/${timestamp}-${safeName}`;
}
