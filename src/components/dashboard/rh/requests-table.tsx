import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RhRequestRow as RequestRow } from "@/features/dashboard/rh/types";

type RhRequestsTableProps = {
  requests: RequestRow[];
  cancellingRequestId: string | null;
  onCancelRequest: (request: RequestRow) => void | Promise<void>;
  formatMonth: (value: string | null) => string;
  formatDate: (value: string | null) => string;
};

export function RhRequestsTable({
  requests,
  cancellingRequestId,
  onCancelRequest,
  formatMonth,
  formatDate,
}: RhRequestsTableProps) {
  if (!requests.length) {
    return <p className="text-sm text-[#0A1A2F]/70">Aucune demande documentaire pour le moment.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-[#0A1A2F]/70">
          <tr>
            <th className="px-3 py-2">Salarie</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Periode</th>
            <th className="px-3 py-2">Echeance</th>
            <th className="px-3 py-2">Statut</th>
            <th className="px-3 py-2">Note</th>
            <th className="px-3 py-2">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {requests.map((request) => (
            <tr key={request.id}>
              <td className="px-3 py-2">{request.employeeName}</td>
              <td className="px-3 py-2">{request.typeLabel}</td>
              <td className="px-3 py-2">{formatMonth(request.periodMonth)}</td>
              <td className="px-3 py-2">{formatDate(request.dueAt)}</td>
              <td className="px-3 py-2">
                <Badge variant="outline">{request.status}</Badge>
              </td>
              <td className="px-3 py-2 text-[#0A1A2F]/70">{request.note ?? "-"}</td>
              <td className="px-3 py-2">
                {["pending", "uploaded", "rejected", "expired"].includes(request.status) ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void onCancelRequest(request)}
                    disabled={cancellingRequestId === request.id}
                  >
                    {cancellingRequestId === request.id ? "Annulation..." : "Annuler"}
                  </Button>
                ) : (
                  <span className="text-xs text-[#0A1A2F]/50">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
