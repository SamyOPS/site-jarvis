import { Download, Eye, RotateCcw } from "lucide-react";

import { DashboardDocumentList } from "@/components/dashboard/document-list";
import { Button } from "@/components/ui/button";
import type { RhDocumentRow } from "@/features/dashboard/rh/types";

const RH_SHARED_COLUMNS_STORAGE_KEY = "rh-documents-shared-columns";

type RhDocumentsReviewListProps = {
  documents: RhDocumentRow[];
  storageScope?: string | null;
  preferencesAuthToken?: string | null;
  reviewDrafts: Record<string, string>;
  onReviewDraftsChange: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  onViewDocument: (document: RhDocumentRow) => void | Promise<void>;
  onDownloadDocument: (document: RhDocumentRow) => void | Promise<void>;
  onReviewDocument: (document: RhDocumentRow, status: "pending" | "validated" | "rejected") => void | Promise<void>;
  viewingDocumentId: string | null;
  downloadingDocumentId: string | null;
  reviewingDocumentId: string | null;
  formatMonth: (value: string | null) => string;
  formatDocumentStatus: (value: RhDocumentRow["status"]) => string;
};

export function RhDocumentsReviewList({
  documents,
  storageScope,
  preferencesAuthToken,
  reviewDrafts,
  onReviewDraftsChange,
  onViewDocument,
  onDownloadDocument,
  onReviewDocument,
  viewingDocumentId,
  downloadingDocumentId,
  reviewingDocumentId,
  formatMonth,
  formatDocumentStatus,
}: RhDocumentsReviewListProps) {
  if (!documents.length) {
    return <p className="text-sm text-[#0A1A2F]/70">Aucun document salarie pour le moment.</p>;
  }

  return (
    <DashboardDocumentList
      items={documents.map((document) => ({
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
  );
}
