"use client";

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { MoreVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ColumnVisibilityMenu } from "@/components/dashboard/document-list/column-visibility-menu";
import {
  columnDefinitions,
  type ColumnKey,
  type DashboardDocumentListItem,
} from "@/features/dashboard/document-list/columns";
import { getFileIcon } from "@/features/dashboard/document-list/file-icon";
import {
  formatActionDetails,
  formatCreatedDate,
  formatFileSize,
  getHiddenColumnValues,
  getStatusBadgeClass,
} from "@/features/dashboard/document-list/formatters";
import { useColumnPreferences } from "@/features/dashboard/document-list/use-column-preferences";

type DashboardDocumentListProps<T extends DashboardDocumentListItem> = {
  items: T[];
  renderActions?: (item: T, closeMenu: () => void) => ReactNode;
  renderActionCell?: (item: T) => ReactNode;
  storageKey?: string;
  storageScope?: string | null;
  preferencesAuthToken?: string | null;
  createdAtLabel?: string;
  columnControlPlacement?: "stacked" | "inline";
  onItemDoubleClick?: (item: T) => void;
  isItemDoubleClickable?: (item: T) => boolean;
  getDraggableId?: (item: T) => string | null;
  onDragItemStart?: (item: T, draggedId: string) => void;
  onDragItemEnd?: () => void;
  canDropOnItem?: (targetItem: T, draggedId: string) => boolean;
  onItemDrop?: (targetItem: T, draggedId: string) => void | Promise<void>;
};

export function DashboardDocumentList<T extends DashboardDocumentListItem>({
  items,
  renderActions,
  renderActionCell,
  storageKey,
  storageScope,
  preferencesAuthToken,
  createdAtLabel = "Date de creation",
  columnControlPlacement = "stacked",
  onItemDoubleClick,
  isItemDoubleClickable,
  getDraggableId,
  onDragItemStart,
  onDragItemEnd,
  canDropOnItem,
  onItemDrop,
}: DashboardDocumentListProps<T>) {
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  const { visibleColumns, setVisibleColumns, columnsInitialized } = useColumnPreferences({
    storageKey,
    storageScope,
    preferencesAuthToken,
  });

  useEffect(() => {
    if (!actionMenuId) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActionMenuId(null);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [actionMenuId]);

  const activeColumns = useMemo(
    () =>
      columnDefinitions
        .filter((definition) => visibleColumns.includes(definition.key))
        .map((definition) =>
          definition.key === "createdAt"
            ? { ...definition, label: createdAtLabel }
            : definition,
        ),
    [createdAtLabel, visibleColumns],
  );

  const toggleColumn = (columnKey: ColumnKey) => {
    setVisibleColumns((currentColumns) => {
      if (currentColumns.includes(columnKey)) {
        const nextColumns = currentColumns.filter((value) => value !== columnKey);
        return nextColumns.length ? nextColumns : currentColumns;
      }

      return [...currentColumns, columnKey];
    });
  };

  if (!columnsInitialized) {
    return <div className="h-12 bg-white" />;
  }

  return (
    <div className="relative bg-white">
      <ColumnVisibilityMenu
        visibleColumns={visibleColumns}
        onToggle={toggleColumn}
        placement={columnControlPlacement}
      />

      <div className="overflow-x-auto bg-white">
        <table className="min-w-full table-fixed text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/70 text-left text-xs font-medium text-[#0A1A2F]/70">
            <tr>
              <th className="px-4 py-3 font-medium">Nom</th>
              {activeColumns.map((column) => (
                <th key={column.key} className={`${column.widthClass} px-4 py-3 font-medium`}>
                  {column.label}
                </th>
              ))}
              <th className="w-[200px] px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((item) => (
              <Fragment key={item.id}>
                <tr
                  className={`transition-colors hover:bg-slate-50/60 ${dragOverItemId === item.id ? "bg-slate-100/70" : ""} ${(isItemDoubleClickable ? isItemDoubleClickable(item) : false) ? "cursor-pointer" : ""}`}
                  draggable={Boolean(getDraggableId?.(item))}
                  onDoubleClick={() => {
                    if (!onItemDoubleClick) return;
                    const enabled = isItemDoubleClickable ? isItemDoubleClickable(item) : true;
                    if (!enabled) return;
                    onItemDoubleClick(item);
                  }}
                  onDragStart={(event) => {
                    const draggedId = getDraggableId?.(item);
                    if (!draggedId) return;
                    setDraggedItemId(draggedId);
                    event.dataTransfer.setData("text/x-dashboard-item-id", draggedId);
                    event.dataTransfer.setData("text/plain", draggedId);
                    event.dataTransfer.effectAllowed = "move";
                    onDragItemStart?.(item, draggedId);
                  }}
                  onDragEnd={() => {
                    setDragOverItemId(null);
                    setDraggedItemId(null);
                    onDragItemEnd?.();
                  }}
                  onDragOver={(event) => {
                    if (!onItemDrop) return;
                    const draggedId =
                      draggedItemId ?? event.dataTransfer.getData("text/x-dashboard-item-id");
                    if (!draggedId) return;
                    const allowed = canDropOnItem ? canDropOnItem(item, draggedId) : true;
                    if (!allowed) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    if (dragOverItemId !== item.id) {
                      setDragOverItemId(item.id);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverItemId === item.id) {
                      setDragOverItemId(null);
                    }
                  }}
                  onDrop={(event) => {
                    if (!onItemDrop) return;
                    const draggedId =
                      draggedItemId ?? event.dataTransfer.getData("text/x-dashboard-item-id");
                    setDragOverItemId(null);
                    setDraggedItemId(null);
                    if (!draggedId) return;
                    const allowed = canDropOnItem ? canDropOnItem(item, draggedId) : true;
                    if (!allowed) return;
                    event.preventDefault();
                    void onItemDrop(item, draggedId);
                  }}
                >
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">{getFileIcon(item.fileName, item.typeLabel)}</div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[#0A1A2F]" title={item.fileName}>
                          {item.fileName}
                        </p>
                        {(() => {
                          const hiddenColumnValues = getHiddenColumnValues(item, visibleColumns);
                          const subtitleParts = [
                            ...hiddenColumnValues,
                            ...(item.subtitle ? [item.subtitle] : []),
                          ];
                          const subtitle = subtitleParts.filter(Boolean).join(" • ");

                          if (!subtitle) {
                            return null;
                          }

                          return (
                            <p className="mt-1 truncate text-xs text-[#0A1A2F]/60" title={subtitle}>
                              {subtitle}
                            </p>
                          );
                        })()}
                      </div>
                    </div>
                  </td>

                  {visibleColumns.includes("type") ? (
                    <td className="px-4 py-3 align-middle">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-[#0A1A2F]/75">
                        {item.typeLabel}
                      </span>
                    </td>
                  ) : null}

                  {visibleColumns.includes("status") ? (
                    <td className="px-4 py-3 align-middle">
                      {item.statusLabel ? (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(item.statusLabel)}`}
                        >
                          {item.statusLabel}
                        </span>
                      ) : (
                        <span className="text-[#0A1A2F]/80">-</span>
                      )}
                    </td>
                  ) : null}

                  {visibleColumns.includes("period") ? (
                    <td className="px-4 py-3 align-middle text-[#0A1A2F]/80">
                      {item.periodLabel ?? "-"}
                    </td>
                  ) : null}

                  {visibleColumns.includes("owner") ? (
                    <td className="px-4 py-3 align-middle">
                      <span className="truncate text-[#0A1A2F]/80">{item.ownerName}</span>
                    </td>
                  ) : null}

                  {visibleColumns.includes("createdAt") ? (
                    <td className="px-4 py-3 align-middle text-[#0A1A2F]/70">
                      {formatCreatedDate(item.createdAt)}
                    </td>
                  ) : null}

                  {visibleColumns.includes("size") ? (
                    <td className="px-4 py-3 align-middle text-[#0A1A2F]/70">
                      {formatFileSize(item.sizeBytes)}
                    </td>
                  ) : null}

                  <td className="px-4 py-3 align-middle">
                    <div className="flex justify-end">
                      {renderActionCell ? (
                        renderActionCell(item)
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-[#0A1A2F]/70 hover:text-[#0A1A2F]"
                          onClick={() =>
                            setActionMenuId((currentId) =>
                              currentId === item.id ? null : item.id,
                            )
                          }
                          aria-label={`Ouvrir les actions pour ${item.fileName}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
                {actionMenuId === item.id ? (
                  <tr className="bg-slate-50/70">
                    <td colSpan={activeColumns.length + 2} className="px-4 py-3">
                      {item.hideDetailsPanel ? (
                        <div className="flex flex-col items-stretch gap-2 md:max-w-[340px]">
                          {renderActions ? renderActions(item, () => setActionMenuId(null)) : null}
                        </div>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-[minmax(260px,340px)_minmax(0,1fr)] md:items-start">
                          <div className="flex flex-col items-stretch gap-2">
                            {renderActions ? renderActions(item, () => setActionMenuId(null)) : null}
                          </div>
                          {formatActionDetails(item.details) ? (
                            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                              <p className="text-xs font-medium uppercase tracking-wide text-[#0A1A2F]/55">
                                Commentaire RH
                              </p>
                              <p className="mt-2 whitespace-pre-wrap text-sm text-[#0A1A2F]/80">
                                {formatActionDetails(item.details)}
                              </p>
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-[#0A1A2F]/55">
                              Aucun commentaire RH pour ce document.
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
