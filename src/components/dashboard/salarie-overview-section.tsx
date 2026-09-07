import type { ReactNode } from "react";

import { ConsoleMonthlyBars, type MonthlyPoint } from "@/components/console/overview/monthly-bars";
import Link from "next/link";

import { ConsoleStatRow } from "@/components/console/overview/stat-row";
import { ConsoleStatusBadge } from "@/components/console/overview/status-badge";
import { formatDate, formatMonth } from "@/lib/dashboard-formatters";

type SalarieOverviewRequest = {
  id: string;
  typeLabel: string;
  dueAt: string | null;
  periodMonth: string | null;
  status: string;
  note: string | null;
};

type SalarieOverviewSectionProps = {
  pendingRequestsCount: number;
  documentsCount: number;
  validatedDocumentsCount: number;
  pendingRequests: SalarieOverviewRequest[];
  /** Volume mensuel reel, deduit de la date de depot des documents. */
  documentsByMonth: MonthlyPoint[];
  action: ReactNode;
};

/** Carte de la console : un cadre, un filet fin, pas d'ombre. Identique a l'espace RH. */
function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-app-card border border-app-line bg-app-surface p-5 ${className ?? ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-app-md font-semibold text-app-text">{title}</h2>
          {description ? (
            <p className="mt-1 text-app-sm text-app-text-secondary">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function SalarieOverviewSection({
  pendingRequestsCount,
  documentsCount,
  validatedDocumentsCount,
  pendingRequests,
  documentsByMonth,
  action,
}: SalarieOverviewSectionProps) {
  const priorities = pendingRequests.slice(0, 6);

  return (
    <div className="space-y-2">
      {/*
        Quatre tuiles comme cote RH, et non trois : « Documents deposes » se lisait mal
        sans son complement en attente. La quatrieme est un simple reste a valider, deduit
        des deux autres — aucune donnee supplementaire n'est requise.
      */}
      <ConsoleStatRow
        stats={[
          {
            label: "Documents à déposer",
            value: pendingRequestsCount,
            href: "/dashboard/salarie/documents/a-deposer",
          },
          {
            label: "Documents déposés",
            value: documentsCount,
            href: "/dashboard/salarie/documents",
          },
          { label: "Documents validés", value: validatedDocumentsCount },
          {
            label: "En cours de validation",
            value: Math.max(0, documentsCount - validatedDocumentsCount),
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        <Panel
          title="Mes dépôts"
          description="Volume mensuel, six derniers mois."
          className="lg:col-span-2"
        >
          <ConsoleMonthlyBars points={documentsByMonth} valueLabel="documents" />
        </Panel>

        <Panel
          title="À déposer"
          description="Demandes RH en attente de votre part."
          action={action}
        >
          {priorities.length === 0 ? (
            <p className="text-app-sm text-app-text-muted">Aucune demande en attente.</p>
          ) : (
            <ul className="divide-y divide-app-line">
              {priorities.map((request) => (
                <li key={request.id}>
                  <Link
                    href="/dashboard/salarie/documents/a-deposer"
                    className="-mx-2 flex items-start gap-3 rounded-app-control px-2 py-3 transition-colors hover:bg-app-surface-hover focus-visible:outline-app"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-app-sm font-medium text-app-text">
                        {request.typeLabel}
                      </p>
                    <p className="mt-1 text-app-xs text-app-text-muted">
                      {`Échéance ${formatDate(request.dueAt)} · Période ${formatMonth(request.periodMonth)}`}
                    </p>
                  </div>
                    <ConsoleStatusBadge status={request.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
