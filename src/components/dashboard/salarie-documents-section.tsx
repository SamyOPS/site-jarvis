import { ChevronDown, Download, Eye, FolderOpen, MessageSquareText, Pencil, RotateCcw, Trash2 } from "lucide-react";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { DashboardDocumentList } from "@/components/dashboard/document-list";
import { DocumentFiltersBar } from "@/components/dashboard/document-filters-bar";
import { SalarieCraInvoiceEditor } from "@/components/dashboard/salarie/cra-invoice-editor";
import { SalarieDocumentsListView } from "@/components/dashboard/salarie/documents-list-view";
import { SalariePendingRequests } from "@/components/dashboard/salarie/pending-requests";
import { Button } from "@/components/ui/button";
import type {
  CraCalendarCell,
  CraEntryDraft,
  CraSummaryRow,
  DocumentFolderRow,
  SalarieDocumentRow as DocumentRow,
  SalarieDocumentsListItem,
  SalarieRequestRow as RequestRow,
} from "@/features/dashboard/salarie/types";

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
  invoiceDiscountGranted: boolean;
  onInvoiceDiscountGrantedChange: (value: boolean) => void;
  invoiceVatEnabled: boolean;
  onInvoiceVatEnabledChange: (value: boolean) => void;
  invoiceAmountAlreadyPaid: string;
  onInvoiceAmountAlreadyPaidChange: (value: string) => void;
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
  trashedDocuments: DocumentRow[];
  folderPath: DocumentFolderRow[];
  showFolderTrash: boolean;
  onNavigateFolder: (folderId: string | null) => void;
  onCreateFolder: () => void | Promise<void>;
  onMoveDocumentToFolder: (document: DocumentRow, folderId: string) => void | Promise<void>;
  onMoveDocumentToRoot: (document: DocumentRow) => void | Promise<void>;
  onRenameFolder: (folderId: string, currentName: string) => void | Promise<void>;
  onDeleteFolder: (folderId: string) => void | Promise<void>;
  onRestoreFolder: (folderId: string) => void | Promise<void>;
  onPurgeFolder: (folderId: string) => void | Promise<void>;
  onRestoreDocument: (document: DocumentRow) => void | Promise<void>;
  onPurgeDocument: (document: DocumentRow) => void | Promise<void>;
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
  invoiceDiscountGranted,
  onInvoiceDiscountGrantedChange,
  invoiceVatEnabled,
  onInvoiceVatEnabledChange,
  invoiceAmountAlreadyPaid,
  onInvoiceAmountAlreadyPaidChange,
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
  trashedDocuments,
  folderPath,
  showFolderTrash,
  onNavigateFolder,
  onCreateFolder,
  onMoveDocumentToFolder,
  onMoveDocumentToRoot,
  onRenameFolder,
  onDeleteFolder,
  onRestoreFolder,
  onPurgeFolder,
  onRestoreDocument,
  onPurgeDocument,
  formatDate,
  formatMonth,
  formatDocumentStatus,
}: SalarieDocumentsSectionProps) {
  const [documentsMenuOpen, setDocumentsMenuOpen] = useState(false);
  const documentsMenuRef = useRef<HTMLDivElement | null>(null);
  const [draggedDocumentId, setDraggedDocumentId] = useState<string | null>(null);
  const trashFolderItems = useMemo<SalarieDocumentsListItem[]>(
    () =>
      [...trashedFolders]
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
    [documentTypeFilter, trashedFolders],
  );
  const trashDocumentItems = useMemo<SalarieDocumentsListItem[]>(
    () =>
      trashedDocuments
        .filter((document) =>
          (documentTypeFilter === "all" || document.typeLabel === documentTypeFilter) &&
          (documentPeriodFilter === "all" ||
            (document.periodMonth ?? "__none__") === documentPeriodFilter),
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
    [documentPeriodFilter, documentTypeFilter, formatDocumentStatus, formatMonth, trashedDocuments],
  );
  const documentsById = useMemo(
    () => new Map(visibleDocuments.map((document) => [document.id, document])),
    [visibleDocuments],
  );
  const getDraggedDocument = (event: React.DragEvent<HTMLElement>) => {
    const draggedId =
      draggedDocumentId ??
      event.dataTransfer.getData("text/x-dashboard-item-id") ??
      event.dataTransfer.getData("text/plain");
    if (!draggedId) return null;
    return documentsById.get(draggedId) ?? null;
  };
  const listItems = useMemo<SalarieDocumentsListItem[]>(() => {
    const documentItems: SalarieDocumentsListItem[] = visibleDocuments.map((document) => ({
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

    const folderItems: SalarieDocumentsListItem[] = currentFolderId || !shouldShowFoldersByType
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
  useEffect(() => {
    if (!draggedDocumentId) return;
    const clearDraggedItem = () => setDraggedDocumentId(null);
    window.addEventListener("dragend", clearDraggedItem);
    window.addEventListener("drop", clearDraggedItem);
    return () => {
      window.removeEventListener("dragend", clearDraggedItem);
      window.removeEventListener("drop", clearDraggedItem);
    };
  }, [draggedDocumentId]);

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
                  onDragOver={(event) => {
                    const draggedDocument = getDraggedDocument(event);
                    if (!draggedDocument) return;
                    if ((draggedDocument.folderId ?? null) === null) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(event) => {
                    const draggedDocument = getDraggedDocument(event);
                    if (!draggedDocument) return;
                    if ((draggedDocument.folderId ?? null) === null) return;
                    event.preventDefault();
                    void onMoveDocumentToRoot(draggedDocument);
                  }}
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
	                          onDragOver={(event) => {
	                            const draggedDocument = getDraggedDocument(event);
	                            if (!draggedDocument) return;
	                            if ((draggedDocument.folderId ?? null) === folder.id) return;
	                            event.preventDefault();
	                            event.dataTransfer.dropEffect = "move";
	                          }}
	                          onDrop={(event) => {
	                            const draggedDocument = getDraggedDocument(event);
	                            if (!draggedDocument) return;
	                            if ((draggedDocument.folderId ?? null) === folder.id) return;
	                            event.preventDefault();
	                            void onMoveDocumentToFolder(draggedDocument, folder.id);
	                          }}
	                        >
	                          <span>{folder.name}</span>
	                          <ChevronDown className={`h-4 w-4 transition ${documentsMenuOpen ? "rotate-180" : ""}`} />
	                        </button>
	                      ) : (
                        <button
                          type="button"
                          onClick={() => onNavigateFolder(folder.id)}
                          className="rounded-lg px-2 py-1 transition hover:bg-slate-100"
                          onDragOver={(event) => {
                            const draggedDocument = getDraggedDocument(event);
                            if (!draggedDocument) return;
                            if ((draggedDocument.folderId ?? null) === folder.id) return;
                            event.preventDefault();
                            event.dataTransfer.dropEffect = "move";
                          }}
                          onDrop={(event) => {
                            const draggedDocument = getDraggedDocument(event);
                            if (!draggedDocument) return;
                            if ((draggedDocument.folderId ?? null) === folder.id) return;
                            event.preventDefault();
                            void onMoveDocumentToFolder(draggedDocument, folder.id);
                          }}
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
          <SalarieCraInvoiceEditor
            billingProfileReady={billingProfileReady}
            selectedCraId={selectedCraId}
            selectedCraSummary={selectedCraSummary}
            resetCraEditor={resetCraEditor}
            onGenerateCraPdf={onGenerateCraPdf}
            onGenerateInvoicePdf={onGenerateInvoicePdf}
            craGenerating={craGenerating}
            invoiceGenerating={invoiceGenerating}
            craPeriodMonth={craPeriodMonth}
            onCraPeriodMonthChange={onCraPeriodMonthChange}
            shiftMonthInputValue={shiftMonthInputValue}
            craDraftTotalDays={craDraftTotalDays}
            craNotes={craNotes}
            onCraNotesChange={onCraNotesChange}
            invoiceDiscountGranted={invoiceDiscountGranted}
            onInvoiceDiscountGrantedChange={onInvoiceDiscountGrantedChange}
            invoiceVatEnabled={invoiceVatEnabled}
            onInvoiceVatEnabledChange={onInvoiceVatEnabledChange}
            invoiceAmountAlreadyPaid={invoiceAmountAlreadyPaid}
            onInvoiceAmountAlreadyPaidChange={onInvoiceAmountAlreadyPaidChange}
            weekdayLabels={weekdayLabels}
            craCalendarCells={craCalendarCells}
            craEntriesByDate={craEntriesByDate}
            craEntries={craEntries}
            toggleCraWorkDate={toggleCraWorkDate}
            formatCraEntryDateLabel={formatCraEntryDateLabel}
            updateCraEntry={updateCraEntry}
          />
        ) : currentSubSection === "docs_a_deposer" ? (
          <SalariePendingRequests
            pendingRequests={pendingRequests}
            openUploadDialog={openUploadDialog}
            formatMonth={formatMonth}
            formatDate={formatDate}
          />
        ) : (
          <SalarieDocumentsListView
            storageScope={storageScope}
            preferencesAuthToken={preferencesAuthToken}
            showFolderTrash={showFolderTrash}
            documentTypeFilter={documentTypeFilter}
            documentPeriodFilter={documentPeriodFilter}
            documentStatusFilter={documentStatusFilter}
            documentFilterOptions={documentFilterOptions}
            onDocumentTypeFilterChange={onDocumentTypeFilterChange}
            onDocumentPeriodFilterChange={onDocumentPeriodFilterChange}
            onDocumentStatusFilterChange={onDocumentStatusFilterChange}
            trashFolderItems={trashFolderItems}
            trashDocumentItems={trashDocumentItems}
            listItems={listItems}
            documentsById={documentsById}
            currentFolderId={currentFolderId}
            onNavigateFolder={onNavigateFolder}
            onMoveDocumentToFolder={onMoveDocumentToFolder}
            onRenameFolder={onRenameFolder}
            onDeleteFolder={onDeleteFolder}
            onRestoreFolder={onRestoreFolder}
            onPurgeFolder={onPurgeFolder}
            onViewDocument={onViewDocument}
            onDownloadDocument={onDownloadDocument}
            onDeleteDocument={onDeleteDocument}
            onRenameDocument={onRenameDocument}
            onOpenCommentDialog={onOpenCommentDialog}
            onRestoreDocument={onRestoreDocument}
            onPurgeDocument={onPurgeDocument}
            viewingDocumentId={viewingDocumentId}
            downloadingDocumentId={downloadingDocumentId}
            deletingDocumentId={deletingDocumentId}
            savingDocumentId={savingDocumentId}
            setDraggedDocumentId={setDraggedDocumentId}
          />
        )}
      </div>
    </section>
  );
}

