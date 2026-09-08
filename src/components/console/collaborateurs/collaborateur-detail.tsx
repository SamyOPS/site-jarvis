"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, FilePlus, Pencil } from "lucide-react";

import { ConsoleStatRow } from "@/components/console/overview/stat-row";
import { ConsoleStatusBadge } from "@/components/console/overview/status-badge";
import { ConsoleEmploymentBadge } from "@/components/console/collaborateurs/collaborateurs-table";
import { DashboardDocumentList } from "@/components/dashboard/document-list";
import {
  DocumentFiltersBar,
  type FilterFieldKey,
} from "@/components/dashboard/document-filters-bar";
import { MissionsCard, type MissionFormState, type MissionItem } from "@/components/dashboard/missions-card";
import { Button } from "@/components/ui/button";
import type { DocumentListItem } from "@/domain/documents";
import { useDismissable } from "@/hooks/use-dismissable";

/**
 * Profil de facturation en cours d'edition.
 *
 * Ce sont EXACTEMENT les champs que `PUT /api/rh/billing-profiles` enregistre. Le nom de
 * compte et le telephone de compte n'en font pas partie : ils s'affichent en lecture seule
 * dans l'en-tete, un champ modifiable qui ne persiste pas serait un mensonge.
 */
export type CollaborateurBillingDraft = {
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  siret: string;
  iban: string;
  bic: string;
};

type DetailRequest = {
  id: string;
  typeLabel: string;
  status: string;
};

type DetailApplication = {
  id: string;
  jobTitle: string;
  status: string;
};

/**
 * Un document affichable ici. Le composant est GENERIQUE dessus : les gestionnaires
 * d'apercu du workspace attendent la ligne complete (`RhDocumentRow`), et un parametre
 * fige a ce minimum les rendrait intransmissibles.
 */
type DetailDocumentItem = DocumentListItem & { storagePath: string };

type CollaborateurDetailProps<TDoc extends DetailDocumentItem> = {
  employee: {
    id: string;
    name: string;
    email: string;
    /** Telephone du compte, distinct du telephone de facturation. */
    phone: string | null;
  };
  lastSignInLabel: string;
  isOnline: boolean;

  employmentStatus: string;
  onEmploymentStatusChange: (value: string) => void;

  /** `null` quand aucun profil de facturation n'existe pour ce collaborateur. */
  billingDraft: CollaborateurBillingDraft | null;
  onBillingDraftChange: (patch: Partial<CollaborateurBillingDraft>) => void;
  editing: boolean;
  saving: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;

  missions: {
    items: MissionItem[];
    onSave: (form: MissionFormState) => void | Promise<void>;
    onDelete: (missionId: string) => void | Promise<void>;
    saving: boolean;
    loading: boolean;
    message: string | null;
  };

  requests: DetailRequest[];
  /** Ouvre le dialogue de demande, deja pointe sur ce collaborateur. */
  onRequestDocument: () => void;
  applications: DetailApplication[];

  documents: {
    /** Deja filtres, prets a afficher. */
    items: TDoc[];
    /** Nombre total AVANT filtrage, pour la tuile. */
    totalCount: number;
    storageScope: string | null;
    authToken: string | null;
    filterValues: Record<"type" | "period" | "status" | "owner", string>;
    filterOptions: Record<
      "type" | "period" | "status" | "owner",
      { value: string; label: string }[]
    >;
    onFilterChange: (field: FilterFieldKey, value: string) => void;
    onView: (item: TDoc) => void | Promise<void>;
    onDownload: (item: TDoc) => void | Promise<void>;
    viewingId: string | null;
    downloadingId: string | null;
    onImport: () => void;
  };
};

type PanelMenuItem = { label: string; onSelect: () => void };

/**
 * Carte de la console : un cadre, un filet, pas d'ombre. Meme forme que le tableau de bord.
 *
 * `menu` transforme le titre en declencheur de menu deroulant, comme le titre de la liste
 * de documents principale. `actions` pose des boutons a droite. Les deux se combinent, mais
 * une carte n'a en general besoin que de l'un des deux.
 */
function Panel({
  title,
  description,
  actions,
  menu,
  className,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  menu?: PanelMenuItem[];
  className?: string;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useDismissable<HTMLDivElement>(menuOpen, () => setMenuOpen(false));

  return (
    <section
      className={`rounded-app-card border border-app-line bg-app-surface p-5 ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {menu?.length ? (
            <div ref={menuRef} className="relative">
              {/*
                Le bouton reste DANS le `h2` : c'est un titre de section avant d'etre un
                declencheur, et le sortir du titre priverait la page d'un niveau de plan
                pour les lecteurs d'ecran.
              */}
              <h2 className="text-app-md font-semibold text-app-text">
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  className="-mx-2 flex items-center gap-2 rounded-app-control px-2 py-1 transition-colors hover:bg-app-surface-hover focus-visible:outline-app"
                >
                  {title}
                  <ChevronDown
                    aria-hidden="true"
                    className={`h-4 w-4 transition-transform ${menuOpen ? "rotate-180" : ""}`}
                  />
                </button>
              </h2>

              {menuOpen ? (
                <div
                  role="menu"
                  aria-label={`Actions pour ${title}`}
                  className="absolute left-0 top-full z-20 mt-1 w-56 rounded-app-card border border-app-line bg-app-raised p-1 shadow-app-raised"
                >
                  {menu.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        item.onSelect();
                      }}
                      className="flex w-full items-center rounded-app-control px-3 py-2 text-left text-app-sm text-app-text transition-colors hover:bg-app-surface-hover focus-visible:outline-app"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <h2 className="text-app-md font-semibold text-app-text">{title}</h2>
          )}
          {description ? (
            <p className="mt-1 text-app-sm text-app-text-secondary">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const FIELD_CLASS =
  "h-9 w-full rounded-app-control border border-app-line bg-app-field px-2 text-app-sm text-app-text focus-visible:outline-app";

/**
 * Un renseignement : son intitule, puis sa valeur ou son champ de saisie.
 *
 * L'intitule n'est plus en capitales. Le tableau de bord n'en emploie nulle part, et
 * `uppercase tracking-wide` sur dix intitules d'affilee criait plus fort que les valeurs
 * qu'ils annoncent.
 */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-app-xs text-app-text-muted">{label}</p>
      <div className="mt-1 text-app-sm text-app-text-secondary">{children}</div>
    </div>
  );
}

const EMPLOYMENT_OPTIONS = [
  { value: "active", label: "Actif" },
  { value: "inactive", label: "Inactif" },
  { value: "exited", label: "Sorti" },
] as const;

/**
 * Fiche collaborateur, dans le langage du tableau de bord.
 *
 * DISPOSITION — elle alterne deliberement les formats, comme le tableau de bord :
 *   1. identite, carte HORIZONTALE pleine largeur ;
 *   2. quatre tuiles chiffrees ;
 *   3. informations, carte HORIZONTALE pleine largeur — dix champs etouffent en colonne ;
 *   4. entreprises / demandes, DEUX cartes VERTICALES cote a cote ;
 *   5. documents, carte HORIZONTALE pleine largeur — un tableau reclame la largeur.
 *
 * Il n'y a plus d'onglets : tout est visible d'un coup. Les entreprises clientes en
 * particulier ne pouvaient pas rester derriere un onglet — c'est ce qui rattache un
 * collaborateur a son travail, et il peut en avoir plusieurs depuis la migration
 * multi-missions (`profiles.company_name` n'en decrivait qu'une, elle est deprecie).
 *
 * Le composant ne CALCULE rien et n'appelle aucune API : il recoit des donnees pretes et
 * rend des evenements. Les 400 lignes qu'il remplace vivaient a meme `rh-workspace.tsx`.
 */
export function ConsoleCollaborateurDetail<TDoc extends DetailDocumentItem>({
  employee,
  lastSignInLabel,
  isOnline,
  employmentStatus,
  onEmploymentStatusChange,
  billingDraft,
  onBillingDraftChange,
  editing,
  saving,
  onStartEdit,
  onCancelEdit,
  onSave,
  missions,
  requests,
  onRequestDocument,
  applications,
  documents,
}: CollaborateurDetailProps<TDoc>) {
  const initials = useMemo(() => {
    const source = employee.name.trim() || employee.email;
    return (
      source
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("") || "?"
    );
  }, [employee.email, employee.name]);

  const openRequestsCount = requests.filter(
    (request) => !["validated", "cancelled"].includes(request.status),
  ).length;

  return (
    <div className="space-y-2">
      {/* En-tete d'identite : qui, comment le joindre, dans quel etat, et depuis quand. */}
      <section className="rounded-app-card border border-app-line bg-app-surface p-5">
        <div className="flex flex-wrap items-start gap-4">
          <span
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-app-line bg-app-surface-hover text-app-lg font-semibold text-app-text-secondary"
          >
            {initials}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-app-lg font-semibold text-app-text">
                {employee.name || employee.email}
              </h1>
              <ConsoleEmploymentBadge status={employmentStatus} />
            </div>
            <p className="mt-1 truncate text-app-sm text-app-text-secondary">
              {employee.email}
              {employee.phone ? ` · ${employee.phone}` : ""}
            </p>
            <p className="mt-1 flex items-center gap-2 text-app-xs text-app-text-muted">
              {/* Pastille TOUJOURS doublee d'un texte : une couleur seule ne dit rien. */}
              {isOnline ? (
                <>
                  <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-validated" />
                  <span className="sr-only">En ligne : </span>
                </>
              ) : null}
              {`Dernière connexion : ${lastSignInLabel}`}
            </p>
          </div>

          <Link
            href="/dashboard/rh/collaborateurs"
            className="flex shrink-0 items-center gap-2 rounded-app-control border border-app-line px-3 py-2 text-app-sm text-app-text-secondary transition-colors hover:bg-app-surface-hover hover:text-app-text focus-visible:outline-app"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
        </div>
      </section>

      {/*
        Tuiles chiffrees, INERTES : tout ce qu'elles comptent est desormais visible plus bas
        sur cette meme page, il n'y a donc nulle part ou aller. Pas de survol ni de curseur
        qui promettraient une navigation inexistante.

        Le nombre de demandes ouvertes passe en orange des qu'il reste quelque chose a
        traiter, et il reste toujours double de son intitule.
      */}
      <ConsoleStatRow
        stats={[
          { label: "Documents", value: documents.totalCount },
          {
            label: "Demandes ouvertes",
            value:
              openRequestsCount > 0 ? <span className="text-missing">{openRequestsCount}</span> : 0,
            hint: `${requests.length} au total`,
          },
          { label: "Entreprises clientes", value: missions.items.length },
          { label: "Candidatures", value: applications.length },
        ]}
      />

      {/* Informations — carte HORIZONTALE : dix champs etouffent dans une colonne. */}
      <Panel
        title="Informations"
        description="Identité de facturation, coordonnées et coordonnées bancaires."
        actions={
          !billingDraft ? null : editing ? (
            <>
              <Button size="sm" onClick={onSave} disabled={saving}>
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={onCancelEdit} disabled={saving}>
                Annuler
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onStartEdit}
              aria-label="Modifier les informations du collaborateur"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Modifier
            </Button>
          )
        }
      >
        {!billingDraft ? (
          <p className="text-app-sm text-app-text-muted">
            Aucun profil de facturation trouvé pour ce collaborateur.
          </p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Nom">
              {editing ? (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={billingDraft.firstName}
                    onChange={(event) => onBillingDraftChange({ firstName: event.target.value })}
                    className={FIELD_CLASS}
                    placeholder="Prénom"
                    aria-label="Prénom"
                  />
                  <input
                    value={billingDraft.lastName}
                    onChange={(event) => onBillingDraftChange({ lastName: event.target.value })}
                    className={FIELD_CLASS}
                    placeholder="Nom"
                    aria-label="Nom"
                  />
                </div>
              ) : (
                `${billingDraft.firstName} ${billingDraft.lastName}`.trim() || "-"
              )}
            </Field>

            <Field label="Statut">
              {editing ? (
                <select
                  value={employmentStatus}
                  onChange={(event) => onEmploymentStatusChange(event.target.value)}
                  className={FIELD_CLASS}
                  aria-label="Statut d'emploi"
                >
                  {EMPLOYMENT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                /*
                  Hors edition, le statut se lit dans la pastille de l'en-tete : le repeter
                  en texte brut afficherait « active » a cote de « Actif ».
                */
                <ConsoleEmploymentBadge status={employmentStatus} />
              )}
            </Field>

            <Field label="Adresse">
              {editing ? (
                <input
                  value={billingDraft.addressLine1}
                  onChange={(event) => onBillingDraftChange({ addressLine1: event.target.value })}
                  className={FIELD_CLASS}
                />
              ) : (
                billingDraft.addressLine1 || "-"
              )}
            </Field>

            <Field label="Complément d'adresse">
              {editing ? (
                <input
                  value={billingDraft.addressLine2}
                  onChange={(event) => onBillingDraftChange({ addressLine2: event.target.value })}
                  className={FIELD_CLASS}
                />
              ) : (
                billingDraft.addressLine2 || "-"
              )}
            </Field>

            <Field label="Ville, code postal, pays">
              {editing ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <input
                    value={billingDraft.postalCode}
                    onChange={(event) => onBillingDraftChange({ postalCode: event.target.value })}
                    className={FIELD_CLASS}
                    placeholder="Code postal"
                    aria-label="Code postal"
                  />
                  <input
                    value={billingDraft.city}
                    onChange={(event) => onBillingDraftChange({ city: event.target.value })}
                    className={FIELD_CLASS}
                    placeholder="Ville"
                    aria-label="Ville"
                  />
                  <input
                    value={billingDraft.country}
                    onChange={(event) => onBillingDraftChange({ country: event.target.value })}
                    className={FIELD_CLASS}
                    placeholder="Pays"
                    aria-label="Pays"
                  />
                </div>
              ) : (
                `${billingDraft.postalCode} ${billingDraft.city} ${billingDraft.country}`.trim() || "-"
              )}
            </Field>

            <Field label="E-mail de facturation">
              {editing ? (
                <input
                  value={billingDraft.email}
                  onChange={(event) => onBillingDraftChange({ email: event.target.value })}
                  className={FIELD_CLASS}
                />
              ) : (
                billingDraft.email || "-"
              )}
            </Field>

            <Field label="Téléphone de facturation">
              {editing ? (
                <input
                  value={billingDraft.phone}
                  onChange={(event) => onBillingDraftChange({ phone: event.target.value })}
                  className={FIELD_CLASS}
                />
              ) : (
                billingDraft.phone || "-"
              )}
            </Field>

            <Field label="SIRET">
              {editing ? (
                <input
                  value={billingDraft.siret}
                  onChange={(event) => onBillingDraftChange({ siret: event.target.value })}
                  className={FIELD_CLASS}
                />
              ) : (
                billingDraft.siret || "-"
              )}
            </Field>

            <Field label="IBAN">
              {editing ? (
                <input
                  value={billingDraft.iban}
                  onChange={(event) => onBillingDraftChange({ iban: event.target.value })}
                  className={FIELD_CLASS}
                />
              ) : (
                <span className="break-all">{billingDraft.iban || "-"}</span>
              )}
            </Field>

            <Field label="BIC">
              {editing ? (
                <input
                  value={billingDraft.bic}
                  onChange={(event) => onBillingDraftChange({ bic: event.target.value })}
                  className={FIELD_CLASS}
                />
              ) : (
                billingDraft.bic || "-"
              )}
            </Field>
          </div>
        )}
      </Panel>

      {/*
        Deux cartes VERTICALES cote a cote. Ce sont des listes courtes : elles gagnent en
        hauteur ce qu'elles n'ont pas besoin de prendre en largeur.

        Deux colonnes et non trois : la carte des candidatures a ete retiree, et une grille
        a trois colonnes aurait laisse un tiers vide a droite.
      */}
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <MissionsCard
          missions={missions.items}
          onSave={missions.onSave}
          onDelete={missions.onDelete}
          saving={missions.saving}
          loading={missions.loading}
          message={missions.message}
          title="Entreprises clientes"
          description="Chaque entreprise porte son tarif et son unité."
        />

        <Panel
          title="Demandes"
          description="Documents réclamés à ce collaborateur."
          actions={
            <Button type="button" variant="outline" size="sm" onClick={onRequestDocument}>
              <FilePlus className="mr-2 h-4 w-4" />
              Demander
            </Button>
          }
        >
          {requests.length === 0 ? (
            <p className="text-app-sm text-app-text-muted">Aucune demande.</p>
          ) : (
            <ul className="divide-y divide-app-line">
              {requests.map((request) => (
                <li key={request.id} className="flex items-center gap-3 py-3">
                  <span className="min-w-0 flex-1 truncate text-app-sm text-app-text">
                    {request.typeLabel}
                  </span>
                  {/*
                    Pastille traduite plutot que la valeur brute de la base : la fiche
                    affichait « uploaded » et « expired » tels quels.
                  */}
                  <ConsoleStatusBadge status={request.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Documents — carte HORIZONTALE : un tableau a six colonnes reclame la largeur. */}
      <Panel
        title="Documents"
        description="Déposés par le collaborateur ou par les RH."
        /*
          Menu sur le titre plutot qu'un bouton a droite : c'est la forme de la liste de
          documents principale, et il accueillera d'autres entrees sans s'allonger.
        */
        menu={[{ label: "Importer des documents", onSelect: documents.onImport }]}
      >
        {documents.totalCount === 0 ? (
          <p className="text-app-sm text-app-text-muted">Aucun document.</p>
        ) : (
          <DashboardDocumentList
            // Les filtres entrent dans la barre d'outils du cadre, comme partout ailleurs.
            toolbar={
              <DocumentFiltersBar
                fields={["type", "period", "status", "owner"]}
                values={documents.filterValues}
                options={documents.filterOptions}
                onChange={documents.onFilterChange}
              />
            }
            items={documents.items}
            storageKey="rh-collab-detail-documents-columns"
            storageScope={documents.storageScope}
            preferencesAuthToken={documents.authToken}
            columnControlPlacement="inline"
            onItemDoubleClick={(item) => {
              if (item.fileName.toLowerCase().endsWith(".pdf") && item.storagePath) {
                void documents.onView(item);
              }
            }}
            isItemDoubleClickable={(item) =>
              item.fileName.toLowerCase().endsWith(".pdf") && !!item.storagePath
            }
            renderActions={(item, closeMenu) => {
              const busy =
                !item.storagePath ||
                documents.viewingId === item.id ||
                documents.downloadingId === item.id;

              return (
                <>
                  {item.fileName.toLowerCase().endsWith(".pdf") ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        closeMenu();
                        void documents.onView(item);
                      }}
                      disabled={busy}
                    >
                      Visualiser
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      closeMenu();
                      void documents.onDownload(item);
                    }}
                    disabled={busy}
                  >
                    Télécharger
                  </Button>
                </>
              );
            }}
          />
        )}
      </Panel>
    </div>
  );
}
