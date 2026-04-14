"use client";

import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  File,
  FileAudio2,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  MoreVertical,
  SlidersHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

type DashboardDocumentListItem = {
  id: string;
  fileName: string;
  typeLabel: string;
  statusLabel?: string | null;
  periodLabel?: string | null;
  ownerName: string;
  createdAt: string | null;
  sizeBytes: number | null;
  subtitle?: string | null;
  details?: string | null;
  hideDetailsPanel?: boolean;
};

type DashboardDocumentListProps<T extends DashboardDocumentListItem> = {
  items: T[];
  renderActions?: (item: T, closeMenu: () => void) => ReactNode;
  storageKey?: string;
  onItemDoubleClick?: (item: T) => void;
  isItemDoubleClickable?: (item: T) => boolean;
  getDraggableId?: (item: T) => string | null;
  canDropOnItem?: (targetItem: T, draggedId: string) => boolean;
  onItemDrop?: (targetItem: T, draggedId: string) => void | Promise<void>;
};

type ColumnKey = "type" | "status" | "period" | "owner" | "createdAt" | "size";

const columnDefinitions: Array<{ key: ColumnKey; label: string; widthClass: string }> = [
  { key: "type", label: "Type", widthClass: "w-[160px]" },
  { key: "status", label: "Statut", widthClass: "w-[140px]" },
  { key: "period", label: "Période", widthClass: "w-[180px]" },
  { key: "owner", label: "Propriétaire", widthClass: "w-[220px]" },
  { key: "createdAt", label: "Date de création", widthClass: "w-[220px]" },
  { key: "size", label: "Taille du fichier", widthClass: "w-[150px]" },
];

const defaultVisibleColumns: ColumnKey[] = ["owner", "createdAt", "size"];

function formatCreatedDate(value: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  return parsed.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatFileSize(value: number | null) {
  if (!value || value <= 0) return "—";

  const units = ["o", "Ko", "Mo", "Go"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const digits = size >= 10 || unitIndex === 0 ? 0 : 1;
  return `${size.toLocaleString("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} ${units[unitIndex]}`;
}

function formatActionDetails(details: string | null | undefined) {
  if (!details) return null;

  return details.replace(/^Commentaire RH\s*:\s*/i, "").trim() || null;
}

function getHiddenColumnValues<T extends DashboardDocumentListItem>(
  item: T,
  visibleColumns: ColumnKey[],
) {
  const values: string[] = [];

  if (!visibleColumns.includes("type") && item.typeLabel) {
    values.push(item.typeLabel);
  }
  if (!visibleColumns.includes("status") && item.statusLabel) {
    values.push(item.statusLabel);
  }
  if (!visibleColumns.includes("period") && item.periodLabel && item.periodLabel !== "-") {
    values.push(item.periodLabel);
  }
  if (!visibleColumns.includes("owner") && item.ownerName) {
    values.push(item.ownerName);
  }
  if (!visibleColumns.includes("createdAt")) {
    const createdAt = formatCreatedDate(item.createdAt);
    if (createdAt !== "-") {
      values.push(createdAt);
    }
  }
  if (!visibleColumns.includes("size")) {
    const fileSize = formatFileSize(item.sizeBytes);
    if (fileSize !== "—") {
      values.push(fileSize);
    }
  }

  return values;
}

function getFileExtension(fileName: string) {
  const segments = fileName.toLowerCase().split(".");
  return segments.length > 1 ? segments.at(-1) ?? "" : "";
}

function getFileIcon(fileName: string, typeLabel?: string) {
  if ((typeLabel ?? "").toLowerCase().includes("dossier")) {
    return <Folder className="h-5 w-5 text-[#4b5563]" />;
  }
  const extension = getFileExtension(fileName);

  if (!extension) {
    return <Folder className="h-5 w-5 text-[#4b5563]" />;
  }
  if (["pdf"].includes(extension)) {
    return <FileText className="h-5 w-5 text-[#ef4444]" />;
  }
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension)) {
    return <FileImage className="h-5 w-5 text-[#f97316]" />;
  }
  if (["m4a", "mp3", "wav", "ogg"].includes(extension)) {
    return <FileAudio2 className="h-5 w-5 text-[#2563eb]" />;
  }
  if (["xls", "xlsx", "csv"].includes(extension)) {
    return <FileSpreadsheet className="h-5 w-5 text-[#16a34a]" />;
  }

  return <File className="h-5 w-5 text-[#2563eb]" />;
}

function getInitialVisibleColumns(storageKey?: string) {
  if (!storageKey || typeof window === "undefined") {
    return defaultVisibleColumns;
  }

  const savedValue = window.localStorage.getItem(storageKey);
  if (!savedValue) {
    return defaultVisibleColumns;
  }

  try {
    const parsedValue = JSON.parse(savedValue) as ColumnKey[];
    const allowedValues = parsedValue.filter((value) =>
      columnDefinitions.some((definition) => definition.key === value),
    );
    return allowedValues.length ? allowedValues : defaultVisibleColumns;
  } catch {
    return defaultVisibleColumns;
  }
}

export function DashboardDocumentList<T extends DashboardDocumentListItem>({
  items,
  renderActions,
  storageKey,
  onItemDoubleClick,
  isItemDoubleClickable,
  getDraggableId,
  canDropOnItem,
  onItemDrop,
}: DashboardDocumentListProps<T>) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(defaultVisibleColumns);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleColumns(getInitialVisibleColumns(storageKey));
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(visibleColumns));
  }, [storageKey, visibleColumns]);

  useEffect(() => {
    if (!menuOpen && !actionMenuId) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setActionMenuId(null);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [actionMenuId, menuOpen]);

  const activeColumns = useMemo(
    () => columnDefinitions.filter((definition) => visibleColumns.includes(definition.key)),
    [visibleColumns],
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

  return (
    <div className="bg-white">
      <div className="mb-2 flex justify-end" ref={menuRef}>
        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2 text-[#0A1A2F]/75 hover:text-[#0A1A2F]"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <SlidersHorizontal className="h-4 w-4" />
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
                        onCheckedChange={() => toggleColumn(column.key)}
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
                    event.dataTransfer.setData("text/x-dashboard-item-id", draggedId);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => setDragOverItemId(null)}
                  onDragOver={(event) => {
                    if (!onItemDrop) return;
                    const draggedId = event.dataTransfer.getData("text/x-dashboard-item-id");
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
                    const draggedId = event.dataTransfer.getData("text/x-dashboard-item-id");
                    setDragOverItemId(null);
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
                        const subtitleParts = [...hiddenColumnValues, ...(item.subtitle ? [item.subtitle] : [])];
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
                  <td className="px-4 py-3 align-middle text-[#0A1A2F]/80">
                    {item.statusLabel ?? "-"}
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-[#0A1A2F]/70 hover:text-[#0A1A2F]"
                      onClick={() => setActionMenuId((currentId) => (currentId === item.id ? null : item.id))}
                      aria-label={`Ouvrir les actions pour ${item.fileName}`}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
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
