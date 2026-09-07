import type { ReactNode } from "react";

import { ConsoleStatusBadge } from "@/components/console/overview/status-badge";
import { Button } from "@/components/ui/button";
import type { RhRequestRow as RequestRow } from "@/features/dashboard/rh/types";
import { formatDate, formatMonth } from "@/lib/dashboard-formatters";

type RhRequestsTableProps = {
  requests: RequestRow[];
  cancellingRequestId: string | null;
  onCancelRequest: (request: RequestRow) => void | Promise<void>;
  /** Action de la barre d'outils, a gauche du decompte. */
  action?: ReactNode;
};

const CANCELLABLE = ["pending", "uploaded", "rejected", "expired"];

/**
 * Demandes documentaires emises par le RH.
 *
 * Meme forme que la liste des collaborateurs : un cadre unique, une barre d'outils separee
 * par un filet avec l'action a gauche et le decompte a droite, puis le tableau — en-tetes
 * discrets sans aplat, lignes survolables, filets de 1px.
 */
export function RhRequestsTable({
  requests,
  cancellingRequestId,
  onCancelRequest,
  action,
}: RhRequestsTableProps) {
  return (
    <section className="rounded-app-card border border-app-line bg-app-surface">
      <div className="flex flex-wrap items-center gap-3 border-b border-app-line p-4">
        <div className="min-w-0 flex-1">{action}</div>
        <span className="shrink-0 text-app-sm text-app-text-muted">
          {requests.length} demande{requests.length > 1 ? "s" : ""}
        </span>
      </div>

      {requests.length === 0 ? (
        <p className="px-4 py-10 text-center text-app-sm text-app-text-muted">
          Aucune demande documentaire pour le moment.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-app-sm">
            <thead>
              <tr className="border-b border-app-line text-left text-app-xs text-app-text-muted">
                <th scope="col" className="px-4 py-3 font-medium">
                  Collaborateur
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Type
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Période
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Échéance
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Statut
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Note
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr
                  key={request.id}
                  className="border-b border-app-line transition-colors last:border-b-0 hover:bg-app-surface-hover"
                >
                  <td className="px-4 py-3 font-medium text-app-text">
                    {request.employeeName}
                  </td>
                  <td className="px-4 py-3 text-app-text-secondary">{request.typeLabel}</td>
                  <td className="px-4 py-3 text-app-text-secondary">
                    {formatMonth(request.periodMonth)}
                  </td>
                  <td className="px-4 py-3 text-app-text-secondary">
                    {formatDate(request.dueAt)}
                  </td>
                  <td className="px-4 py-3">
                    {/*
                      La pastille traduit le statut et lui donne sa couleur. L'ancienne
                      version affichait la valeur brute de la base — « uploaded », « expired ».
                    */}
                    <ConsoleStatusBadge status={request.status} />
                  </td>
                  <td className="px-4 py-3 text-app-text-secondary">{request.note ?? "-"}</td>
                  <td className="px-4 py-3 text-right">
                    {CANCELLABLE.includes(request.status) ? (
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
                      <span className="text-app-xs text-app-text-muted">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
