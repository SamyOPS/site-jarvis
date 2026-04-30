export type ProProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  professional_status: string | null;
  company_name: string | null;
};

export type ProStatus =
  | { type: "idle" }
  | { type: "error"; message: string }
  | { type: "success"; message: string };

export type ProJobOffer = {
  id: string;
  title: string;
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
  company_name: string | null;
  published_at: string | null;
};

export type ProOfferFormState = {
  title: string;
  description: string;
  location: string;
  contract_type: string;
  department: string;
  work_mode: string;
  experience_level: string;
  salary_min: string;
  salary_max: string;
  tech_stack: string;
};

export type ProOfferEditFormState = ProOfferFormState & {
  company_name: string;
};
