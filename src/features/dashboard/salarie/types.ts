import type { DocumentStatus } from "@/lib/dashboard-formatters";

export type SalarieProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  professional_status: string | null;
};

export type SalarieRequestStatus =
  | "pending"
  | "uploaded"
  | "validated"
  | "rejected"
  | "expired"
  | "cancelled";

export type SalarieDocumentTypeRow = {
  id: string;
  label: string;
  requiresPeriod: boolean;
  allowedUploaderRoles: string[];
};

export type SalarieRequestRow = {
  id: string;
  documentTypeId: string;
  status: SalarieRequestStatus;
  dueAt: string | null;
  periodMonth: string | null;
  note: string | null;
  typeLabel: string;
};

export type SalarieDocumentRow = {
  id: string;
  documentTypeId: string;
  folderId: string | null;
  folderDeletedAt: string | null;
  deletedAt: string | null;
  uploaderRole: string | null;
  status: DocumentStatus;
  uploadedByName: string;
  fileName: string;
  createdAt: string | null;
  updatedAt: string | null;
  periodMonth: string | null;
  sizeBytes: number | null;
  reviewComment: string | null;
  typeLabel: string;
  storageBucket: string;
  storagePath: string;
};

export type DocumentFolderRow = {
  id: string;
  ownerUserId: string;
  name: string;
  parentId: string | null;
  deletedAt?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CraSummaryRow = {
  id: string;
  period_month: string;
  status: string;
  worked_days_count: number;
  pdf_version: number;
  employee_document_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CraEntryDraft = {
  workDate: string;
  /**
   * Mission (entreprise cliente) a laquelle la ligne est imputee. Forme avec `workDate`
   * la cle d'une entree : une meme journee peut porter plusieurs entreprises.
   * Vide pour les CRA anterieurs au multi-entreprises.
   */
  missionId: string;
  /** Quantite en journees. Vide pour une mission facturee a l'heure. */
  dayQuantity: string;
  /** Quantite en heures. Vide pour une mission facturee au jour. */
  hours: string;
  label: string;
};

/** Identifie une entree de CRA : une journee pour une entreprise donnee. */
export const craEntryKey = (entry: { workDate: string; missionId: string }) =>
  `${entry.workDate}|${entry.missionId}`;

/** Unite de saisie du CRA, portee par la mission (a defaut par le profil de facturation). */
export type CraTimeUnit = "day" | "hour";


export type CraLeaveDaysDraft = {
  paid: string;
  sick: string;
  exceptional: string;
  unpaid: string;
};

export const emptyCraLeaveDays = (): CraLeaveDaysDraft => ({
  paid: "",
  sick: "",
  exceptional: "",
  unpaid: "",
});

export type CraCalendarCell = {
  isoDate: string | null;
  dayNumber: number | null;
};

type DocumentsListItemBase = {
  id: string;
  fileName: string;
  typeLabel: string;
  statusLabel?: string | null;
  periodLabel?: string | null;
  ownerName: string;
  createdAt: string | null;
  sizeBytes: number | null;
  subtitle?: string | null;
  details?: string | null;
  hideDetailsPanel?: boolean;
};

export type SalarieDocumentsListItem =
  | (DocumentsListItemBase & { rowType: "folder"; folderId: string })
  | (DocumentsListItemBase & { rowType: "document"; document: SalarieDocumentRow });
