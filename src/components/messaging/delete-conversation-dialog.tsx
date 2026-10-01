"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DeleteConversationDialogProps = {
  /** Interlocuteur de la discussion a supprimer ; `null` ferme la fenetre. */
  contactName: string | null;
  /** Un groupe : le texte parle de ses membres, pas d'un interlocuteur. */
  isGroup?: boolean;
  onCancel: () => void;
  /** Rend `false` si la suppression a echoue : la fenetre reste alors ouverte. */
  onConfirm: () => Promise<boolean>;
};

/**
 * Confirmation de suppression d'une discussion.
 *
 * Le texte dit ce que la suppression fait VRAIMENT — disparition de sa propre liste,
 * conservation chez l'autre — : « supprimer » seul laisserait croire a un effacement des
 * deux cotes, ou a l'inverse a une action sans portee.
 */
export function DeleteConversationDialog({
  contactName,
  isGroup = false,
  onCancel,
  onConfirm,
}: DeleteConversationDialogProps) {
  const [deleting, setDeleting] = useState(false);

  const confirm = async () => {
    setDeleting(true);
    try {
      if (await onConfirm()) onCancel();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={contactName !== null} onOpenChange={(open) => !open && !deleting && onCancel()}>
      <DialogContent className="border-app-line bg-app-surface text-app-text sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-app-lg">Supprimer la discussion ?</DialogTitle>
          <DialogDescription className="text-app-sm text-app-text-secondary">
            {isGroup ? (
              <>
                Le groupe <strong className="text-app-text">{contactName}</strong> disparaîtra de votre
                liste, avec tout son historique. Vous en restez membre : il réapparaîtra au prochain
                message, avec les nouveaux messages seulement. Pour ne plus le recevoir, quittez-le
                depuis ses réglages.
              </>
            ) : (
              <>
                La discussion avec <strong className="text-app-text">{contactName}</strong> disparaîtra
                de votre liste, avec tout son historique. {contactName} la conservera de son côté.
                Si l&apos;un de vous écrit à nouveau, elle réapparaîtra avec les nouveaux messages
                seulement.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={deleting}>
            Annuler
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => void confirm()}
            disabled={deleting}
          >
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
