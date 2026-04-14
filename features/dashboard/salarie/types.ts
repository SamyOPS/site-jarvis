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

export type CraEntryDraft = {
  workDate: string;
  dayQuantity: string;
  label: string;
};

export type CraCalendarCell = {
  isoDate: string | null;
  dayNumber: number | null;
};
