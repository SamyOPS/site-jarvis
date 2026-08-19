import { ConsoleMonthlyBars, type MonthlyPoint } from "@/components/console/overview/monthly-bars";
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

type RhOverviewSectionProps = {
  pendingDocumentsCount: number;
  openRequestsCount: number;
  employeesCount: number;
  currentMonthDocumentsCount: number;
  openRequests: RhOverviewRequest[];
  /** Volume mensuel reel, deduit de la date de depot des documents. */
  documentsByMonth: MonthlyPoint[];
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
      <h2 className="text-app-sm font-semibold text-app-text">{title}</h2>
      {description ? (
        <p className="mt-1 text-app-xs text-app-text-secondary">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  uploaded: "Depose",
  rejected: "Rejete",
  expired: "Expire",
};

export function RhOverviewSection({
  pendingDocumentsCount,
  openRequestsCount,
  employeesCount,
  currentMonthDocumentsCount,
  openRequests,
  documentsByMonth,
}: RhOverviewSectionProps) {
  const priorities = openRequests.slice(0, 6);

  return (
    <div className="space-y-2">
      <ConsoleStatRow
        stats={[
          { label: "Documents a valider", value: pendingDocumentsCount },
          { label: "Demandes ouvertes", value: openRequestsCount },
          { label: "Collaborateurs suivis", value: employeesCount },
          { label: "Documents ce mois", value: currentMonthDocumentsCount },
        ]}
      />

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        <Panel
          title="Documents deposes"
          description="Volume mensuel, six derniers mois."
          className="lg:col-span-2"
        >
          <ConsoleMonthlyBars points={documentsByMonth} valueLabel="documents" />
        </Panel>

        <Panel title="Priorites" description="Demandes ouvertes, les plus urgentes d'abord.">
          {priorities.length === 0 ? (
            <p className="text-app-xs text-app-text-muted">Aucune demande ouverte.</p>
          ) : (
            <ul className="divide-y divide-app-line">
              {priorities.map((request) => (
                <li key={request.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-app-xs font-medium text-app-text">
                      {request.employeeName}
                    </p>
                    <p className="truncate text-app-xs text-app-text-secondary">
                      {request.typeLabel}
                    </p>
                    <p className="mt-1 text-app-2xs text-app-text-muted">
                      {`Echeance ${formatDate(request.dueAt)} · Periode ${formatMonth(request.periodMonth)}`}
                    </p>
                  </div>
                  {/*
                    Le statut porte son LIBELLE, pas seulement une pastille de couleur :
                    une couleur seule n'est pas lisible par tout le monde.
                  */}
                  <span className="shrink-0 rounded-app-control border border-app-line px-2 py-1 text-app-2xs text-app-text-secondary">
                    {STATUS_LABELS[request.status] ?? request.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
