import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Download, Eye, RotateCcw, Trash2, X } from "lucide-react";

import { DashboardDocumentList } from "@/components/dashboard/document-list";
import { Fragment, useMemo } from "react";
import { FolderOpen, Pencil } from "lucide-react";
import { DocumentFiltersBar } from "@/components/dashboard/document-filters-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatCraEntryDateLabel,
  shiftMonthInputValue,
  WEEKDAY_LABELS,
} from "@/features/dashboard/salarie/cra";
import type { CraCalendarCell, CraEntryDraft } from "@/features/dashboard/salarie/types";
import type { RhDocumentFolderRow, RhDocumentRow, RhRequestRow as RequestRow } from "@/features/dashboard/rh/types";

const RH_SHARED_COLUMNS_STORAGE_KEY = "rh-documents-shared-columns";

type FilterOption = {
  value: string;
  label: string;
};

type RhDocumentsSectionProps = {
  storageScope?: string | null;
  preferencesAuthToken?: string | null;
  currentSubSection: string;
  documentTypeFilter: string;
  documentPeriodFilter: string;
  documentStatusFilter: string;
  documentCreatorFilter: string;
  rhFilterOptions: Record<"type" | "period" | "status" | "owner", FilterOption[]>;
  onDocumentTypeFilterChange: (value: string) => void;
  onDocumentPeriodFilterChange: (value: string) => void;
  onDocumentStatusFilterChange: (value: string) => void;
  onDocumentCreatorFilterChange: (value: string) => void;
  onOpenRhUploadDialog: () => void;
  onOpenRequestDialog: () => void;
  generateEmployeeId: string;
  generateBillingProfileEmployeeId: string;
  billingProfiles: {
    employeeId: string;
    profileLabel: string;
    employeeName: string;
    dailyRate: number;
    updatedAt: string | null;
  }[];
  employees: { id: string; full_name: string | null; email: string }[];
  craGenerating: boolean;
  invoiceGenerating: boolean;
  craPeriodMonth: string;
  craDraftTotalDays: number;
  craNotes: string;
  invoiceDiscountGranted: boolean;
  onInvoiceDiscountGrantedChange: (value: boolean) => void;
  invoiceAmountAlreadyPaid: string;
  onInvoiceAmountAlreadyPaidChange: (value: string) => void;
  craCalendarCells: CraCalendarCell[];
  craEntriesByDate: Map<string, CraEntryDraft>;
  craEntries: CraEntryDraft[];
  onGenerateEmployeeIdChange: (value: string) => void;
  onGenerateBillingProfileEmployeeIdChange: (value: string) => void;
  onCraPeriodMonthChange: (value: string) => void;
  onCraNotesChange: (value: string) => void;
  onGenerateCraPdf: () => void | Promise<void>;
  onGenerateInvoicePdf: () => void | Promise<void>;
  resetCraEditor: () => void;
  toggleCraWorkDate: (workDate: string) => void;
  updateCraEntry: (workDate: string, patch: Partial<CraEntryDraft>) => void;
  requests: RequestRow[];
  cancellingRequestId: string | null;
  onCancelRequest: (request: RequestRow) => void | Promise<void>;
  filteredAllDocuments: RhDocumentRow[];
  filteredSalarieDocuments: RhDocumentRow[];
  filteredPendingDocuments: RhDocumentRow[];
  filteredRhDocuments: RhDocumentRow[];
  trashedRhDocuments: RhDocumentRow[];
  rhFolders: RhDocumentFolderRow[];
  trashedRhFolders: RhDocumentFolderRow[];
  currentRhFolderId: string | null;
  rhFolderPath: RhDocumentFolderRow[];
  showRhFolderTrash: boolean;
  onRhNavigateFolder: (folderId: string | null) => void;
  onRhCreateFolder: () => void | Promise<void>;
  onRhRenameFolder: (folderId: string, currentName: string) => void | Promise<void>;
  onRhDeleteFolder: (folderId: string) => void | Promise<void>;
  onRhRestoreFolder: (folderId: string) => void | Promise<void>;
  onRhPurgeFolder: (folderId: string) => void | Promise<void>;
  onRhMoveDocumentToFolder: (document: RhDocumentRow, folderId: string) => void | Promise<void>;
  onRhMoveDocumentToRoot: (document: RhDocumentRow) => void | Promise<void>;
  onViewDocument: (document: RhDocumentRow) => void | Promise<void>;
  onDownloadDocument: (document: RhDocumentRow) => void | Promise<void>;
  onReviewDocument: (document: RhDocumentRow, status: "pending" | "validated" | "rejected") => void | Promise<void>;
  onDeleteRhDocument: (document: RhDocumentRow) => void | Promise<void>;
  onRestoreRhDocument: (document: RhDocumentRow) => void | Promise<void>;
  onDeleteRhDocumentPermanently: (document: RhDocumentRow) => void | Promise<void>;
  viewingDocumentId: string | null;
  downloadingDocumentId: string | null;
  reviewingDocumentId: string | null;
  deletingRhDocumentId: string | null;
  reviewDrafts: Record<string, string>;
  onReviewDraftsChange: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  formatMonth: (value: string | null) => string;
  formatDate: (value: string | null) => string;
  formatDocumentStatus: (value: RhDocumentRow["status"]) => string;
};

export function RhDocumentsSection({
  storageScope,
  preferencesAuthToken,
  currentSubSection,
  documentTypeFilter,
  documentPeriodFilter,
  documentStatusFilter,
  documentCreatorFilter,
  rhFilterOptions,
  onDocumentTypeFilterChange,
  onDocumentPeriodFilterChange,
  onDocumentStatusFilterChange,
  onDocumentCreatorFilterChange,
  onOpenRhUploadDialog,
  onOpenRequestDialog,
  generateEmployeeId,
  generateBillingProfileEmployeeId,
  billingProfiles,
  employees,
  craGenerating,
  invoiceGenerating,
  craPeriodMonth,
  craDraftTotalDays,
  craNotes,
  invoiceDiscountGranted,
  onInvoiceDiscountGrantedChange,
  invoiceAmountAlreadyPaid,
  onInvoiceAmountAlreadyPaidChange,
  craCalendarCells,
  craEntriesByDate,
  craEntries,
  onGenerateEmployeeIdChange,
  onGenerateBillingProfileEmployeeIdChange,
  onCraPeriodMonthChange,
  onCraNotesChange,
  onGenerateCraPdf,
  onGenerateInvoicePdf,
  resetCraEditor,
  toggleCraWorkDate,
  updateCraEntry,
  requests,
  cancellingRequestId,
  onCancelRequest,
  filteredAllDocuments,
  filteredSalarieDocuments,
  filteredPendingDocuments,
  filteredRhDocuments,
  trashedRhDocuments,
  rhFolders,
  trashedRhFolders,
  currentRhFolderId,
  rhFolderPath,
  showRhFolderTrash,
  onRhNavigateFolder,
  onRhCreateFolder,
  onRhRenameFolder,
  onRhDeleteFolder,
  onRhRestoreFolder,
  onRhPurgeFolder,
  onRhMoveDocumentToFolder,
  onRhMoveDocumentToRoot,
  onViewDocument,
  onDownloadDocument,
  onReviewDocument,
  onDeleteRhDocument,
  onRestoreRhDocument,
  onDeleteRhDocumentPermanently,
  viewingDocumentId,
  downloadingDocumentId,
  reviewingDocumentId,
  deletingRhDocumentId,
  reviewDrafts,
  onReviewDraftsChange,
  formatMonth,
  formatDate,
  formatDocumentStatus,
}: RhDocumentsSectionProps) {
  type RhDocumentsListItem =
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
      document: RhDocumentRow;
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
  const [draggedRhDocumentId, setDraggedRhDocumentId] = useState<string | null>(null);
  const [reviewDialogDocument, setReviewDialogDocument] = useState<RhDocumentRow | null>(null);
  const [reviewDialogStatus, setReviewDialogStatus] = useState<"pending" | "validated" | "rejected" | null>(null);
  const [reviewDialogComment, setReviewDialogComment] = useState("");
  const rhTrashListItems = useMemo<RhDocumentsListItem[]>(
    () =>
      [...trashedRhFolders]
        .filter((folder) =>
          documentTypeFilter === "all" || documentTypeFilter === "Dossier",
        )
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
    [documentTypeFilter, trashedRhFolders],
  );
  const rhTrashedDocumentItems = useMemo<RhDocumentsListItem[]>(
    () =>
      trashedRhDocuments
        .filter((document) =>
          (documentTypeFilter === "all" || document.typeLabel === documentTypeFilter) &&
          (documentPeriodFilter === "all" ||
            (document.periodMonth ?? "__none__") === documentPeriodFilter) &&
          (documentCreatorFilter === "all" || document.uploadedByName === documentCreatorFilter),
        )
        .map((document) => ({
          rowType: "document",
          document,
          id: `trash-document:${document.id}`,
          fileName: document.fileName,
          typeLabel: document.typeLabel,
          ownerName: document.uploadedByName,
          createdAt: document.deletedAt ?? document.updatedAt ?? document.createdAt,
          statusLabel: formatDocumentStatus(document.status),
          periodLabel: formatMonth(document.periodMonth),
          sizeBytes: document.sizeBytes,
          details: document.reviewComment ? `Commentaire RH : ${document.reviewComment}` : null,
        })),
    [documentCreatorFilter, documentPeriodFilter, documentTypeFilter, formatDocumentStatus, formatMonth, trashedRhDocuments],
  );
  const rhDocumentsById = useMemo(
    () => new Map((currentSubSection === "docs_all" ? filteredAllDocuments : filteredRhDocuments).map((document) => [document.id, document])),
    [currentSubSection, filteredAllDocuments, filteredRhDocuments],
  );
  const getDraggedRhDocument = (event: React.DragEvent<HTMLElement>) => {
    const draggedId =
      draggedRhDocumentId ??
      event.dataTransfer.getData("text/x-dashboard-item-id") ??
      event.dataTransfer.getData("text/plain");
    if (!draggedId) return null;
    return rhDocumentsById.get(draggedId) ?? null;
  };
  const folderEnabledDocuments = useMemo(
    () => (currentSubSection === "docs_all" ? filteredAllDocuments : filteredRhDocuments),
    [currentSubSection, filteredAllDocuments, filteredRhDocuments],
  );
  const rhListItems = useMemo<RhDocumentsListItem[]>(() => {
    const folderScopedDocuments =
      ["docs_tous", "docs_all"].includes(currentSubSection)
        ? folderEnabledDocuments.filter((document) =>
            currentRhFolderId
              ? (document.folderId ?? null) === currentRhFolderId
              : (document.folderId ?? null) === null,
          )
        : folderEnabledDocuments;

    const documentItems: RhDocumentsListItem[] = folderScopedDocuments.map((document) => ({
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

    if (!["docs_tous", "docs_all"].includes(currentSubSection)) {
      return documentItems;
    }

    const shouldShowFoldersByType =
      documentTypeFilter === "all" || documentTypeFilter === "Dossier";

    const folderItems: RhDocumentsListItem[] = currentRhFolderId || !shouldShowFoldersByType
      ? []
      : [...rhFolders]
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
  }, [currentRhFolderId, currentSubSection, documentTypeFilter, folderEnabledDocuments, formatDocumentStatus, formatMonth, rhFolders]);

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
  useEffect(() => {
    if (!draggedRhDocumentId) return;
    const clearDraggedItem = () => setDraggedRhDocumentId(null);
    window.addEventListener("dragend", clearDraggedItem);
    window.addEventListener("drop", clearDraggedItem);
    return () => {
      window.removeEventListener("dragend", clearDraggedItem);
      window.removeEventListener("drop", clearDraggedItem);
    };
  }, [draggedRhDocumentId]);

  const openReviewDialog = (
    document: RhDocumentRow,
    status: "pending" | "validated" | "rejected",
  ) => {
    setReviewDialogDocument(document);
    setReviewDialogStatus(status);
    setReviewDialogComment(reviewDrafts[document.id] ?? document.reviewComment ?? "");
  };

  const closeReviewDialog = () => {
    setReviewDialogDocument(null);
    setReviewDialogStatus(null);
    setReviewDialogComment("");
  };

  const isRhDocumentsDropdownSection =
    currentSubSection === "docs_tous" ||
    currentSubSection === "docs_salaries" ||
    currentSubSection === "docs_all";
  const isRhFoldersSection =
    currentSubSection === "docs_tous" ||
    currentSubSection === "docs_all";
  const showImportActionsInMenu =
    currentSubSection === "docs_tous" ||
    currentSubSection === "docs_all";
  const showCreateFolderActionInMenu =
    currentSubSection === "docs_tous" ||
    currentSubSection === "docs_salaries" ||
    currentSubSection === "docs_all";

  const rhDocumentsTitle =
    currentSubSection === "docs_all"
      ? "Tous les documents"
      : currentSubSection === "docs_cra_facture"
      ? "CRA & Facture"
      : currentSubSection === "docs_tous"
      ? "Documents entreprise"
      : currentSubSection === "docs_salaries"
        ? "Documents salaries"
        : currentSubSection === "docs_corbeille"
          ? "Corbeille"
        : "Documents";

  return (
    <section className="space-y-2">
      <div className="flex flex-row items-center justify-between gap-3">
        {isRhDocumentsDropdownSection ? (
          <div ref={documentsMenuRef} className="relative">
            {isRhFoldersSection && showRhFolderTrash ? (
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
            ) : isRhFoldersSection && rhFolderPath.length > 0 ? (
              <div className="flex items-center gap-2 text-lg font-semibold text-[#0A1A2F]">
                <button
                  type="button"
                  onClick={() => onRhNavigateFolder(null)}
                  className="rounded-lg px-2 py-1 transition hover:bg-slate-100"
                  onDragOver={(event) => {
                    const draggedDocument = getDraggedRhDocument(event);
                    if (!draggedDocument) return;
                    if ((draggedDocument.folderId ?? null) === null) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(event) => {
                    const draggedDocument = getDraggedRhDocument(event);
                    if (!draggedDocument) return;
                    if ((draggedDocument.folderId ?? null) === null) return;
                    event.preventDefault();
                    void onRhMoveDocumentToRoot(draggedDocument);
                  }}
                >
                  {rhDocumentsTitle}
                </button>
                {rhFolderPath.map((folder, index) => {
                  const isLast = index === rhFolderPath.length - 1;
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
                          onDragOver={(event) => {
                            const draggedDocument = getDraggedRhDocument(event);
                            if (!draggedDocument) return;
                            if ((draggedDocument.folderId ?? null) === folder.id) return;
                            event.preventDefault();
                            event.dataTransfer.dropEffect = "move";
                          }}
                          onDrop={(event) => {
                            const draggedDocument = getDraggedRhDocument(event);
                            if (!draggedDocument) return;
                            if ((draggedDocument.folderId ?? null) === folder.id) return;
                            event.preventDefault();
                            void onRhMoveDocumentToFolder(draggedDocument, folder.id);
                          }}
                        >
                          <span>{folder.name}</span>
                          <ChevronDown className={`h-4 w-4 transition ${documentsMenuOpen ? "rotate-180" : ""}`} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onRhNavigateFolder(folder.id)}
                          className="rounded-lg px-2 py-1 transition hover:bg-slate-100"
                          onDragOver={(event) => {
                            const draggedDocument = getDraggedRhDocument(event);
                            if (!draggedDocument) return;
                            if ((draggedDocument.folderId ?? null) === folder.id) return;
                            event.preventDefault();
                            event.dataTransfer.dropEffect = "move";
                          }}
                          onDrop={(event) => {
                            const draggedDocument = getDraggedRhDocument(event);
                            if (!draggedDocument) return;
                            if ((draggedDocument.folderId ?? null) === folder.id) return;
                            event.preventDefault();
                            void onRhMoveDocumentToFolder(draggedDocument, folder.id);
                          }}
                        >
                          {folder.name}
                        </button>
                      )}
                    </Fragment>
                  );
                })}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setDocumentsMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-lg px-2 py-1 text-lg font-semibold text-[#0A1A2F] transition hover:bg-slate-100"
                aria-haspopup="menu"
                aria-expanded={documentsMenuOpen}
              >
                <span>{rhDocumentsTitle}</span>
                <ChevronDown className={`h-4 w-4 transition ${documentsMenuOpen ? "rotate-180" : ""}`} />
              </button>
            )}
            {documentsMenuOpen ? (
              <div className="absolute left-0 top-full z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2">
                {!showRhFolderTrash ? (
                  <>
                    {showCreateFolderActionInMenu ? (
                      <button
                        type="button"
                        className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-[#0A1A2F]/80 transition hover:bg-slate-50"
                        onClick={() => {
                          setDocumentsMenuOpen(false);
                          void onRhCreateFolder();
                        }}
                      >
                        Nouveau dossier
                      </button>
                    ) : null}
                    {showImportActionsInMenu ? (
                      <>
                        <button
                          type="button"
                          className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-[#0A1A2F] transition hover:bg-slate-50"
                          onClick={() => {
                            setDocumentsMenuOpen(false);
                            onOpenRhUploadDialog();
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
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <h2 className="text-lg font-semibold text-[#0A1A2F]">{rhDocumentsTitle}</h2>
        )}
        <div className="flex items-center gap-2">
          {currentSubSection === "docs_tous" && !isRhDocumentsDropdownSection ? (
            <Button type="button" variant="outline" size="sm" onClick={onOpenRhUploadDialog}>
              Deposer un document RH
            </Button>
          ) : null}
          {currentSubSection === "docs_mes_demandes" ? (
            <Button type="button" variant="outline" size="sm" onClick={onOpenRequestDialog}>
              Demander un document
            </Button>
          ) : null}
        </div>
      </div>
      {["docs_tous", "docs_all", "docs_salaries", "docs_a_valider", "docs_corbeille"].includes(currentSubSection) ? (
        <DocumentFiltersBar
          fields={
            currentSubSection === "docs_a_valider" || currentSubSection === "docs_corbeille"
              ? ["type", "period", "owner"]
              : ["type", "period", "status", "owner"]
          }
          values={{
            type: documentTypeFilter,
            period: documentPeriodFilter,
            status: documentStatusFilter,
            owner: documentCreatorFilter,
          }}
          options={rhFilterOptions}
          onChange={(field, value) => {
            if (field === "type") onDocumentTypeFilterChange(value);
            if (field === "period") onDocumentPeriodFilterChange(value);
            if (field === "status") onDocumentStatusFilterChange(value);
            if (field === "owner") onDocumentCreatorFilterChange(value);
          }}
        />
      ) : null}
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
                    <CardTitle className="text-base">Nouveau CRA / Facture</CardTitle>
                    <p className="mt-1 text-sm text-[#0A1A2F]/70">
                      Selectionne un collaborateur, un profil de facturation puis les jours travailles.
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
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Collaborateur cible</label>
                      <select
                        value={generateEmployeeId}
                        onChange={(event) => onGenerateEmployeeIdChange(event.target.value)}
                        className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                      >
                        <option value="">Choisir un collaborateur</option>
                        {employees.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.full_name ?? employee.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Profil de facturation</label>
                      <select
                        value={generateBillingProfileEmployeeId}
                        onChange={(event) =>
                          onGenerateBillingProfileEmployeeIdChange(event.target.value)
                        }
                        className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                      >
                        <option value="">Choisir un profil</option>
                        {billingProfiles.map((profileItem) => (
                          <option key={profileItem.employeeId} value={profileItem.employeeId}>
                            {profileItem.employeeName} - {profileItem.profileLabel}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

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

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={invoiceDiscountGranted}
                        onChange={(event) => onInvoiceDiscountGrantedChange(event.target.checked)}
                      />
                      Escompte accorde (2%)
                    </label>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Montant deja paye</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={invoiceAmountAlreadyPaid}
                        onChange={(event) => onInvoiceAmountAlreadyPaidChange(event.target.value)}
                        className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                        placeholder="0.00"
                      />
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
                        {WEEKDAY_LABELS.map((label) => (
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
                              className={`aspect-square rounded-lg border border-transparent text-sm transition-colors ${
                                isSelected
                                  ? "border-[#2aa0dd] bg-[#2aa0dd] text-white"
                                  : "bg-white text-[#0A1A2F] hover:bg-slate-100"
                              } ${isWeekend && !isSelected ? "text-[#0A1A2F]/55" : ""}`}
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
        ) : currentSubSection === "docs_mes_demandes" ? (
          requests.length ? (
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
          ) : (
            <p className="text-sm text-[#0A1A2F]/70">Aucune demande documentaire pour le moment.</p>
          )
        ) : currentSubSection === "docs_salaries" ? (
          filteredSalarieDocuments.length ? (
            <DashboardDocumentList
              items={filteredSalarieDocuments.map((document) => ({
                ...document,
                ownerName: document.uploadedByName,
                createdAt: document.createdAt,
                statusLabel: formatDocumentStatus(document.status),
                periodLabel: formatMonth(document.periodMonth),
                details: document.reviewComment ? `Commentaire RH : ${document.reviewComment}` : null,
              }))}
              storageKey={RH_SHARED_COLUMNS_STORAGE_KEY}
              storageScope={storageScope}
              preferencesAuthToken={preferencesAuthToken}
              columnControlPlacement="inline"
              onItemDoubleClick={(document) => {
                if (
                  document.fileName.toLowerCase().endsWith(".pdf") &&
                  document.storagePath
                ) {
                  void onViewDocument(document);
                }
              }}
              isItemDoubleClickable={(document) =>
                document.fileName.toLowerCase().endsWith(".pdf") && !!document.storagePath
              }
              renderActions={(document, closeMenu) => (
                <>
                  <input
                    value={reviewDrafts[document.id] ?? document.reviewComment ?? ""}
                    onChange={(event) =>
                      onReviewDraftsChange((prev) => ({ ...prev, [document.id]: event.target.value }))
                    }
                    placeholder="Commentaire de validation ou de refus"
                    className="h-9 w-full min-w-[240px] rounded-md border border-slate-300 px-3 text-sm"
                  />
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
                  {document.status !== "validated" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        closeMenu();
                        void onReviewDocument(document, "validated");
                      }}
                      disabled={reviewingDocumentId === document.id}
                    >
                      {reviewingDocumentId === document.id ? "Traitement..." : "Valider"}
                    </Button>
                  ) : null}
                  {document.status !== "rejected" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-red-600 hover:text-red-700"
                      onClick={() => {
                        closeMenu();
                        void onReviewDocument(document, "rejected");
                      }}
                      disabled={reviewingDocumentId === document.id}
                    >
                      {reviewingDocumentId === document.id ? "Traitement..." : "Refuser"}
                    </Button>
                  ) : null}
                  {document.status !== "pending" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        closeMenu();
                        void onReviewDocument(document, "pending");
                      }}
                      disabled={reviewingDocumentId === document.id}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Remettre en attente
                    </Button>
                  ) : null}
                </>
              )}
            />
          ) : (
            <p className="text-sm text-[#0A1A2F]/70">
              Aucun document salarie pour le moment.
            </p>
          )
        ) : currentSubSection === "docs_a_valider" ? (
          filteredPendingDocuments.length ? (
            <DashboardDocumentList
              items={filteredPendingDocuments.map((document) => ({
                ...document,
                ownerName: document.uploadedByName,
                createdAt: document.createdAt,
                statusLabel: formatDocumentStatus(document.status),
                periodLabel: formatMonth(document.periodMonth),
                details: document.reviewComment ? `Commentaire RH : ${document.reviewComment}` : null,
              }))}
              storageKey="rh-documents-pending-columns"
              storageScope={storageScope}
              preferencesAuthToken={preferencesAuthToken}
              columnControlPlacement="inline"
              onItemDoubleClick={(document) => {
                if (
                  document.fileName.toLowerCase().endsWith(".pdf") &&
                  document.storagePath
                ) {
                  void onViewDocument(document);
                }
              }}
              isItemDoubleClickable={(document) =>
                document.fileName.toLowerCase().endsWith(".pdf") && !!document.storagePath
              }
              renderActionCell={(document) => (
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
                    onClick={() => openReviewDialog(document, "validated")}
                    disabled={reviewingDocumentId === document.id}
                    aria-label={`Valider ${document.fileName}`}
                    title="Valider"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-rose-600 hover:text-rose-700"
                    onClick={() => openReviewDialog(document, "rejected")}
                    disabled={reviewingDocumentId === document.id}
                    aria-label={`Refuser ${document.fileName}`}
                    title="Refuser"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            />
          ) : (
            <p className="text-sm text-[#0A1A2F]/70">Aucun document en attente de validation.</p>
          )
        ) : showRhFolderTrash ? (
          rhTrashListItems.length || rhTrashedDocumentItems.length ? (
            <div className="space-y-5">
              {rhTrashListItems.length ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#0A1A2F]/80">Dossiers</p>
                  <DashboardDocumentList
                    items={rhTrashListItems}
                    storageKey="rh-documents-trash-folders-columns"
                    storageScope={storageScope}
                    preferencesAuthToken={preferencesAuthToken}
                    createdAtLabel="Date de mise a la corbeille"
                    renderActionCell={(item) => {
                      if (item.rowType !== "folder") return null;
                      return (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
                            onClick={() => {
                              void onRhRestoreFolder(item.folderId);
                            }}
                            aria-label={`Restaurer ${item.fileName}`}
                            title="Restaurer"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                            onClick={() => {
                              void onRhPurgeFolder(item.folderId);
                            }}
                            aria-label={`Supprimer definitivement ${item.fileName}`}
                            title="Supprimer definitivement"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    }}
                  />
                </div>
              ) : null}
              {rhTrashedDocumentItems.length ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#0A1A2F]/80">Documents</p>
                  <DashboardDocumentList
                    items={rhTrashedDocumentItems}
                    storageKey="rh-documents-trash-documents-columns"
                    storageScope={storageScope}
                    preferencesAuthToken={preferencesAuthToken}
                    createdAtLabel="Date de mise a la corbeille"
                    renderActionCell={(item) => {
                      if (item.rowType !== "document") return null;
                      const document = item.document;
                      return (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
                            onClick={() => {
                              void onRestoreRhDocument(document);
                            }}
                            aria-label={`Restaurer ${item.fileName}`}
                            title="Restaurer"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                            onClick={() => {
                              void onDeleteRhDocumentPermanently(document);
                            }}
                            disabled={deletingRhDocumentId === document.id}
                            aria-label={`Supprimer definitivement ${item.fileName}`}
                            title="Supprimer definitivement"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    }}
                  />
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-[#0A1A2F]/70">La corbeille est vide.</p>
          )
        ) : rhListItems.length ? (
          <DashboardDocumentList
            items={rhListItems}
            storageKey={RH_SHARED_COLUMNS_STORAGE_KEY}
            storageScope={storageScope}
            preferencesAuthToken={preferencesAuthToken}
            columnControlPlacement="inline"
            onItemDoubleClick={(item) => {
              if (item.rowType === "folder") {
                onRhNavigateFolder(item.folderId);
                return;
              }
              const document = item.document;
              if (
                document.fileName.toLowerCase().endsWith(".pdf") &&
                document.storagePath
              ) {
                void onViewDocument(document);
              }
            }}
            isItemDoubleClickable={(item) =>
              item.rowType === "folder" ||
              (item.document.fileName.toLowerCase().endsWith(".pdf") && !!item.document.storagePath)
            }
            getDraggableId={(item) => (item.rowType === "document" ? item.document.id : null)}
            onDragItemStart={(item) => {
              if (item.rowType !== "document") return;
              setDraggedRhDocumentId(item.document.id);
            }}
            onDragItemEnd={() => {
              setDraggedRhDocumentId(null);
            }}
            canDropOnItem={(targetItem, draggedId) => {
              if (targetItem.rowType !== "folder") return false;
              const draggedDocument = rhDocumentsById.get(draggedId);
              if (!draggedDocument) return false;
              return (draggedDocument.folderId ?? null) !== targetItem.folderId;
            }}
            onItemDrop={async (targetItem, draggedId) => {
              if (targetItem.rowType !== "folder") return;
              const draggedDocument = rhDocumentsById.get(draggedId);
              if (!draggedDocument) return;
              await onRhMoveDocumentToFolder(draggedDocument, targetItem.folderId);
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
                        onRhNavigateFolder(item.folderId);
                      }}
                      disabled={currentRhFolderId === item.folderId}
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
                        void onRhRenameFolder(item.folderId, item.fileName);
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
                        void onRhDeleteFolder(item.folderId);
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
                  <input
                    value={reviewDrafts[document.id] ?? document.reviewComment ?? ""}
                    onChange={(event) =>
                      onReviewDraftsChange((prev) => ({ ...prev, [document.id]: event.target.value }))
                    }
                    placeholder="Commentaire de validation ou de refus"
                    className="h-9 w-full min-w-[240px] rounded-md border border-slate-300 px-3 text-sm"
                  />
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
                  {document.status !== "validated" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        closeMenu();
                        void onReviewDocument(document, "validated");
                      }}
                      disabled={reviewingDocumentId === document.id}
                    >
                      {reviewingDocumentId === document.id ? "Traitement..." : "Valider"}
                    </Button>
                  ) : null}
                  {document.status !== "rejected" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-red-600 hover:text-red-700"
                      onClick={() => {
                        closeMenu();
                        void onReviewDocument(document, "rejected");
                      }}
                      disabled={reviewingDocumentId === document.id}
                    >
                      {reviewingDocumentId === document.id ? "Traitement..." : "Refuser"}
                    </Button>
                  ) : null}
                  {document.status !== "pending" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        closeMenu();
                        void onReviewDocument(document, "pending");
                      }}
                      disabled={reviewingDocumentId === document.id}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Remettre en attente
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-red-600 hover:text-red-700"
                    onClick={() => {
                      closeMenu();
                      void onDeleteRhDocument(document);
                    }}
                    disabled={deletingRhDocumentId === document.id}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                  </Button>
                </>
              );
            }}
          />
        ) : (
          <p className="text-sm text-[#0A1A2F]/70">Aucun document RH pour le moment.</p>
        )}
      </div>
      <Dialog
        open={Boolean(reviewDialogDocument && reviewDialogStatus)}
        onOpenChange={(open) => {
          if (!open) {
            closeReviewDialog();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {reviewDialogStatus === "validated"
                ? "Valider le document"
                : reviewDialogStatus === "rejected"
                  ? "Refuser le document"
                  : "Remettre en attente"}
            </DialogTitle>
            <DialogDescription>
              {reviewDialogDocument
                ? `Document : ${reviewDialogDocument.fileName}`
                : "Saisir un commentaire RH optionnel."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#0A1A2F]">
              Commentaire RH (optionnel)
            </label>
            <textarea
              value={reviewDialogComment}
              onChange={(event) => setReviewDialogComment(event.target.value)}
              rows={4}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Saisir un commentaire..."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeReviewDialog}>
              Annuler
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!reviewDialogDocument || !reviewDialogStatus) return;
                onReviewDraftsChange((prev) => ({
                  ...prev,
                  [reviewDialogDocument.id]: reviewDialogComment,
                }));
                void onReviewDocument(reviewDialogDocument, reviewDialogStatus);
                closeReviewDialog();
              }}
              disabled={
                !reviewDialogDocument ||
                !reviewDialogStatus ||
                reviewingDocumentId === reviewDialogDocument.id
              }
            >
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}





