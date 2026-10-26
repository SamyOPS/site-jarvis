"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCraPeriodLabel } from "@/domain/cra";
import type { CraSummaryRow } from "@/features/dashboard/salarie/types";

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  submitted: "Envoye",
  validated: "Valide",
  rejected: "Refuse",
};

type CraHistoryProps = {
  items: CraSummaryRow[];
  selectedCraId: string | null;
  onSelect: (craId: string) => void | Promise<void>;
};

export function CraHistory({ items, selectedCraId, onSelect }: CraHistoryProps) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-app-sm font-medium text-app-text">Mes CRA</p>
      <ul className="divide-y divide-app-line rounded-app-card border border-app-line">
        {items.map((item) => {
          const isSelected = item.id === selectedCraId;
          return (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-2 text-app-sm">
                <span className="font-medium capitalize text-app-text">
                  {formatCraPeriodLabel(item.period_month.slice(0, 7))}
                </span>
                <span className="text-app-text-muted">
                  {Number(item.worked_days_count).toLocaleString("fr-FR", {
                    maximumFractionDigits: 2,
                  })}{" "}
                  j
                </span>
                <Badge variant="outline" className="text-app-xs">
                  {statusLabels[item.status] ?? item.status}
                </Badge>
                {item.pdf_version > 0 ? (
                  <span className="text-app-xs text-app-text-muted">PDF v{item.pdf_version}</span>
                ) : null}
              </div>
              {isSelected ? (
                <span className="text-app-xs font-semibold text-app-accent-fg">En cours d&apos;edition</span>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void onSelect(item.id)}
                >
                  Reprendre
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
