import { useEffect, useRef, useState } from "react";
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
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  return (
    <div
      className={
        placement === "inline"
          ? "absolute right-0 -top-9 z-20"
          : "mb-2 flex justify-end"
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
              ? "h-8 px-2 text-xs font-medium text-[#0A1A2F]/75 hover:text-[#0A1A2F]"
              : "gap-2 text-[#0A1A2F]/75 hover:text-[#0A1A2F]"
          }
          onClick={() => setMenuOpen((open) => !open)}
        >
          <SlidersHorizontal
            className={placement === "inline" ? "h-3.5 w-3.5" : "h-4 w-4"}
          />
          Libellés
        </Button>
        {menuOpen ? (
          <div className="absolute right-0 top-full z-20 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-3">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[#0A1A2F]/55">
              Colonnes visibles
            </p>
            <div className="space-y-2">
              {columnDefinitions.map((column) => {
                const checked = visibleColumns.includes(column.key);

                return (
                  <label
                    key={column.key}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm text-[#0A1A2F]"
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
