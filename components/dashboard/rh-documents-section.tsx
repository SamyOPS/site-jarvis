import { Download, Eye, RotateCcw, Trash2 } from "lucide-react";

import { DashboardDocumentList } from "@/components/dashboard/document-list";
import { DocumentFiltersBar } from "@/components/dashboard/document-filters-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RhDocumentRow, RhRequestRow as RequestRow } from "@/features/dashboard/rh/types";

type FilterOption = {
  value: string;
  label: string;
};

type RhDocumentsSectionProps = {
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
  requests: RequestRow[];
  cancellingRequestId: string | null;
  onCancelRequest: (request: RequestRow) => void | Promise<void>;
  filteredSalarieDocuments: RhDocumentRow[];
  filteredPendingDocuments: RhDocumentRow[];
  filteredRhDocuments: RhDocumentRow[];
  onViewDocument: (document: RhDocumentRow) => void | Promise<void>;
  onDownloadDocument: (document: RhDocumentRow) => void | Promise<void>;
  onReviewDocument: (document: RhDocumentRow, status: "pending" | "validated" | "rejected") => void | Promise<void>;
  onDeleteRhDocument: (document: RhDocumentRow) => void | Promise<void>;
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
  requests,
  cancellingRequestId,
  onCancelRequest,
  filteredSalarieDocuments,
  filteredPendingDocuments,
  filteredRhDocuments,
  onViewDocument,
  onDownloadDocument,
  onReviewDocument,
  onDeleteRhDocument,
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
  return (
    <section className="space-y-4">
      <div className="flex flex-row items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[#0A1A2F]">Documents</h2>
        <div className="flex items-center gap-2">
          {currentSubSection === "docs_tous" ? (
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
      {["docs_tous", "docs_salaries", "docs_a_valider"].includes(currentSubSection) ? (
        <DocumentFiltersBar
          fields={["type", "period", "status", "owner"]}
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
        {currentSubSection === "docs_mes_demandes" ? (
          requests.length ? (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
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
                subtitle: document.employeeName ? `Collaborateur : ${document.employeeName}` : null,
                details: document.reviewComment ? `Commentaire RH : ${document.reviewComment}` : null,
              }))}
              storageKey="rh-documents-salaries-columns"
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
            <p className="text-sm text-[#0A1A2F]/70">Aucun document salarie pour le moment.</p>
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
                subtitle: document.employeeName ? `Collaborateur : ${document.employeeName}` : null,
                details: document.reviewComment ? `Commentaire RH : ${document.reviewComment}` : null,
              }))}
              storageKey="rh-documents-pending-columns"
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
                </>
              )}
            />
          ) : (
            <p className="text-sm text-[#0A1A2F]/70">Aucun document en attente de validation.</p>
          )
        ) : filteredRhDocuments.length ? (
          <DashboardDocumentList
            items={filteredRhDocuments.map((document) => ({
              ...document,
              ownerName: document.uploadedByName,
              createdAt: document.createdAt,
              statusLabel: formatDocumentStatus(document.status),
              periodLabel: formatMonth(document.periodMonth),
              subtitle:
                document.employeeName && document.employeeName !== "Aucun collaborateur"
                  ? `Collaborateur : ${document.employeeName}`
                  : null,
              details: document.reviewComment ? `Commentaire RH : ${document.reviewComment}` : null,
            }))}
            storageKey="rh-documents-rh-columns"
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
            )}
          />
        ) : (
          <p className="text-sm text-[#0A1A2F]/70">Aucun document RH pour le moment.</p>
        )}
      </div>
    </section>
  );
}


