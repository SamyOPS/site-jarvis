"use client";

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { MoreVertical } from "lucide-react";

import type { DocumentListItem } from "@/domain/documents";
import { Button } from "@/components/ui/button";
import { ColumnVisibilityMenu } from "@/components/dashboard/document-list/column-visibility-menu";
import {
  columnDefinitions,
  type ColumnKey,
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

type DashboardDocumentListProps<T extends DocumentListItem> = {
  items: T[];
  renderActions?: (item: T, closeMenu: () => void) => ReactNode;
  renderActionCell?: (item: T) => ReactNode;
  storageKey?: string;
  storageScope?: string | null;
  preferencesAuthToken?: string | null;
  createdAtLabel?: string;
  columnControlPlacement?: "stacked" | "inline";
  /** Contenu place a gauche de la barre d'outils : filtres, fil d'Ariane de dossiers... */
  toolbar?: ReactNode;
  /** Nom de l'element compte a droite de la barre d'outils. */
  countLabelSingular?: string;
  countLabelPlural?: string;
  onItemDoubleClick?: (item: T) => void;
  isItemDoubleClickable?: (item: T) => boolean;
  getDraggableId?: (item: T) => string | null;
  onDragItemStart?: (item: T, draggedId: string) => void;
  onDragItemEnd?: () => void;
  canDropOnItem?: (targetItem: T, draggedId: string) => boolean;
  onItemDrop?: (targetItem: T, draggedId: string) => void | Promise<void>;
};

export function DashboardDocumentList<T extends DocumentListItem>({
  items,
  renderActions,
  renderActionCell,
  storageKey,
  storageScope,
  preferencesAuthToken,
  createdAtLabel = "Date de creation",
  columnControlPlacement = "stacked",
  toolbar,
  countLabelSingular = "document",
  countLabelPlural = "documents",
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

  const frame = "relative rounded-app-card border border-app-line bg-app-surface";

  if (!columnsInitialized) {
    // Meme cadre pendant le chargement des preferences de colonnes : sans lui, la carte
    // apparaissait apres coup et la page sautait.
    return <div className={`${frame} h-12`} />;
  }

  return (
    <div className={frame}>
      {/*
        Barre d'outils, dans le cadre et separee par un filet — meme forme que la liste des
        collaborateurs : controles a gauche, decompte a droite.
      */}
      <div className="flex flex-wrap items-center gap-3 border-b border-app-line p-4">
        <div className="min-w-0 flex-1">{toolbar}</div>
        <ColumnVisibilityMenu
          visibleColumns={visibleColumns}
          onToggle={toggleColumn}
          placement={columnControlPlacement}
        />
        <span className="shrink-0 text-app-sm text-app-text-muted">
          {items.length} {items.length > 1 ? countLabelPlural : countLabelSingular}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed text-app-sm">
          <thead className="border-b border-app-line text-left text-app-xs font-medium text-app-text-muted">
            <tr>
              <th className="px-3 py-3 font-medium sm:px-4">Nom</th>
              {activeColumns.map((column) => (
                <th
                  key={column.key}
                  className={`${column.widthClass} hidden px-4 py-3 font-medium sm:table-cell`}
                >
                  {column.label}
                </th>
              ))}
              <th className="w-auto px-3 py-3 font-medium text-right sm:w-[200px] sm:px-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-line">
            {items.map((item) => (
              <Fragment key={item.id}>
                <tr
                  className={`transition-colors hover:bg-app-surface-hover ${dragOverItemId === item.id ? "bg-app-surface-hover/70" : ""} ${(isItemDoubleClickable ? isItemDoubleClickable(item) : false) ? "cursor-pointer" : ""}`}
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
                  <td className="px-3 py-3 align-middle sm:px-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">{getFileIcon(item.fileName, item.typeLabel)}</div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-app-text" title={item.fileName}>
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
                            <p className="mt-1 truncate text-app-xs text-app-text-muted" title={subtitle}>
                              {subtitle}
                            </p>
                          );
                        })()}
                      </div>
                    </div>
                  </td>

                  {visibleColumns.includes("type") ? (
                    <td className="hidden px-4 py-3 align-middle sm:table-cell">
                      <span className="inline-flex rounded-app-control border border-app-line px-2 py-1 text-app-xs font-medium text-app-text-secondary">
                        {item.typeLabel}
                      </span>
                    </td>
                  ) : null}

                  {visibleColumns.includes("status") ? (
                    <td className="hidden px-4 py-3 align-middle sm:table-cell">
                      {item.statusLabel ? (
                        <span
                          className={`inline-flex rounded-app-control border px-2 py-1 text-app-xs font-medium ${getStatusBadgeClass(item.statusLabel)}`}
                        >
                          {item.statusLabel}
                        </span>
                      ) : (
                        <span className="text-app-text-secondary">-</span>
                      )}
                    </td>
                  ) : null}

                  {visibleColumns.includes("period") ? (
                    <td className="hidden px-4 py-3 align-middle text-app-text-secondary sm:table-cell">
                      {item.periodLabel ?? "-"}
                    </td>
                  ) : null}

                  {visibleColumns.includes("owner") ? (
                    <td className="hidden px-4 py-3 align-middle sm:table-cell">
                      <span className="truncate text-app-text-secondary">{item.ownerName}</span>
                    </td>
                  ) : null}

                  {visibleColumns.includes("createdAt") ? (
                    <td className="hidden px-4 py-3 align-middle text-app-text-secondary sm:table-cell">
                      {formatCreatedDate(item.createdAt)}
                    </td>
                  ) : null}

                  {visibleColumns.includes("size") ? (
                    <td className="hidden px-4 py-3 align-middle text-app-text-secondary sm:table-cell">
                      {formatFileSize(item.sizeBytes)}
                    </td>
                  ) : null}

                  <td className="px-3 py-3 align-middle sm:px-4">
                    <div className="flex justify-end">
                      {renderActionCell ? (
                        renderActionCell(item)
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-app-text-secondary hover:text-app-text"
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
                  <tr className="bg-app-surface-hover">
                    <td colSpan={activeColumns.length + 2} className="px-3 py-3 sm:px-4">
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
                            <div className="rounded-xl border border-app-line bg-app-surface px-4 py-3">
                              <p className="text-app-xs font-medium uppercase tracking-wide text-app-text/55">
                                Commentaire RH
                              </p>
                              <p className="mt-2 whitespace-pre-wrap text-app-sm text-app-text-secondary">
                                {formatActionDetails(item.details)}
                              </p>
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-app-line px-4 py-3 text-app-sm text-app-text/55">
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
