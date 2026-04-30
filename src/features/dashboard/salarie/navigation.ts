export type SalarieDashboardSection =
  | "overview"
  | "documents"
  | "offres"
  | "parametres";

export type SalarieDashboardSubSection =
  | "offres_toutes"
  | "candidatures"
  | "cvs"
  | "docs_tous"
  | "docs_a_deposer"
  | "docs_cra_facture"
  | "docs_corbeille";

export type SalarieWorkspaceRouteProps = {
  currentSection: SalarieDashboardSection;
  currentSubSection: SalarieDashboardSubSection;
};

export const SALARIE_WORKSPACE_ROUTES = {
  overview: {
    currentSection: "overview",
    currentSubSection: "offres_toutes",
  },
  documents: {
    currentSection: "documents",
    currentSubSection: "docs_tous",
  },
  documentsADeposer: {
    currentSection: "documents",
    currentSubSection: "docs_a_deposer",
  },
  documentsCraFacture: {
    currentSection: "documents",
    currentSubSection: "docs_cra_facture",
  },
  documentsCorbeille: {
    currentSection: "documents",
    currentSubSection: "docs_corbeille",
  },
  offres: {
    currentSection: "offres",
    currentSubSection: "offres_toutes",
  },
  candidatures: {
    currentSection: "offres",
    currentSubSection: "candidatures",
  },
  cvs: {
    currentSection: "offres",
    currentSubSection: "cvs",
  },
  parametres: {
    currentSection: "parametres",
    currentSubSection: "offres_toutes",
  },
} satisfies Record<string, SalarieWorkspaceRouteProps>;
