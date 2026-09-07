import { useState } from "react";

import { useDismissable } from "@/hooks/use-dismissable";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { columnDefinitions, type ColumnKey } from "@/features/dashboard/document-list/columns";

type ColumnVisibilityMenuProps = {
  visibleColumns: ColumnKey[];
  onToggle: (columnKey: ColumnKey) => void;
  placement: "stacked" | "inline";
};

export function ColumnVisibilityMenu({
  visibleColumns,
  onToggle,
  placement,
}: ColumnVisibilityMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useDismissable<HTMLDivElement>(menuOpen, () => setMenuOpen(false));

  return (
    <div
      className={
        placement === "inline"
          ? "absolute right-0 -top-9 z-20 hidden sm:block"
          : "mb-2 hidden justify-end sm:flex"
      }
      ref={menuRef}
    >
      <div className="relative">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={
            placement === "inline"
              ? "h-8 px-2 text-app-xs font-medium text-app-text/75 hover:text-app-text"
              : "gap-2 text-app-text/75 hover:text-app-text"
          }
          onClick={() => setMenuOpen((open) => !open)}
        >
          <SlidersHorizontal
            className={placement === "inline" ? "h-3.5 w-3.5" : "h-4 w-4"}
          />
          Libellés
        </Button>
        {menuOpen ? (
          <div className="absolute right-0 top-full z-20 mt-2 w-60 rounded-app-card border border-app-line bg-app-surface p-3">
            <p className="mb-3 text-app-xs font-medium uppercase tracking-wide text-app-text/55">
              Colonnes visibles
            </p>
            <div className="space-y-2">
              {columnDefinitions.map((column) => {
                const checked = visibleColumns.includes(column.key);

                return (
                  <label
                    key={column.key}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-app-card px-2 py-1.5 text-app-sm text-app-text"
                  >
                    <span>{column.label}</span>
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => onToggle(column.key)}
                      aria-label={`Afficher la colonne ${column.label}`}
                    />
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
