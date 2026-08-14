import type { ReactNode } from "react";

import { MetricCard } from "@/components/dashboard/metric-card";
import { RequestListCard } from "@/components/dashboard/request-list-card";
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
  action: ReactNode;
};

export function SalarieOverviewSection({
  pendingRequestsCount,
  documentsCount,
  validatedDocumentsCount,
  pendingRequests,
  action,
}: SalarieOverviewSectionProps) {
  return (
    <>
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard compact title="Demandes ouvertes" value={pendingRequestsCount} />
        <MetricCard compact title="Documents deposes" value={documentsCount} />
        <MetricCard compact title="Documents valides" value={validatedDocumentsCount} />
      </section>

      <RequestListCard
        title="Documents a deposer"
        action={action}
        items={pendingRequests.map((request) => ({
          id: request.id,
          title: request.typeLabel,
          meta: `Echeance: ${formatDate(request.dueAt)} | Periode: ${formatMonth(request.periodMonth)}`,
          status: request.status,
          note: request.note,
        }))}
        emptyMessage="Aucune demande ouverte."
      />
    </>
  );
}
