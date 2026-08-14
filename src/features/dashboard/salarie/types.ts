import type {
  DocumentListItem,
  DocumentRequestStatus,
  DocumentStatus,
} from "@/domain/documents";

export type SalarieRequestRow = {
  id: string;
  documentTypeId: string;
  status: DocumentRequestStatus;
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

export type SalarieDocumentsListItem =
  | (DocumentListItem & { rowType: "folder"; folderId: string })
  | (DocumentListItem & { rowType: "document"; document: SalarieDocumentRow });
