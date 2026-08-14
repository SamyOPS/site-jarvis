import type { JobOfferFormState } from "@/domain/offers";
import type { ProfileRow } from "@/domain/profiles";

export type AdminProfileRow = ProfileRow & {
  company_name: string | null;
};

export type AdminAssignmentUser = {
  id: string;
  email: string;
  full_name: string | null;
};

export type AdminRhAssignmentsByRh = Record<string, string[]>;

export type AdminDocumentType = {
  id: string;
  label: string;
  code: string | null;
};

// rhId -> employeeId -> allowed document type ids.
// An empty (or missing) array means no restriction: all document types allowed.
export type AdminRhTypeRestrictionsByRh = Record<string, Record<string, string[]>>;

// employeeId -> allowed document type ids, for the currently selected RH.
export type AdminRhTypeRestrictions = Record<string, string[]>;

export type AdminUserActivityRow = {
  userId: string;
  lastSignInAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  emailConfirmedAt: string | null;
};

export type AdminOfferEditFormState = JobOfferFormState & {
  status: string;
};
