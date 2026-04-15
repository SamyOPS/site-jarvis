import type { DocumentStatus } from "@/lib/dashboard-formatters";

export type RhProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  professional_status: string | null;
  employment_status: "active" | "inactive" | "exited" | null;
  company_name: string | null;
  esn_partenaire: string | null;
};

export type RhRequestStatus =
  | "pending"
  | "uploaded"
  | "validated"
  | "rejected"
  | "expired"
  | "cancelled";

export type RhDocumentTypeRow = {
  id: string;
  label: string;
  requiresPeriod: boolean;
  allowedUploaderRoles: string[];
};

export type RhDocumentRow = {
  id: string;
  employeeId: string;
  folderId: string | null;
  deletedAt: string | null;
  employeeRole: string | null;
  documentTypeId: string;
  documentTypeCode: string;
  uploaderRole: string;
  uploadedByName: string;
  employeeName: string;
  fileName: string;
  status: DocumentStatus;
  periodMonth: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  sizeBytes: number | null;
  reviewComment: string | null;
  typeLabel: string;
  storageBucket: string;
  storagePath: string;
  sourceKind: string;
};

export type RhDocumentFolderRow = {
  id: string;
  ownerUserId: string;
  name: string;
  parentId: string | null;
  deletedAt?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type RhRequestRow = {
  id: string;
  employeeId: string;
  documentTypeId: string;
  employeeName: string;
  status: RhRequestStatus;
  dueAt: string | null;
  periodMonth: string | null;
  note: string | null;
  typeLabel: string;
};

export type RhEventRow = {
  id: string;
  employeeId: string;
  createdAt: string;
  eventType: string;
  actorName: string;
  documentLabel: string;
};

export type RhJobOfferRow = {
  id: string;
  title: string;
  status: "draft" | "published" | "archived";
  location: string | null;
};

export type RhApplicationRow = {
  id: string;
  candidateId: string;
  status: "submitted" | "reviewed" | "rejected" | "accepted";
  jobTitle: string;
  candidateName: string;
};

export type RhProfileCvRow = {
  user_id: string;
  file_name: string | null;
};
