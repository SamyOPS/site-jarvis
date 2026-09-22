import Link from "next/link";
import { Search } from "lucide-react";

import { AvatarBubble } from "@/components/console/avatar-bubble";

export type CollaborateurStatusFilter = "all" | "active" | "inactive" | "rh";

export type CollaborateurRow = {
  id: string;
  fullName: string | null;
  email: string;
  /**
   * Entreprises clientes du collaborateur. Un tableau, pas un champ : depuis la migration
   * multi-missions un collaborateur peut en avoir plusieurs, et l'ancienne colonne unique
   * n'en montrait qu'une — au hasard.
   *
   * Chaque entree porte l'identifiant de sa mission : deux missions peuvent avoir le MEME
   * nom d'entreprise chez un meme collaborateur (un client facture a l'heure d'un cote, au
   * jour de l'autre), et le nom ne peut donc pas servir de cle.
   */
  companies: { id: string; name: string }[];
  employmentStatus: string | null;
  /** Connexion de moins de 15 minutes. */
  isOnline: boolean;
  lastSignInLabel: string;
  /**
   * `null` pour un collegue RH : on ne lui adresse pas de demande, et afficher « 0 »
   * repondrait a une question qui ne se pose pas.
   */
  openRequestsCount: number | null;
  /** `rh` pour un collegue, `salarie` pour un consultant. */
  role: string | null;
  avatarUrl: string | null;
};

/**
 * Libelles et couleurs du statut d'emploi.
 *
 * La base stocke « active », « inactive », « exited » — l'ancien tableau affichait ces
 * valeurs telles quelles. On les traduit, et on ne colore que ce qui merite une couleur :
 * `exited` reste neutre (c'est un fait, pas une alerte), `inactive` prend l'ambre (situation
 * a verifier). Comme partout, la couleur est doublee du libelle.
 */
const EMPLOYMENT_STATUS = {
  active: {
    label: "Actif",
    className: "border-validated-line bg-validated-soft text-validated",
  },
  inactive: {
    label: "Inactif",
    className: "border-pending-line bg-pending-soft text-pending",
  },
  exited: { label: "Sorti", className: "border-app-line text-app-text-secondary" },
} as const;

export function ConsoleEmploymentBadge({ status }: { status: string | null }) {
  const known =
    status && status in EMPLOYMENT_STATUS
      ? EMPLOYMENT_STATUS[status as keyof typeof EMPLOYMENT_STATUS]
      : null;

  return (
    <span
      className={`inline-flex items-center rounded-app-control border px-2 py-1 text-app-xs font-medium ${
        known?.className ?? "border-app-line text-app-text-secondary"
      }`}
    >
      {known?.label ?? status ?? "-"}
    </span>
  );
}

/**
 * Positions du filtre.
 *
 * « Actifs » et « Inactifs » portent sur le statut d'emploi, qui ne concerne que les
 * consultants : ces deux positions ne montrent donc qu'eux. « Équipe RH » isole les
 * collegues, et « Tous » reunit les deux.
 */
const FILTERS = [
  { value: "all", label: "Tous" },
  { value: "active", label: "Actifs" },
  { value: "inactive", label: "Inactifs" },
  { value: "rh", label: "Équipe RH" },
] as const;

/** Ce qui n'a pas de sens pour un collegue RH s'affiche en tiret, jamais en zero. */
const NOT_APPLICABLE = <span className="text-app-text-muted">—</span>;

/**
 * Liste des collaborateurs : recherche, filtre de statut, tableau.
 *
 * Reprend les jetons de la console — filet de 1px, angles vifs, echelle typographique de
 * l'application — au lieu des couleurs codees en dur de l'ancienne version.
 *
 * Le composant ne CALCULE rien : il recoit des lignes pretes. Le decompte des demandes
 * ouvertes, en particulier, etait auparavant refiltre pour chaque ligne a chaque rendu.
 */
export function ConsoleCollaborateursTable({
  rows,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: {
  rows: CollaborateurRow[];
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: CollaborateurStatusFilter;
  onStatusFilterChange: (value: CollaborateurStatusFilter) => void;
}) {
  return (
    <section className="rounded-app-card border border-app-line bg-app-surface">
      <div className="flex flex-wrap items-center gap-3 border-b border-app-line p-4">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-muted"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Nom, e-mail ou entreprise..."
            aria-label="Rechercher un collaborateur par nom, e-mail ou entreprise cliente"
            className="h-9 w-full rounded-app-control border border-app-line bg-app-field pl-9 pr-3 text-app-sm text-app-text placeholder:text-app-text-muted focus-visible:outline-app"
          />
        </div>

        {/*
          `aria-pressed` dans un `role="group"` : l'etat selectionne doit etre annonce, pas
          seulement signale par un fond gris.
        */}
        <div
          role="group"
          aria-label="Filtrer par statut"
          className="flex items-center gap-1 rounded-app-control border border-app-line p-1"
        >
          {FILTERS.map((option) => {
            const selected = statusFilter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => onStatusFilterChange(option.value)}
                className={`rounded-app-control px-3 py-1 text-app-sm transition-colors focus-visible:outline-app ${
                  selected
                    ? "bg-app-surface-hover font-medium text-app-text"
                    : "text-app-text-secondary hover:text-app-text"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <span className="ml-auto shrink-0 text-app-sm text-app-text-muted">
          {rows.length} collaborateur{rows.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-app-sm">
          <thead>
            <tr className="border-b border-app-line text-left text-app-xs text-app-text-muted">
              <th scope="col" className="px-4 py-3 font-medium">
                Nom
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Rôle
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Entreprises
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                E-mail
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Statut
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Dernière connexion
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Demandes ouvertes
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-app-sm text-app-text-muted"
                >
                  Aucun collaborateur ne correspond.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const isColleague = row.role === "rh";

                return (
                <tr
                  key={row.id}
                  className="border-b border-app-line transition-colors last:border-b-0 hover:bg-app-surface-hover"
                >
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2.5">
                      <AvatarBubble
                        avatarUrl={row.avatarUrl}
                        name={row.fullName ?? ""}
                        email={row.email}
                      />
                      {/*
                        Meme adresse pour tous, mais deux fiches derriere : le suivi
                        documentaire pour un consultant, le contact pour un collegue RH.
                        C'est le workspace qui choisit d'apres le role — les documents, les
                        demandes et les entreprises clientes n'existent pas pour un pair, et
                        le serveur refuserait de toute facon d'enregistrer ses champs.
                      */}
                      <Link
                        href={`/dashboard/rh/collaborateurs/${row.id}`}
                        className="font-medium text-app-text hover:underline focus-visible:outline-app"
                      >
                        {row.fullName ?? row.email}
                      </Link>
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-app-control border px-2 py-1 text-app-xs font-medium ${
                        isColleague
                          ? "border-app-accent-soft bg-app-accent-soft text-app-accent-fg"
                          : "border-app-line text-app-text-secondary"
                      }`}
                    >
                      {isColleague ? "RH" : "Consultant"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {isColleague ? (
                      NOT_APPLICABLE
                    ) : row.companies.length === 0 ? (
                      <span className="text-app-text-muted">-</span>
                    ) : (
                      /*
                        Les entreprises s'affichent toutes, en pastilles : n'en montrer
                        qu'une, ou « ACME +2 », cacherait precisement ce que le
                        multi-entreprises a rendu possible.
                      */
                      <span className="flex flex-wrap gap-1">
                        {row.companies.map((company) => (
                          <span
                            key={company.id}
                            className="rounded-app-control border border-app-line px-2 py-1 text-app-xs text-app-text-secondary"
                          >
                            {company.name}
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-app-text-secondary">{row.email}</td>
                  <td className="px-4 py-3">
                    {isColleague ? (
                      NOT_APPLICABLE
                    ) : (
                      <ConsoleEmploymentBadge status={row.employmentStatus} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-app-text-secondary">
                    <span className="flex items-center gap-2">
                      {/* Pastille TOUJOURS doublee d'un texte pour les lecteurs d'ecran. */}
                      {row.isOnline ? (
                        <>
                          <span
                            aria-hidden="true"
                            className="h-2 w-2 shrink-0 rounded-full bg-validated"
                          />
                          <span className="sr-only">En ligne : </span>
                        </>
                      ) : null}
                      {row.lastSignInLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {/*
                      Le nombre passe en orange des qu'il est non nul : c'est ce qui reste
                      a traiter. Zero reste en gris, c'est une absence, pas un statut.
                    */}
                    {row.openRequestsCount === null ? (
                      NOT_APPLICABLE
                    ) : row.openRequestsCount > 0 ? (
                      <span className="font-medium text-missing">{row.openRequestsCount}</span>
                    ) : (
                      <span className="text-app-text-muted">0</span>
                    )}
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
