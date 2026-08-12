/**
 * Formats acceptes pour un document RH ou salarie.
 *
 * Aligne sur ce que proposent les champs de depot du tableau de bord
 * (`accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"`). Les routes ne validaient rien : n'importe
 * quel fichier, de n'importe quelle taille, etait accepte et son `contentType` repris tel
 * quel du navigateur — un .html deposé puis ouvert via URL signee s'executait dans le
 * domaine du storage.
 */
export const ALLOWED_DOCUMENT_EXTENSIONS = new Set(["pdf", "png", "jpg", "jpeg", "doc", "docx"]);

export const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Renvoie un message d'erreur, ou null si le fichier est acceptable.
 *
 * L'extension fait foi : `file.type` vient du navigateur et n'est pas fiable. Il est
 * neanmoins refuse s'il est renseigne et hors liste, pour ne pas stocker un contentType
 * arbitraire que le storage renverrait ensuite au telechargement.
 */
export function validateDocumentFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_DOCUMENT_EXTENSIONS.has(extension)) {
    return "Format non autorise. Formats acceptes : PDF, PNG, JPG, DOC, DOCX.";
  }
  if (file.type && !ALLOWED_DOCUMENT_MIME_TYPES.has(file.type)) {
    return "Type de fichier non autorise.";
  }
  if (file.size === 0) {
    return "Fichier vide.";
  }
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return "Fichier trop volumineux. Taille maximale : 10 Mo.";
  }
  return null;
}

/** Type MIME sur pour le storage : celui du navigateur seulement s'il est dans la liste. */
export function safeDocumentContentType(file: File) {
  return file.type && ALLOWED_DOCUMENT_MIME_TYPES.has(file.type) ? file.type : undefined;
}

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
