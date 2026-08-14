import type { JobOfferFormState } from "@/domain/offers";
import type { ProfileRow } from "@/domain/profiles";

export type ProProfileRow = ProfileRow & {
  company_name: string | null;
};

/** En creation, le pro ne saisit pas l'entreprise : c'est la sienne. */
export type ProOfferFormState = Omit<JobOfferFormState, "company_name">;
