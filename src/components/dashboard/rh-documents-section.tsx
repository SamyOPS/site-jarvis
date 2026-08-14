import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

import { DocumentFiltersBar } from "@/components/dashboard/document-filters-bar";
import { RhCraInvoiceEditor } from "@/components/dashboard/rh/cra-invoice-editor";
import { RhLeaveRequestEditor, type RhLeaveRequestPayload } from "@/components/dashboard/rh/leave-request-editor";
import { RhDocumentsListView } from "@/components/dashboard/rh/documents-list-view";
import { RhPendingValidationList } from "@/components/dashboard/rh/pending-validation-list";
import { RhRequestsTable } from "@/components/dashboard/rh/requests-table";
import { RhReviewDialog } from "@/components/dashboard/rh/review-dialog";
import { Button } from "@/components/ui/button";
import { useDismissable } from "@/hooks/use-dismissable";
import {
  documentToListItem,
  folderToListItem,
  sortFoldersByName,
} from "@/features/dashboard/documents/list-items";
import { folderDropHandlers } from "@/features/dashboard/documents/folder-drop";
import { useDraggedDocument } from "@/features/dashboard/documents/use-dragged-document";
import type { DocumentFolderRow } from "@/domain/documents";
import type { CraCalendarCell, CraEntryDraft } from "@/domain/cra";
import type { RhDocumentRow, RhDocumentsListItem, RhRequestRow as RequestRow } from "@/features/dashboard/rh/types";

/**
 * Titre et capacites de chaque sous-section documentaire RH.
 *
 * Remplace une cascade de ternaires et quatre booleens derives qui, depuis le retrait des
 * sous-sections mortes, testaient tous la meme condition. Les regrouper ici rend visible
 * ce qui distingue reellement une sous-section : seule « Tous les documents » propose la
 * navigation dans les dossiers, et avec elle le menu deroulant, l'import et la creation
 * de dossier.
 */
const RH_SUBSECTIONS: Record<string, { title: string; hasFolderBrowser: boolean }> = {
  docs_all: { title: "Tous les documents", hasFolderBrowser: true },
  docs_cra_facture: { title: "CRA & Facture", hasFolderBrowser: false },
  docs_conge: { title: "Demande de congé", hasFolderBrowser: false },
  docs_corbeille: { title: "Corbeille", hasFolderBrowser: false },
};

const RH_SUBSECTION_FALLBACK = { title: "Documents", hasFolderBrowser: false };

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
  /** Ouvre le depot de documents : un fichier ou un lot, meme dialogue. */
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
  leaveGenerating: boolean;
  onGenerateLeavePdf: (payload: RhLeaveRequestPayload) => void | Promise<void>;
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
  filteredPendingDocuments: RhDocumentRow[];
  filteredRhDocuments: RhDocumentRow[];
  trashedRhDocuments: RhDocumentRow[];
  rhFolders: DocumentFolderRow[];
  trashedRhFolders: DocumentFolderRow[];
  currentRhFolderId: string | null;
  rhFolderPath: DocumentFolderRow[];
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
  leaveGenerating,
  onGenerateLeavePdf,
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
}: RhDocumentsSectionProps) {
  const [documentsMenuOpen, setDocumentsMenuOpen] = useState(false);
  const documentsMenuRef = useDismissable<HTMLDivElement>(documentsMenuOpen, () =>
    setDocumentsMenuOpen(false),
  );
  const [reviewDialogDocument, setReviewDialogDocument] = useState<RhDocumentRow | null>(null);
  const [reviewDialogStatus, setReviewDialogStatus] = useState<"pending" | "validated" | "rejected" | null>(null);
  const [reviewDialogComment, setReviewDialogComment] = useState("");
  const rhTrashListItems = useMemo<RhDocumentsListItem[]>(
    () =>
      sortFoldersByName(
        trashedRhFolders.filter(
          () => documentTypeFilter === "all" || documentTypeFilter === "Dossier",
        ),
      ).map((folder) => folderToListItem(folder, { trash: true })),
    [documentTypeFilter, trashedRhFolders],
  );
  const rhTrashedDocumentItems = useMemo<RhDocumentsListItem[]>(
    () =>
      trashedRhDocuments
        .filter((document) =>
          (documentTypeFilter === "all" || document.typeLabel === documentTypeFilter) &&
          (documentPeriodFilter === "all" ||
            (document.periodMonth ?? "__none__") === documentPeriodFilter) &&
          (documentCreatorFilter === "all" || document.employeeName === documentCreatorFilter),
        )
        .map((document) =>
          documentToListItem(document, { ownerName: document.employeeName, trash: true }),
        ),
    [documentCreatorFilter, documentPeriodFilter, documentTypeFilter, trashedRhDocuments],
  );
  const rhDocumentsById = useMemo(
    () => new Map((currentSubSection === "docs_all" ? filteredAllDocuments : filteredRhDocuments).map((document) => [document.id, document])),
    [currentSubSection, filteredAllDocuments, filteredRhDocuments],
  );
  const { setDraggedId: setDraggedRhDocumentId, getDraggedDocument: getDraggedRhDocument } =
    useDraggedDocument(rhDocumentsById);
  const folderEnabledDocuments = useMemo(
    () => (currentSubSection === "docs_all" ? filteredAllDocuments : filteredRhDocuments),
    [currentSubSection, filteredAllDocuments, filteredRhDocuments],
  );
  const rhListItems = useMemo<RhDocumentsListItem[]>(() => {
    const folderScopedDocuments =
      currentSubSection === "docs_all"
        ? folderEnabledDocuments.filter((document) =>
            currentRhFolderId
              ? (document.folderId ?? null) === currentRhFolderId
              : (document.folderId ?? null) === null,
          )
        : folderEnabledDocuments;

    const documentItems: RhDocumentsListItem[] = folderScopedDocuments.map((document) =>
      documentToListItem(document, { ownerName: document.uploadedByName }),
    );

    if (currentSubSection !== "docs_all") {
      return documentItems;
    }

    const shouldShowFoldersByType =
      documentTypeFilter === "all" || documentTypeFilter === "Dossier";

    const folderItems: RhDocumentsListItem[] =
      currentRhFolderId || !shouldShowFoldersByType
        ? []
        : sortFoldersByName(rhFolders).map((folder) => folderToListItem(folder));

    return [...folderItems, ...documentItems];
  }, [currentRhFolderId, currentSubSection, documentTypeFilter, folderEnabledDocuments, rhFolders]);


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

  const { title: rhDocumentsTitle, hasFolderBrowser } =
    RH_SUBSECTIONS[currentSubSection] ?? RH_SUBSECTION_FALLBACK;

  return (
    <section className="space-y-2">
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        {hasFolderBrowser ? (
          <div ref={documentsMenuRef} className="relative min-w-0 max-w-full">
            {hasFolderBrowser && showRhFolderTrash ? (
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
            ) : hasFolderBrowser && rhFolderPath.length > 0 ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-semibold text-[#0A1A2F] sm:text-lg">
                <button
                  type="button"
                  onClick={() => onRhNavigateFolder(null)}
                  className="max-w-full truncate rounded-lg px-2 py-1 transition hover:bg-slate-100"
                  {...folderDropHandlers({
                    targetFolderId: null,
                    getDraggedDocument: getDraggedRhDocument,
                    onDrop: onRhMoveDocumentToRoot,
                  })}
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
                          {...folderDropHandlers({
                            targetFolderId: folder.id,
                            getDraggedDocument: getDraggedRhDocument,
                            onDrop: (document) => onRhMoveDocumentToFolder(document, folder.id),
                          })}
                        >
                          <span>{folder.name}</span>
                          <ChevronDown className={`h-4 w-4 transition ${documentsMenuOpen ? "rotate-180" : ""}`} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onRhNavigateFolder(folder.id)}
                          className="rounded-lg px-2 py-1 transition hover:bg-slate-100"
                          {...folderDropHandlers({
                            targetFolderId: folder.id,
                            getDraggedDocument: getDraggedRhDocument,
                            onDrop: (document) => onRhMoveDocumentToFolder(document, folder.id),
                          })}
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
                    {hasFolderBrowser ? (
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
                    {hasFolderBrowser ? (
                      <>
                        {/*
                          Une seule entree : le dialogue accepte un fichier comme un lot, et
                          l'attribution automatique par nom de fichier vaut dans les deux cas.
                        */}
                        <button
                          type="button"
                          className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-[#0A1A2F] transition hover:bg-slate-50"
                          onClick={() => {
                            setDocumentsMenuOpen(false);
                            onOpenRhUploadDialog();
                          }}
                        >
                          Importer des documents
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
          {currentSubSection === "docs_mes_demandes" ? (
            <Button type="button" variant="outline" size="sm" onClick={onOpenRequestDialog}>
              Demander un document
            </Button>
          ) : null}
        </div>
      </div>
      {["docs_all", "docs_a_valider", "docs_corbeille"].includes(currentSubSection) ? (
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
        ) : currentSubSection === "docs_conge" ? (
          <RhLeaveRequestEditor
            employees={employees}
            generating={leaveGenerating}
            onGenerate={onGenerateLeavePdf}
          />
        ) : currentSubSection === "docs_mes_demandes" ? (
          <RhRequestsTable
            requests={requests}
            cancellingRequestId={cancellingRequestId}
            onCancelRequest={onCancelRequest}
          />
        ) : currentSubSection === "docs_a_valider" ? (
          <RhPendingValidationList
            documents={filteredPendingDocuments}
            storageScope={storageScope}
            preferencesAuthToken={preferencesAuthToken}
            reviewingDocumentId={reviewingDocumentId}
            onViewDocument={onViewDocument}
            onOpenReviewDialog={openReviewDialog}
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





