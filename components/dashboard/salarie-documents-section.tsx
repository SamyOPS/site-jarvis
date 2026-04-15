import { ChevronDown, ChevronLeft, ChevronRight, Download, Eye, MessageSquareText, Pencil, Trash2 } from "lucide-react";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { FolderOpen, RotateCcw } from "lucide-react";
import { DashboardDocumentList } from "@/components/dashboard/document-list";
import { DocumentFiltersBar } from "@/components/dashboard/document-filters-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  CraCalendarCell,
  CraEntryDraft,
  CraSummaryRow,
  DocumentFolderRow,
  SalarieDocumentRow as DocumentRow,
  SalarieRequestRow as RequestRow,
} from "@/features/dashboard/salarie/types";
import { cn } from "@/lib/utils";

type FilterOption = {
  value: string;
  label: string;
};

type SalarieDocumentsSectionProps = {
  storageScope?: string | null;
  preferencesAuthToken?: string | null;
  currentSubSection: string;
  documentsCardTitle: string;
  billingProfileReady: boolean;
  selectedCraId: string | null;
  selectedCraSummary: Pick<CraSummaryRow, "status" | "pdf_version"> | null;
  resetCraEditor: () => void;
  onGenerateCraPdf: () => void | Promise<void>;
  onGenerateInvoicePdf: () => void | Promise<void>;
  craGenerating: boolean;
  invoiceGenerating: boolean;
  craPeriodMonth: string;
  onCraPeriodMonthChange: (value: string) => void;
  shiftMonthInputValue: (value: string, offset: number) => string;
  craDraftTotalDays: number;
  craNotes: string;
  onCraNotesChange: (value: string) => void;
  weekdayLabels: string[];
  craCalendarCells: CraCalendarCell[];
  craEntriesByDate: Map<string, CraEntryDraft>;
  craEntries: CraEntryDraft[];
  toggleCraWorkDate: (workDate: string) => void;
  formatCraEntryDateLabel: (value: string) => string;
  updateCraEntry: (workDate: string, patch: { dayQuantity?: string; label?: string }) => void;
  visibleDocuments: DocumentRow[];
  documentTypeFilter: string;
  documentPeriodFilter: string;
  documentStatusFilter: string;
  documentFilterOptions: Record<"type" | "period" | "status" | "owner", FilterOption[]>;
  onDocumentTypeFilterChange: (value: string) => void;
  onDocumentPeriodFilterChange: (value: string) => void;
  onDocumentStatusFilterChange: (value: string) => void;
  onViewDocument: (document: DocumentRow) => void | Promise<void>;
  onDownloadDocument: (document: DocumentRow) => void | Promise<void>;
  onDeleteDocument: (document: DocumentRow) => void | Promise<void>;
  onRenameDocument: (document: DocumentRow) => void | Promise<void>;
  onOpenCommentDialog: (document: DocumentRow) => void;
  viewingDocumentId: string | null;
  downloadingDocumentId: string | null;
  deletingDocumentId: string | null;
  savingDocumentId: string | null;
  pendingRequests: RequestRow[];
  openUploadDialog: (requestId?: string) => void;
  currentFolderId: string | null;
  folders: DocumentFolderRow[];
  trashedFolders: DocumentFolderRow[];
  folderPath: DocumentFolderRow[];
  showFolderTrash: boolean;
  onNavigateFolder: (folderId: string | null) => void;
  onCreateFolder: () => void | Promise<void>;
  onMoveDocumentToFolder: (document: DocumentRow, folderId: string) => void | Promise<void>;
  onRenameFolder: (folderId: string, currentName: string) => void | Promise<void>;
  onDeleteFolder: (folderId: string) => void | Promise<void>;
  onRestoreFolder: (folderId: string) => void | Promise<void>;
  onPurgeFolder: (folderId: string) => void | Promise<void>;
  formatDate: (value: string | null) => string;
  formatMonth: (value: string | null) => string;
  formatDocumentStatus: (value: DocumentRow["status"]) => string;
};

export function SalarieDocumentsSection({
  storageScope,
  preferencesAuthToken,
  currentSubSection,
  documentsCardTitle,
  billingProfileReady,
  selectedCraId,
  selectedCraSummary,
  resetCraEditor,
  onGenerateCraPdf,
  onGenerateInvoicePdf,
  craGenerating,
  invoiceGenerating,
  craPeriodMonth,
  onCraPeriodMonthChange,
  shiftMonthInputValue,
  craDraftTotalDays,
  craNotes,
  onCraNotesChange,
  weekdayLabels,
  craCalendarCells,
  craEntriesByDate,
  craEntries,
  toggleCraWorkDate,
  formatCraEntryDateLabel,
  updateCraEntry,
  visibleDocuments,
  documentTypeFilter,
  documentPeriodFilter,
  documentStatusFilter,
  documentFilterOptions,
  onDocumentTypeFilterChange,
  onDocumentPeriodFilterChange,
  onDocumentStatusFilterChange,
  onViewDocument,
  onDownloadDocument,
  onDeleteDocument,
  onRenameDocument,
  onOpenCommentDialog,
  viewingDocumentId,
  downloadingDocumentId,
  deletingDocumentId,
  savingDocumentId,
  pendingRequests,
  openUploadDialog,
  currentFolderId,
  folders,
  trashedFolders,
  folderPath,
  showFolderTrash,
  onNavigateFolder,
  onCreateFolder,
  onMoveDocumentToFolder,
  onRenameFolder,
  onDeleteFolder,
  onRestoreFolder,
  onPurgeFolder,
  formatDate,
  formatMonth,
  formatDocumentStatus,
}: SalarieDocumentsSectionProps) {
  type DocumentsListItem =
    | {
      rowType: "folder";
      folderId: string;
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
    }
    | ({
      rowType: "document";
      document: DocumentRow;
    } & {
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
    });

  const [documentsMenuOpen, setDocumentsMenuOpen] = useState(false);
  const documentsMenuRef = useRef<HTMLDivElement | null>(null);
  const trashListItems = useMemo<DocumentsListItem[]>(
    () =>
      [...trashedFolders]
        .sort((left, right) => left.name.localeCompare(right.name, "fr"))
        .map((folder) => ({
          rowType: "folder",
          folderId: folder.id,
          id: `trash-folder:${folder.id}`,
          fileName: folder.name,
          typeLabel: "Dossier",
          ownerName: "-",
          createdAt: folder.deletedAt ?? folder.updatedAt ?? folder.createdAt,
          sizeBytes: null,
          subtitle: "Dans la corbeille",
          hideDetailsPanel: true,
        })),
    [trashedFolders],
  );
  const documentsById = useMemo(
    () => new Map(visibleDocuments.map((document) => [document.id, document])),
    [visibleDocuments],
  );
  const listItems = useMemo<DocumentsListItem[]>(() => {
    const documentItems: DocumentsListItem[] = visibleDocuments.map((document) => ({
      rowType: "document",
      document,
      id: document.id,
      fileName: document.fileName,
      typeLabel: document.typeLabel,
      ownerName: document.uploadedByName,
      createdAt: document.createdAt,
      statusLabel: formatDocumentStatus(document.status),
      periodLabel: formatMonth(document.periodMonth),
      sizeBytes: document.sizeBytes,
      details: document.reviewComment ? `Commentaire RH : ${document.reviewComment}` : null,
    }));

    if (currentSubSection !== "docs_tous") {
      return documentItems;
    }

    const shouldShowFoldersByType =
      documentTypeFilter === "all" || documentTypeFilter === "Dossier";

    const folderItems: DocumentsListItem[] = currentFolderId || !shouldShowFoldersByType
      ? []
      : [...folders]
        .sort((left, right) => left.name.localeCompare(right.name, "fr"))
        .map((folder) => ({
          rowType: "folder",
          folderId: folder.id,
          id: `folder:${folder.id}`,
          fileName: folder.name,
          typeLabel: "Dossier",
          ownerName: "-",
          createdAt: folder.createdAt,
          sizeBytes: null,
          hideDetailsPanel: true,
        }));

    return [...folderItems, ...documentItems];
  }, [currentFolderId, currentSubSection, documentTypeFilter, folders, formatDocumentStatus, formatMonth, visibleDocuments]);

  useEffect(() => {
    if (!documentsMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!documentsMenuRef.current?.contains(event.target as Node)) {
        setDocumentsMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDocumentsMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [documentsMenuOpen]);

  return (
    <section className="space-y-4">
      <div className="flex flex-row items-center justify-between gap-3">
        {currentSubSection === "docs_tous" ? (
          <div ref={documentsMenuRef} className="relative">
            {showFolderTrash ? (
              <button
                type="button"
                onClick={() => setDocumentsMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-lg px-2 py-1 text-lg font-semibold text-[#0A1A2F] transition hover:bg-slate-100"
                aria-haspopup="menu"
                aria-expanded={documentsMenuOpen}
              >
                <span>Corbeille</span>
                <ChevronDown className={`h-4 w-4 transition ${documentsMenuOpen ? "rotate-180" : ""}`} />
              </button>
            ) : folderPath.length === 0 ? (
              <button
                type="button"
                onClick={() => setDocumentsMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-lg px-2 py-1 text-lg font-semibold text-[#0A1A2F] transition hover:bg-slate-100"
                aria-haspopup="menu"
                aria-expanded={documentsMenuOpen}
              >
                <span>{documentsCardTitle}</span>
                <ChevronDown className={`h-4 w-4 transition ${documentsMenuOpen ? "rotate-180" : ""}`} />
              </button>
            ) : (
              <div className="flex items-center gap-2 text-lg font-semibold text-[#0A1A2F]">
                <button
                  type="button"
                  onClick={() => onNavigateFolder(null)}
                  className="rounded-lg px-2 py-1 transition hover:bg-slate-100"
                >
                  {documentsCardTitle}
                </button>
                {folderPath.map((folder, index) => {
                  const isLast = index === folderPath.length - 1;
                  return (
                    <Fragment key={folder.id}>
                      <span className="text-[#0A1A2F]/45">&gt;</span>
                      {isLast ? (
                        <button
                          type="button"
                          onClick={() => setDocumentsMenuOpen((open) => !open)}
                          className="flex items-center gap-2 rounded-lg px-2 py-1 transition hover:bg-slate-100"
                          aria-haspopup="menu"
                          aria-expanded={documentsMenuOpen}
                        >
                          <span>{folder.name}</span>
                          <ChevronDown className={`h-4 w-4 transition ${documentsMenuOpen ? "rotate-180" : ""}`} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onNavigateFolder(folder.id)}
                          className="rounded-lg px-2 py-1 transition hover:bg-slate-100"
                        >
                          {folder.name}
                        </button>
                      )}
                    </Fragment>
                  );
                })}
              </div>
            )}
            {documentsMenuOpen ? (
              <div className="absolute left-0 top-full z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2">
                {!showFolderTrash ? (
                  <>
                    <button
                      type="button"
                      className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-[#0A1A2F]/80 transition hover:bg-slate-50"
                      onClick={() => {
                        setDocumentsMenuOpen(false);
                        void onCreateFolder();
                      }}
                    >
                      Nouveau dossier
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-[#0A1A2F] transition hover:bg-slate-50"
                      onClick={() => {
                        setDocumentsMenuOpen(false);
                        openUploadDialog();
                      }}
                    >
                      Importer un fichier
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-[#0A1A2F]/80 transition hover:bg-slate-50"
                      onClick={() => setDocumentsMenuOpen(false)}
                    >
                      Importer un dossier
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <h2 className="text-lg font-semibold text-[#0A1A2F]">{documentsCardTitle}</h2>
        )}
      </div>
      <div>
        {currentSubSection === "docs_cra_facture" ? (
          <div className="space-y-6">
            <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-[#0A1A2F]/80">
              Cette page permet de generer un CRA et une facture PDF a partir de la meme periode de travail.
            </div>

            <div className="max-w-5xl">
              <Card className="border-0 shadow-none">
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">
                      {selectedCraId ? "CRA en cours" : "Nouveau CRA"}
                    </CardTitle>
                    <p className="mt-1 text-sm text-[#0A1A2F]/70">
                      {selectedCraSummary
                        ? `Statut actuel: ${selectedCraSummary.status} | PDF v${selectedCraSummary.pdf_version}`
                        : "Selectionne tes jours, puis genere directement le PDF depuis cette page."}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={resetCraEditor}>
                      Remettre a 0
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void onGenerateCraPdf()}
                      disabled={craGenerating || invoiceGenerating}
                    >
                      {craGenerating ? "Generation..." : "Generer un CRA"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void onGenerateInvoicePdf()}
                      disabled={invoiceGenerating || craGenerating}
                    >
                      {invoiceGenerating ? "Generation..." : "Generer une facture"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {!billingProfileReady ? (
                    <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      Enregistre d&apos;abord ton profil de facturation pour pouvoir creer un CRA.
                    </div>
                  ) : null}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Periode</label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => onCraPeriodMonthChange(shiftMonthInputValue(craPeriodMonth, -1))}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <input
                          type="month"
                          value={craPeriodMonth}
                          onChange={(event) => onCraPeriodMonthChange(event.target.value)}
                          className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => onCraPeriodMonthChange(shiftMonthInputValue(craPeriodMonth, 1))}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Total saisi</label>
                      <div className="flex h-10 items-center rounded-md bg-slate-50 px-3 text-sm">
                        {craDraftTotalDays.toFixed(2)} jour(s)
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Notes</label>
                    <textarea
                      value={craNotes}
                      onChange={(event) => onCraNotesChange(event.target.value)}
                      rows={4}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Commentaire interne, precision de mission, etc."
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">Journees travaillees</p>
                        <p className="text-sm text-[#0A1A2F]/70">
                          Clique sur les jours travailles dans le calendrier pour les ajouter ou les retirer.
                        </p>
                      </div>
                      <Badge variant="outline">{craEntries.length} selection(s)</Badge>
                    </div>
                    <div className="rounded-xl bg-slate-50/70 p-4">
                      <div className="mb-3 grid grid-cols-7 gap-2">
                        {weekdayLabels.map((label) => (
                          <div
                            key={label}
                            className="px-1 text-center text-xs font-medium uppercase tracking-wide text-[#0A1A2F]/50"
                          >
                            {label}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-2">
                        {craCalendarCells.map((cell, index) => {
                          const isoDate = cell.isoDate;
                          const dayNumber = cell.dayNumber;

                          if (!isoDate || !dayNumber) {
                            return (
                              <div
                                key={`empty-${index}`}
                                className="aspect-square rounded-lg bg-slate-50/60"
                              />
                            );
                          }

                          const parsedDate = new Date(`${isoDate}T00:00:00`);
                          const isWeekend = [0, 6].includes(parsedDate.getDay());
                          const isSelected = craEntriesByDate.has(isoDate);

                          return (
                            <button
                              key={isoDate}
                              type="button"
                              onClick={() => toggleCraWorkDate(isoDate)}
                              className={cn(
                                "aspect-square rounded-lg border border-transparent text-sm transition-colors",
                                isSelected
                                  ? "border-[#2aa0dd] bg-[#2aa0dd] text-white"
                                  : "bg-white text-[#0A1A2F] hover:bg-slate-100",
                                isWeekend && !isSelected ? "text-[#0A1A2F]/55" : "",
                              )}
                              aria-pressed={isSelected}
                            >
                              {dayNumber}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-sm font-medium">Jours selectionnes</p>
                      {craEntries.length ? (
                        craEntries.map((entry) => (
                          <div
                            key={entry.workDate}
                            className="grid gap-3 rounded-lg bg-slate-50 p-3 md:grid-cols-[1.1fr_120px_1.3fr_auto]"
                          >
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-[#0A1A2F]/70">Date</label>
                              <div className="flex h-10 items-center rounded-md bg-white px-3 text-sm capitalize">
                                {formatCraEntryDateLabel(entry.workDate)}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-[#0A1A2F]/70">Jours</label>
                              <input
                                type="number"
                                min="0.25"
                                max="1"
                                step="0.25"
                                value={entry.dayQuantity}
                                onChange={(event) =>
                                  updateCraEntry(entry.workDate, { dayQuantity: event.target.value })
                                }
                                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-[#0A1A2F]/70">Libelle</label>
                              <input
                                value={entry.label}
                                onChange={(event) =>
                                  updateCraEntry(entry.workDate, { label: event.target.value })
                                }
                                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                                placeholder="Mission client, support, intervention..."
                              />
                            </div>
                            <div className="flex items-end">
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => toggleCraWorkDate(entry.workDate)}
                              >
                                Retirer
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-lg bg-slate-50 px-4 py-6 text-sm text-[#0A1A2F]/65">
                          Aucun jour selectionne pour cette periode.
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        ) : currentSubSection === "docs_a_deposer" ? (
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
        ) : (
          <div className="space-y-1">
            {!showFolderTrash ? (
              <DocumentFiltersBar
                fields={["type", "period", "status"]}
                values={{
                  type: documentTypeFilter,
                  period: documentPeriodFilter,
                  status: documentStatusFilter,
                  owner: "all",
                }}
                options={documentFilterOptions}
                onChange={(field, value) => {
                  if (field === "type") onDocumentTypeFilterChange(value);
                  if (field === "period") onDocumentPeriodFilterChange(value);
                  if (field === "status") onDocumentStatusFilterChange(value);
                }}
              />
            ) : null}
            {showFolderTrash ? (
              trashListItems.length ? (
                <DashboardDocumentList
                  items={trashListItems}
                  storageKey="salarie-documents-trash-columns"
                  storageScope={storageScope}
                  preferencesAuthToken={preferencesAuthToken}
                  renderActions={(item, closeMenu) => {
                    if (item.rowType !== "folder") return null;
                    return (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => {
                            closeMenu();
                            void onRestoreFolder(item.folderId);
                          }}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Restaurer
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-red-600 hover:text-red-700"
                          onClick={() => {
                            closeMenu();
                            void onPurgeFolder(item.folderId);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer definitivement
                        </Button>
                      </>
                    );
                  }}
                />
              ) : (
                <p className="text-sm text-[#0A1A2F]/70">La corbeille est vide.</p>
              )
            ) : listItems.length ? (
              <DashboardDocumentList
                items={listItems}
                storageKey="salarie-documents-columns"
                storageScope={storageScope}
                preferencesAuthToken={preferencesAuthToken}
                columnControlPlacement="inline"
                onItemDoubleClick={(item) => {
                  if (item.rowType === "folder") {
                    onNavigateFolder(item.folderId);
                  }
                }}
                isItemDoubleClickable={(item) => item.rowType === "folder"}
                getDraggableId={(item) => (item.rowType === "document" ? item.document.id : null)}
                canDropOnItem={(targetItem, draggedId) => {
                  if (targetItem.rowType !== "folder") return false;
                  const draggedDocument = documentsById.get(draggedId);
                  if (!draggedDocument) return false;
                  return (draggedDocument.folderId ?? null) !== targetItem.folderId;
                }}
                onItemDrop={async (targetItem, draggedId) => {
                  if (targetItem.rowType !== "folder") return;
                  const draggedDocument = documentsById.get(draggedId);
                  if (!draggedDocument) return;
                  await onMoveDocumentToFolder(draggedDocument, targetItem.folderId);
                }}
                renderActions={(item, closeMenu) => {
                  if (item.rowType === "folder") {
                    return (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => {
                            closeMenu();
                            onNavigateFolder(item.folderId);
                          }}
                          disabled={currentFolderId === item.folderId}
                        >
                          <FolderOpen className="mr-2 h-4 w-4" />
                          Ouvrir le dossier
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => {
                            closeMenu();
                            void onRenameFolder(item.folderId, item.fileName);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Renommer
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-red-600 hover:text-red-700"
                          onClick={() => {
                            closeMenu();
                            void onDeleteFolder(item.folderId);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </Button>
                      </>
                    );
                  }

                  const document = item.document;

                  return (
                    <>
                      {document.fileName.toLowerCase().endsWith(".pdf") ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => {
                            closeMenu();
                            void onViewDocument(document);
                          }}
                          disabled={
                            !document.storagePath ||
                            viewingDocumentId === document.id ||
                            downloadingDocumentId === document.id
                          }
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Visualiser
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => {
                          closeMenu();
                          void onDownloadDocument(document);
                        }}
                        disabled={
                          !document.storagePath ||
                          downloadingDocumentId === document.id ||
                          viewingDocumentId === document.id
                        }
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Télécharger
                      </Button>
                      {document.reviewComment ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => {
                            closeMenu();
                            onOpenCommentDialog(document);
                          }}
                        >
                          <MessageSquareText className="mr-2 h-4 w-4" />
                          Voir commentaire RH
                        </Button>
                      ) : null}
                      {document.status !== "validated" ? (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => {
                              closeMenu();
                              void onRenameDocument(document);
                            }}
                            disabled={
                              deletingDocumentId === document.id || savingDocumentId === document.id
                            }
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Renommer
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-red-600 hover:text-red-700"
                            onClick={() => {
                              closeMenu();
                              void onDeleteDocument(document);
                            }}
                            disabled={
                              deletingDocumentId === document.id || savingDocumentId === document.id
                            }
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </Button>
                        </>
                      ) : (
                        <Badge variant="outline">Verrouillé</Badge>
                      )}
                    </>
                  );
                }}
              />
            ) : (
              <p className="text-sm text-[#0A1A2F]/70">Aucun document depose pour le moment.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}




