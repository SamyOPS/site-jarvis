import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SalarieRequestRow as RequestRow } from "@/features/dashboard/salarie/types";

type SalariePendingRequestsProps = {
  pendingRequests: RequestRow[];
  openUploadDialog: (requestId?: string) => void;
  formatMonth: (value: string | null) => string;
  formatDate: (value: string | null) => string;
};

export function SalariePendingRequests({
  pendingRequests,
  openUploadDialog,
  formatMonth,
  formatDate,
}: SalariePendingRequestsProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="font-medium">Demandes RH ouvertes</p>
          <Badge variant="outline">{pendingRequests.length}</Badge>
        </div>
        {pendingRequests.length ? (
          pendingRequests.map((request) => (
            <div key={request.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <p className="font-medium">{request.typeLabel}</p>
                  <p className="text-sm text-[#0A1A2F]/70">
                    Periode: {formatMonth(request.periodMonth)}
                  </p>
                  <p className="text-sm text-[#0A1A2F]/70">
                    Echeance: {formatDate(request.dueAt)}
                  </p>
                  <p className="text-sm text-[#0A1A2F]/70">Note: {request.note ?? "-"}</p>
                </div>
                <Badge variant="outline">{request.status}</Badge>
              </div>
              <div className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openUploadDialog(request.id)}
                >
                  Utiliser cette demande
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-[#0A1A2F]/70">
            Aucune demande RH ouverte pour le moment.
          </p>
        )}
      </div>
    </div>
  );
}
