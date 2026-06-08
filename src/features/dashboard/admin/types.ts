export type AdminProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  professional_status: string | null;
  company_name: string | null;
};

export type AdminJobOffer = {
  id: string;
  title: string;
  company_name: string | null;
  status: string | null;
  location: string | null;
  contract_type: string | null;
  description: string | null;
  department: string | null;
  work_mode: string | null;
  experience_level: string | null;
  salary_min: number | null;
  salary_max: number | null;
  tech_stack: string[] | null;
  published_at: string | null;
};

export type AdminStatus =
  | { type: "idle" }
  | { type: "error"; message: string }
  | { type: "success"; message: string };

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

export type AdminOfferFormState = {
  title: string;
  description: string;
  location: string;
  contract_type: string;
  company_name: string;
  department: string;
  work_mode: string;
  experience_level: string;
  salary_min: string;
  salary_max: string;
  tech_stack: string;
};

export type AdminOfferEditFormState = AdminOfferFormState & {
  status: string;
};
