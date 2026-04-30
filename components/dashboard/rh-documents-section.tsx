import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { DocumentFiltersBar } from "@/components/dashboard/document-filters-bar";
import { RhCraInvoiceEditor } from "@/components/dashboard/rh/cra-invoice-editor";
import { RhDocumentsListView } from "@/components/dashboard/rh/documents-list-view";
import { RhDocumentsReviewList } from "@/components/dashboard/rh/documents-review-list";
import { RhPendingValidationList } from "@/components/dashboard/rh/pending-validation-list";
import { RhRequestsTable } from "@/components/dashboard/rh/requests-table";
import { RhReviewDialog } from "@/components/dashboard/rh/review-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CraCalendarCell, CraEntryDraft } from "@/features/dashboard/salarie/types";
import type { RhDocumentFolderRow, RhDocumentRow, RhDocumentsListItem, RhRequestRow as RequestRow } from "@/features/dashboard/rh/types";

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
  invoiceVatEnabled: boolean;
  onInvoiceVatEnabledChange: (value: boolean) => void;
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
  invoiceVatEnabled,
  onInvoiceVatEnabledChange,
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
          <RhCraInvoiceEditor
            generateEmployeeId={generateEmployeeId}
            generateBillingProfileEmployeeId={generateBillingProfileEmployeeId}
            billingProfiles={billingProfiles}
            employees={employees}
            craGenerating={craGenerating}
            invoiceGenerating={invoiceGenerating}
            craPeriodMonth={craPeriodMonth}
            craDraftTotalDays={craDraftTotalDays}
            craNotes={craNotes}
            invoiceDiscountGranted={invoiceDiscountGranted}
            onInvoiceDiscountGrantedChange={onInvoiceDiscountGrantedChange}
            invoiceVatEnabled={invoiceVatEnabled}
            onInvoiceVatEnabledChange={onInvoiceVatEnabledChange}
            invoiceAmountAlreadyPaid={invoiceAmountAlreadyPaid}
            onInvoiceAmountAlreadyPaidChange={onInvoiceAmountAlreadyPaidChange}
            craCalendarCells={craCalendarCells}
            craEntriesByDate={craEntriesByDate}
            craEntries={craEntries}
            onGenerateEmployeeIdChange={onGenerateEmployeeIdChange}
            onGenerateBillingProfileEmployeeIdChange={onGenerateBillingProfileEmployeeIdChange}
            onCraPeriodMonthChange={onCraPeriodMonthChange}
            onCraNotesChange={onCraNotesChange}
            onGenerateCraPdf={onGenerateCraPdf}
            onGenerateInvoicePdf={onGenerateInvoicePdf}
            resetCraEditor={resetCraEditor}
            toggleCraWorkDate={toggleCraWorkDate}
            updateCraEntry={updateCraEntry}
          />
        ) : currentSubSection === "docs_mes_demandes" ? (
          <RhRequestsTable
            requests={requests}
            cancellingRequestId={cancellingRequestId}
            onCancelRequest={onCancelRequest}
            formatMonth={formatMonth}
            formatDate={formatDate}
          />
        ) : currentSubSection === "docs_salaries" ? (
          <RhDocumentsReviewList
            documents={filteredSalarieDocuments}
            storageScope={storageScope}
            preferencesAuthToken={preferencesAuthToken}
            reviewDrafts={reviewDrafts}
            onReviewDraftsChange={onReviewDraftsChange}
            onViewDocument={onViewDocument}
            onDownloadDocument={onDownloadDocument}
            onReviewDocument={onReviewDocument}
            viewingDocumentId={viewingDocumentId}
            downloadingDocumentId={downloadingDocumentId}
            reviewingDocumentId={reviewingDocumentId}
            formatMonth={formatMonth}
            formatDocumentStatus={formatDocumentStatus}
          />
        ) : currentSubSection === "docs_a_valider" ? (
          <RhPendingValidationList
            documents={filteredPendingDocuments}
            storageScope={storageScope}
            preferencesAuthToken={preferencesAuthToken}
            reviewingDocumentId={reviewingDocumentId}
            onViewDocument={onViewDocument}
            onOpenReviewDialog={openReviewDialog}
            formatMonth={formatMonth}
            formatDocumentStatus={formatDocumentStatus}
          />
        ) : (
          <RhDocumentsListView
            storageScope={storageScope}
            preferencesAuthToken={preferencesAuthToken}
            showRhFolderTrash={showRhFolderTrash}
            rhTrashListItems={rhTrashListItems}
            rhTrashedDocumentItems={rhTrashedDocumentItems}
            rhListItems={rhListItems}
            rhDocumentsById={rhDocumentsById}
            currentRhFolderId={currentRhFolderId}
            onRhNavigateFolder={onRhNavigateFolder}
            onRhMoveDocumentToFolder={onRhMoveDocumentToFolder}
            onRhRenameFolder={onRhRenameFolder}
            onRhDeleteFolder={onRhDeleteFolder}
            onRhRestoreFolder={onRhRestoreFolder}
            onRhPurgeFolder={onRhPurgeFolder}
            onViewDocument={onViewDocument}
            onDownloadDocument={onDownloadDocument}
            onReviewDocument={onReviewDocument}
            onDeleteRhDocument={onDeleteRhDocument}
            onRestoreRhDocument={onRestoreRhDocument}
            onDeleteRhDocumentPermanently={onDeleteRhDocumentPermanently}
            viewingDocumentId={viewingDocumentId}
            downloadingDocumentId={downloadingDocumentId}
            reviewingDocumentId={reviewingDocumentId}
            deletingRhDocumentId={deletingRhDocumentId}
            reviewDrafts={reviewDrafts}
            onReviewDraftsChange={onReviewDraftsChange}
            setDraggedRhDocumentId={setDraggedRhDocumentId}
          />
        )}
      </div>
      <RhReviewDialog
        document={reviewDialogDocument}
        status={reviewDialogStatus}
        comment={reviewDialogComment}
        reviewingDocumentId={reviewingDocumentId}
        onCommentChange={setReviewDialogComment}
        onClose={closeReviewDialog}
        onConfirm={() => {
          if (!reviewDialogDocument || !reviewDialogStatus) return;
          onReviewDraftsChange((prev) => ({
            ...prev,
            [reviewDialogDocument.id]: reviewDialogComment,
          }));
          void onReviewDocument(reviewDialogDocument, reviewDialogStatus);
          closeReviewDialog();
        }}
      />
    </section>
  );
}





