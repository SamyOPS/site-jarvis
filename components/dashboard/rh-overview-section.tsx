import { MetricCard } from "@/components/dashboard/metric-card";
import { RequestListCard } from "@/components/dashboard/request-list-card";

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
  formatDate: (value: string | null) => string;
  formatMonth: (value: string | null) => string;
};

export function RhOverviewSection({
  pendingDocumentsCount,
  openRequestsCount,
  employeesCount,
  currentMonthDocumentsCount,
  openRequests,
  formatDate,
  formatMonth,
}: RhOverviewSectionProps) {
  return (
    <>
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <MetricCard compact title="Docs en attente" value={pendingDocumentsCount} />
        <MetricCard compact title="Demandes ouvertes" value={openRequestsCount} />
        <MetricCard compact title="Salaries suivis" value={employeesCount} />
        <MetricCard compact title="Docs ce mois" value={currentMonthDocumentsCount} />
      </section>

      <RequestListCard
        title="Priorites"
        items={openRequests.slice(0, 8).map((request) => ({
          id: request.id,
          title: `${request.employeeName} - ${request.typeLabel}`,
          meta: `Echeance: ${formatDate(request.dueAt)} | Periode: ${formatMonth(request.periodMonth)}`,
          status: request.status,
        }))}
        emptyMessage="Aucune priorite documentaire."
      />
    </>
  );
}
