/**
 * Types metier partages. Regle : ce dossier ne doit importer AUCUN module du projet
 * (ni @/lib, ni @/features, ni @/components, ni @/app). TypeScript natif uniquement.
 */

/** Offre d'emploi telle que stockee en base. Identique pour l'admin et le pro. */
export type JobOffer = {
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

/**
 * Formulaire d'offre, dans sa forme la plus complete : tous les champs sont des chaines,
 * la conversion vers `JobOffer` se fait a la soumission. Les variantes par role se
 * derivent de ce socle (retrait ou ajout de champs), elles ne le recopient pas.
 */
export type JobOfferFormState = {
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
