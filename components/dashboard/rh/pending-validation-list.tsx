import { Check, X } from "lucide-react";

import { DashboardDocumentList } from "@/components/dashboard/document-list";
import { Button } from "@/components/ui/button";
import type { RhDocumentRow } from "@/features/dashboard/rh/types";

type RhPendingValidationListProps = {
  documents: RhDocumentRow[];
  storageScope?: string | null;
  preferencesAuthToken?: string | null;
  reviewingDocumentId: string | null;
  onViewDocument: (document: RhDocumentRow) => void | Promise<void>;
  onOpenReviewDialog: (document: RhDocumentRow, status: "pending" | "validated" | "rejected") => void;
  formatMonth: (value: string | null) => string;
  formatDocumentStatus: (value: RhDocumentRow["status"]) => string;
};

export function RhPendingValidationList({
  documents,
  storageScope,
  preferencesAuthToken,
  reviewingDocumentId,
  onViewDocument,
  onOpenReviewDialog,
  formatMonth,
  formatDocumentStatus,
}: RhPendingValidationListProps) {
  if (!documents.length) {
    return <p className="text-sm text-[#0A1A2F]/70">Aucun document en attente de validation.</p>;
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
            onClick={() => onOpenReviewDialog(document, "validated")}
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
            onClick={() => onOpenReviewDialog(document, "rejected")}
            disabled={reviewingDocumentId === document.id}
            aria-label={`Refuser ${document.fileName}`}
            title="Refuser"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    />
  );
}
