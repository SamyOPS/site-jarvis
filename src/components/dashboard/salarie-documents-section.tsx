import { ChevronDown } from "lucide-react";

import { Fragment, useMemo, useState } from "react";

import { useDismissable } from "@/hooks/use-dismissable";
import {
  documentToListItem,
  folderToListItem,
  sortFoldersByName,
} from "@/features/dashboard/documents/list-items";
import { folderDropHandlers } from "@/features/dashboard/documents/folder-drop";
import { useDraggedDocument } from "@/features/dashboard/documents/use-dragged-document";
import {
  SalarieCraInvoiceEditor,
  type CraInvoiceTab,
  type SalarieInvoiceSettings,
} from "@/components/dashboard/salarie/cra-invoice-editor";
import type { CalendarMission } from "@/components/dashboard/salarie/cra/work-days-calendar";
import type { InvoiceLineInput } from "@/features/dashboard/salarie/invoice-totals";
import { SalarieLeaveRequestEditor, type LeaveRequestPayload } from "@/components/dashboard/salarie/leave-request-editor";
import { SalarieDocumentsListView } from "@/components/dashboard/salarie/documents-list-view";
import { SalariePendingRequests } from "@/components/dashboard/salarie/pending-requests";
import type { TimeUnit } from "@/domain/common";
import type { CraCalendarCell, CraEntryDraft } from "@/domain/cra";
import type {
  CraSummaryRow,
  SalarieDocumentRow as DocumentRow,
  SalarieDocumentsListItem,
  SalarieRequestRow as RequestRow,
} from "@/features/dashboard/salarie/types";
import type { DocumentFolderRow } from "@/domain/documents";

type FilterOption = {
  value: string;
  label: string;
};

type SalarieDocumentsSectionProps = {
  storageScope?: string | null;
  preferencesAuthToken?: string | null;
  currentSubSection: string;
  documentsCardTitle: string;
  craFactureTab?: CraInvoiceTab;
  billingProfileReady: boolean;
  selectedCraId: string | null;
  selectedCraSummary: Pick<CraSummaryRow, "status" | "pdf_version"> | null;
  craItems: CraSummaryRow[];
  onSelectCra: (craId: string) => void | Promise<void>;
  resetCraEditor: () => void;
  onGenerateCraPdf: () => void | Promise<void>;
  onGenerateInvoicePdf: () => void | Promise<void>;
  craGenerating: boolean;
  invoiceGenerating: boolean;
  craCalendarMonth: string;
  craPeriodMonth: string;
  onCraCalendarMonthChange: (value: string) => void;
  shiftMonthInputValue: (value: string, offset: number) => string;
  craDraftTotalDays: number;
  craNotes: string;
  onCraNotesChange: (value: string) => void;
  leaveGenerating: boolean;
  onGenerateLeavePdf: (payload: LeaveRequestPayload) => void | Promise<void>;
  invoice: SalarieInvoiceSettings;
  onInvoiceChange: (value: SalarieInvoiceSettings) => void;
  weekdayLabels: string[];
  craCalendarCells: CraCalendarCell[];
  craEntriesByDate: Map<string, CraEntryDraft[]>;
  craEntries: CraEntryDraft[];
  onCycleCraWorkDate: (workDate: string, missionId?: string) => void;
  onFillCraWorkingDays: () => void;
  onClearCraEntries: () => void;
  craTimeUnit: TimeUnit;
  craDraftTotalHours: number;
  onSetCraEntryHours: (workDate: string, hours: number, missionId?: string) => void;
  onSetCraEntryDayQuantity: (workDate: string, dayQuantity: number, missionId?: string) => void;
  onRemoveCraWorkDate: (workDate: string, missionId?: string) => void;
  craMissions: CalendarMission[];
  activeMissionId: string;
  onSelectMission: (missionId: string) => void;
  craInvoiceLines: InvoiceLineInput[];
  activeAbsenceType: string;
  onSelectAbsence: (absenceType: string) => void;
  craAbsenceTotals: Map<string, number>;
  onApplyCraHoursToAllEntries: (hours: number) => void;
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
};

export function SalarieDocumentsSection({
  storageScope,
  preferencesAuthToken,
  currentSubSection,
  documentsCardTitle,
  craFactureTab,
  billingProfileReady,
  selectedCraId,
  selectedCraSummary,
  craItems,
  onSelectCra,
  resetCraEditor,
  onGenerateCraPdf,
  onGenerateInvoicePdf,
  craGenerating,
  invoiceGenerating,
  craCalendarMonth,
  craPeriodMonth,
  onCraCalendarMonthChange,
  shiftMonthInputValue,
  craDraftTotalDays,
  craNotes,
  onCraNotesChange,
  leaveGenerating,
  onGenerateLeavePdf,
  invoice,
  onInvoiceChange,
  weekdayLabels,
  craCalendarCells,
  craEntriesByDate,
  craEntries,
  onCycleCraWorkDate,
  onFillCraWorkingDays,
  onClearCraEntries,
  craTimeUnit,
  craDraftTotalHours,
  onSetCraEntryHours,
  onSetCraEntryDayQuantity,
  onRemoveCraWorkDate,
  craMissions,
  activeMissionId,
  onSelectMission,
  craInvoiceLines,
  activeAbsenceType,
  onSelectAbsence,
  craAbsenceTotals,
  onApplyCraHoursToAllEntries,
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
}: SalarieDocumentsSectionProps) {
  const [documentsMenuOpen, setDocumentsMenuOpen] = useState(false);
  const documentsMenuRef = useDismissable<HTMLDivElement>(documentsMenuOpen, () =>
    setDocumentsMenuOpen(false),
  );
  const isPayslipsSubSection = currentSubSection === "docs_fiches_paie";
  const trashFolderItems = useMemo<SalarieDocumentsListItem[]>(
    () =>
      sortFoldersByName(
        trashedFolders.filter(
          () => documentTypeFilter === "all" || documentTypeFilter === "Dossier",
        ),
      ).map((folder) => folderToListItem(folder, { trash: true })),
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
        .map((document) =>
          documentToListItem(document, { ownerName: document.uploadedByName, trash: true }),
        ),
    [documentPeriodFilter, documentTypeFilter, trashedDocuments],
  );
  const documentsById = useMemo(
    () => new Map(visibleDocuments.map((document) => [document.id, document])),
    [visibleDocuments],
  );
  const { setDraggedId: setDraggedDocumentId, getDraggedDocument } =
    useDraggedDocument(documentsById);
  const listItems = useMemo<SalarieDocumentsListItem[]>(() => {
    const documentItems: SalarieDocumentsListItem[] = visibleDocuments.map((document) =>
      documentToListItem(document, { ownerName: document.uploadedByName }),
    );

    if (currentSubSection !== "docs_tous") {
      return documentItems;
    }

    const shouldShowFoldersByType =
      documentTypeFilter === "all" || documentTypeFilter === "Dossier";

    const folderItems: SalarieDocumentsListItem[] =
      currentFolderId || !shouldShowFoldersByType
        ? []
        : sortFoldersByName(folders).map((folder) => folderToListItem(folder));

    return [...folderItems, ...documentItems];
  }, [currentFolderId, currentSubSection, documentTypeFilter, folders, visibleDocuments]);


  return (
    <section className="space-y-4">
      <div className="flex flex-row items-center justify-between gap-3">
        {currentSubSection === "docs_tous" ? (
          <div ref={documentsMenuRef} className="relative min-w-0 max-w-full">
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
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-semibold text-[#0A1A2F] sm:text-lg">
                <button
                  type="button"
                  onClick={() => onNavigateFolder(null)}
                  className="max-w-full truncate rounded-lg px-2 py-1 transition hover:bg-slate-100"
                  {...folderDropHandlers({
                    targetFolderId: null,
                    getDraggedDocument: getDraggedDocument,
                    onDrop: onMoveDocumentToRoot,
                  })}
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
                          {...folderDropHandlers({
                            targetFolderId: folder.id,
                            getDraggedDocument: getDraggedDocument,
                            onDrop: (document) => onMoveDocumentToFolder(document, folder.id),
                          })}
	                        >
	                          <span>{folder.name}</span>
	                          <ChevronDown className={`h-4 w-4 transition ${documentsMenuOpen ? "rotate-180" : ""}`} />
	                        </button>
	                      ) : (
                        <button
                          type="button"
                          onClick={() => onNavigateFolder(folder.id)}
                          className="rounded-lg px-2 py-1 transition hover:bg-slate-100"
                          {...folderDropHandlers({
                            targetFolderId: folder.id,
                            getDraggedDocument: getDraggedDocument,
                            onDrop: (document) => onMoveDocumentToFolder(document, folder.id),
                          })}
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
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-[#0A1A2F]">{documentsCardTitle}</h2>
            {isPayslipsSubSection ? (
              <p className="mt-0.5 text-xs text-[#0A1A2F]/60">
                Fiches de paie deposees par le service RH : consultation et telechargement.
              </p>
            ) : null}
          </div>
        )}
      </div>
      <div>
        {currentSubSection === "docs_cra_facture" ? (
          <SalarieCraInvoiceEditor
            initialTab={craFactureTab}
            billingProfileReady={billingProfileReady}
            selectedCraId={selectedCraId}
            selectedCraSummary={selectedCraSummary}
            craItems={craItems}
            onSelectCra={onSelectCra}
            resetCraEditor={resetCraEditor}
            onGenerateCraPdf={onGenerateCraPdf}
            onGenerateInvoicePdf={onGenerateInvoicePdf}
            craGenerating={craGenerating}
            invoiceGenerating={invoiceGenerating}
            craCalendarMonth={craCalendarMonth}
            craPeriodMonth={craPeriodMonth}
            onCraCalendarMonthChange={onCraCalendarMonthChange}
            shiftMonthInputValue={shiftMonthInputValue}
            craDraftTotalDays={craDraftTotalDays}
            craNotes={craNotes}
            onCraNotesChange={onCraNotesChange}
            invoice={invoice}
            onInvoiceChange={onInvoiceChange}
            weekdayLabels={weekdayLabels}
            craCalendarCells={craCalendarCells}
            craEntriesByDate={craEntriesByDate}
            craEntries={craEntries}
            onCycleCraWorkDate={onCycleCraWorkDate}
            onFillCraWorkingDays={onFillCraWorkingDays}
            onClearCraEntries={onClearCraEntries}
            craTimeUnit={craTimeUnit}
            craDraftTotalHours={craDraftTotalHours}
            onSetCraEntryHours={onSetCraEntryHours}
            onSetCraEntryDayQuantity={onSetCraEntryDayQuantity}
            onRemoveCraWorkDate={onRemoveCraWorkDate}
            craMissions={craMissions}
            activeMissionId={activeMissionId}
            onSelectMission={onSelectMission}
            craInvoiceLines={craInvoiceLines}
            activeAbsenceType={activeAbsenceType}
            onSelectAbsence={onSelectAbsence}
            craAbsenceTotals={craAbsenceTotals}
            onApplyCraHoursToAllEntries={onApplyCraHoursToAllEntries}
            formatCraEntryDateLabel={formatCraEntryDateLabel}
            updateCraEntry={updateCraEntry}
          />
        ) : currentSubSection === "docs_conge" ? (
          <SalarieLeaveRequestEditor
            generating={leaveGenerating}
            onGenerate={onGenerateLeavePdf}
          />
        ) : currentSubSection === "docs_a_deposer" ? (
          <SalariePendingRequests
            pendingRequests={pendingRequests}
            openUploadDialog={openUploadDialog}
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
            readOnly={isPayslipsSubSection}
            emptyMessage={
              isPayslipsSubSection
                ? "Aucune fiche de paie disponible pour le moment."
                : undefined
            }
          />
        )}
      </div>
    </section>
  );
}

