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

/**
 * Revue d'un document par le RH : valider, refuser, remettre en attente.
 *
 * Le commentaire est OBLIGATOIRE pour un refus — le collaborateur doit savoir quoi
 * corriger, et le serveur rejette un refus sans motif. La fenetre le dit et le fait
 * respecter : libelle « obligatoire », bouton grise tant que le motif est vide. Elle
 * annoncait « optionnel » dans tous les cas, et l'erreur n'arrivait qu'apres coup.
 */
export function RhReviewDialog({
  document,
  status,
  comment,
  reviewingDocumentId,
  onCommentChange,
  onClose,
  onConfirm,
}: RhReviewDialogProps) {
  const rejecting = status === "rejected";
  const missingReason = rejecting && !comment.trim();

  return (
    <Dialog
      open={Boolean(document && status)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="border-app-line bg-app-surface text-app-text sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-app-lg">
            {status === "validated"
              ? "Valider le document"
              : rejecting
                ? "Refuser le document"
                : "Remettre en attente"}
          </DialogTitle>
          <DialogDescription className="text-app-sm text-app-text-secondary">
            {document ? `Document : ${document.fileName}` : null}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label htmlFor="rh-review-comment" className="block text-app-sm font-medium text-app-text">
            {rejecting ? "Motif du refus (obligatoire)" : "Commentaire RH (optionnel)"}
          </label>
          <textarea
            id="rh-review-comment"
            value={comment}
            onChange={(event) => onCommentChange(event.target.value)}
            rows={4}
            required={rejecting}
            aria-required={rejecting}
            className="w-full rounded-app-control border border-app-line bg-app-field px-3 py-2 text-app-sm text-app-text placeholder:text-app-text-muted focus-visible:outline-app"
            placeholder={
              rejecting
                ? "Expliquez au collaborateur ce qu'il doit corriger..."
                : "Saisir un commentaire..."
            }
          />
          {rejecting ? (
            <p className="text-app-xs text-app-text-muted">
              Le collaborateur verra ce motif avec le document refuse.
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            type="button"
            variant={rejecting ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={
              !document ||
              !status ||
              missingReason ||
              reviewingDocumentId === document.id
            }
          >
            {rejecting ? "Refuser" : "Confirmer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
