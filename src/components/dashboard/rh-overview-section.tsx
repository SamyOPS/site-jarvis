import { ConsoleStatRow } from "@/components/console/overview/stat-row";
import { formatDate, formatMonth } from "@/lib/dashboard-formatters";

type RhOverviewRequest = {
  id: string;
  employeeName: string;
  typeLabel: string;
  dueAt: string | null;
  periodMonth: string | null;
  status: string;
};

type RhOverviewDocument = {
  id: string;
  employeeName: string;
  typeLabel: string;
  periodMonth: string | null;
  createdAt: string | null;
};

type RhOverviewSignIn = {
  id: string;
  name: string;
  lastSignInAt: string | null;
  /** Connexion de moins de 15 minutes : le plus proche d'une presence que l'on sache dire. */
  isOnline: boolean;
};

type RhOverviewSilentEmployee = {
  id: string;
  name: string;
  companyName: string | null;
};

type RhOverviewSectionProps = {
  pendingDocumentsCount: number;
  openRequestsCount: number;
  employeesCount: number;
  currentMonthDocumentsCount: number;
  openRequests: RhOverviewRequest[];
  /** Documents deposes en attente de validation. */
  pendingDocuments: RhOverviewDocument[];
  /**
   * Dernieres connexions, la plus recente en tete. Ce n'est PAS une presence en temps reel :
   * l'application ne suit aucune session ouverte.
   */
  recentSignIns: RhOverviewSignIn[];
  /** Collaborateurs actifs n'ayant rien depose ce mois-ci. */
  employeesWithoutDeposit: RhOverviewSilentEmployee[];
  /** Denominateur affiche a cote de la liste. */
  activeEmployeesCount: number;
};

/** Carte de la console : un cadre, un filet, pas d'ombre. */
function Panel({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-app-card border border-app-line bg-app-surface p-5 ${className ?? ""}`}
    >
      <h2 className="text-app-md font-semibold text-app-text">{title}</h2>
      {description ? (
        <p className="mt-1 text-app-sm text-app-text-secondary">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** « il y a 3 min », « il y a 2 h ». Rend null si la date est absente ou illisible. */
function formatRelative(value: string | null) {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return null;
  const minutes = Math.max(0, Math.round((Date.now() - time) / 60000));
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  uploaded: "Déposé",
  rejected: "Rejeté",
  expired: "Expiré",
};

export function RhOverviewSection({
  pendingDocumentsCount,
  openRequestsCount,
  employeesCount,
  currentMonthDocumentsCount,
  openRequests,
  pendingDocuments,
  recentSignIns,
  employeesWithoutDeposit,
  activeEmployeesCount,
}: RhOverviewSectionProps) {
  const priorities = openRequests.slice(0, 6);

  return (
    <div className="space-y-2">
      <ConsoleStatRow
        stats={[
          { label: "Documents à valider", value: pendingDocumentsCount },
          { label: "Demandes ouvertes", value: openRequestsCount },
          { label: "Collaborateurs suivis", value: employeesCount },
          { label: "Documents ce mois", value: currentMonthDocumentsCount },
        ]}
      />

      {/*
        Trois listes sur une rangee de trois, sans colonne large : le graphique mensuel a ete
        retire (juge non pertinent), et etirer un panneau sur deux colonnes n'apporte rien a
        des lignes qui tiennent en « nom · type · anciennete ».
      */}
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        <Panel
          title="Documents à valider"
          description="Déposés par les collaborateurs, en attente de contrôle."
        >
          {pendingDocuments.length === 0 ? (
            <p className="text-app-sm text-app-text-muted">Aucun document en attente.</p>
          ) : (
            <ul className="divide-y divide-app-line">
              {pendingDocuments.slice(0, 8).map((document) => (
                <li key={document.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-app-sm font-medium text-app-text">
                      {document.employeeName}
                    </p>
                    <p className="truncate text-app-sm text-app-text-secondary">
                      {document.typeLabel}
                      {document.periodMonth ? ` · ${formatMonth(document.periodMonth)}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-app-xs text-app-text-muted">
                    {formatRelative(document.createdAt) ?? "-"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Priorités" description="Demandes ouvertes, les plus urgentes d'abord.">
          {priorities.length === 0 ? (
            <p className="text-app-sm text-app-text-muted">Aucune demande ouverte.</p>
          ) : (
            <ul className="divide-y divide-app-line">
              {priorities.map((request) => (
                <li key={request.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-app-sm font-medium text-app-text">
                      {request.employeeName}
                    </p>
                    <p className="truncate text-app-sm text-app-text-secondary">
                      {request.typeLabel}
                    </p>
                    <p className="mt-1 text-app-xs text-app-text-muted">
                      {`Échéance ${formatDate(request.dueAt)} · Période ${formatMonth(request.periodMonth)}`}
                    </p>
                  </div>
                  {/*
                    Le statut porte son LIBELLE, pas seulement une pastille de couleur :
                    une couleur seule n'est pas lisible par tout le monde.
                  */}
                  <span className="shrink-0 rounded-app-control border border-app-line px-2 py-1 text-app-xs text-app-text-secondary">
                    {STATUS_LABELS[request.status] ?? request.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Dernières connexions"
          description="La plus récente en tête."
        >
          {recentSignIns.length === 0 ? (
            <p className="text-app-sm text-app-text-muted">Aucune connexion enregistrée.</p>
          ) : (
            <ul className="divide-y divide-app-line">
              {recentSignIns.map((employee) => (
                <li key={employee.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  {/*
                    La pastille n'apparait que pour une connexion de moins de 15 minutes, et
                    elle est TOUJOURS doublee d'un texte : « en ligne » pour un lecteur
                    d'ecran, l'anciennete a droite pour tous. Une couleur seule ne dit rien
                    a qui ne la percoit pas.
                  */}
                  {employee.isOnline ? (
                    <>
                      <span
                        aria-hidden="true"
                        className="h-2 w-2 shrink-0 rounded-full bg-validated"
                      />
                      <span className="sr-only">En ligne : </span>
                    </>
                  ) : (
                    <span aria-hidden="true" className="h-2 w-2 shrink-0" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-app-sm text-app-text">
                    {employee.name}
                  </span>
                  <span className="shrink-0 text-app-xs text-app-text-muted">
                    {formatRelative(employee.lastSignInAt) ?? "-"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

      </div>

      {/*
        Pleine largeur, sous la grille : la liste est plate (des noms), elle gagne a
        s'etaler en colonnes plutot qu'a s'etirer en hauteur dans une colonne etroite.
      */}
      <Panel
        title="Sans dépôt ce mois"
        description={`${employeesWithoutDeposit.length} sur ${activeEmployeesCount} collaborateurs actifs.`}
      >
        {employeesWithoutDeposit.length === 0 ? (
          <p className="text-app-sm text-app-text-muted">
            Tous les collaborateurs actifs ont déposé ce mois-ci.
          </p>
        ) : (
          <>
            {/*
              Neuf noms au maximum : trois rangees pleines sur la grille a trois colonnes.
              Le filet est porte par CHAQUE ligne — un `last:border-b-0` ne retirerait le
              trait qu'au dernier element du DOM, laissant les bas de colonnes 1 et 2
              soulignes et le troisieme nu.
            */}
            <ul className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
              {employeesWithoutDeposit.slice(0, 9).map((employee) => (
                <li
                  key={employee.id}
                  className="flex items-center gap-3 border-b border-app-line py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-app-sm text-app-text">
                    {employee.name}
                  </span>
                  {employee.companyName ? (
                    <span className="shrink-0 truncate text-app-xs text-app-text-muted">
                      {employee.companyName}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>

            {/*
              Troncature ANNONCEE : sans cette ligne, le compte de l'en-tete ne
              correspondrait pas aux noms visibles et passerait pour une anomalie.
            */}
            {employeesWithoutDeposit.length > 9 ? (
              <p className="mt-3 text-app-xs text-app-text-muted">
                {`et ${employeesWithoutDeposit.length - 9} autre${
                  employeesWithoutDeposit.length - 9 > 1 ? "s" : ""
                }.`}
              </p>
            ) : null}
          </>
        )}
      </Panel>
    </div>
  );
}
