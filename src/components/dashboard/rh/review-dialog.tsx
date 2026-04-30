import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RhDocumentRow } from "@/features/dashboard/rh/types";

type ReviewStatus = "pending" | "validated" | "rejected";

type RhReviewDialogProps = {
  document: RhDocumentRow | null;
  status: ReviewStatus | null;
  comment: string;
  reviewingDocumentId: string | null;
  onCommentChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function RhReviewDialog({
  document,
  status,
  comment,
  reviewingDocumentId,
  onCommentChange,
  onClose,
  onConfirm,
}: RhReviewDialogProps) {
  return (
    <Dialog
      open={Boolean(document && status)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {status === "validated"
              ? "Valider le document"
              : status === "rejected"
                ? "Refuser le document"
                : "Remettre en attente"}
          </DialogTitle>
          <DialogDescription>
            {document
              ? `Document : ${document.fileName}`
              : "Saisir un commentaire RH optionnel."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[#0A1A2F]">
            Commentaire RH (optionnel)
          </label>
          <textarea
            value={comment}
            onChange={(event) => onCommentChange(event.target.value)}
            rows={4}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Saisir un commentaire..."
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={
              !document ||
              !status ||
              reviewingDocumentId === document.id
            }
          >
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
