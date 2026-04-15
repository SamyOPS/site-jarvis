export type RhDashboardSection =
  | "overview"
  | "collaborateurs"
  | "documents"
  | "offres"
  | "parametres";

export type RhDashboardSubSection =
  | "overview"
  | "collab_tous"
  | "collab_actifs"
  | "collab_inactifs"
  | "collab_detail"
  | "docs_all"
  | "docs_tous"
  | "docs_a_valider"
  | "docs_mes_demandes"
  | "docs_salaries"
  | "docs_corbeille"
  | "offres_actives"
  | "offres_candidatures"
  | "offres_archives"
  | "offres_creer";

export type RhWorkspaceRouteProps = {
  currentSection: RhDashboardSection;
  currentSubSection: RhDashboardSubSection;
  selectedEmployeeId?: string | null;
};

export const RH_WORKSPACE_ROUTES = {
  overview: {
    currentSection: "overview",
    currentSubSection: "overview",
  },
  collaborateurs: {
    currentSection: "collaborateurs",
    currentSubSection: "collab_tous",
  },
  collaborateursActifs: {
    currentSection: "collaborateurs",
    currentSubSection: "collab_actifs",
  },
  collaborateursInactifs: {
    currentSection: "collaborateurs",
    currentSubSection: "collab_inactifs",
  },
  documents: {
    currentSection: "documents",
    currentSubSection: "docs_all",
  },
  documentsTous: {
    currentSection: "documents",
    currentSubSection: "docs_all",
  },
  documentsAValider: {
    currentSection: "documents",
    currentSubSection: "docs_a_valider",
  },
  documentsMesDemandes: {
    currentSection: "documents",
    currentSubSection: "docs_mes_demandes",
  },
  documentsSalaries: {
    currentSection: "documents",
    currentSubSection: "docs_salaries",
  },
  documentsCorbeille: {
    currentSection: "documents",
    currentSubSection: "docs_corbeille",
  },
  offres: {
    currentSection: "offres",
    currentSubSection: "offres_actives",
  },
  offresCandidatures: {
    currentSection: "offres",
    currentSubSection: "offres_candidatures",
  },
  offresArchives: {
    currentSection: "offres",
    currentSubSection: "offres_archives",
  },
  offresCreer: {
    currentSection: "offres",
    currentSubSection: "offres_creer",
  },
  parametres: {
    currentSection: "parametres",
    currentSubSection: "overview",
  },
} satisfies Record<string, RhWorkspaceRouteProps>;

export function createRhCollaborateurDetailRoute(
  selectedEmployeeId: string | null | undefined,
): RhWorkspaceRouteProps {
  return {
    currentSection: "collaborateurs",
    currentSubSection: "collab_detail",
    selectedEmployeeId: selectedEmployeeId ?? null,
  };
}
