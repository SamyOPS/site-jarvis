"use client";

import { CircleCheck, CircleX } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type ConsoleResult = {
  tone: "success" | "error";
  /** Titre court. A defaut, deduit du ton. */
  title?: string;
  message: string;
};

/**
 * Retour au centre de l'ecran apres une action longue et consequente.
 *
 * Generer un CRA ou une facture prend plusieurs secondes, produit un PDF et l'archive : le
 * resultat ne doit pas se lire dans une ligne de texte en haut de page, hors du regard de
 * quelqu'un qui vient de cliquer en bas d'un calendrier. D'ou un dialogue modal, centre,
 * qu'il faut fermer.
 *
 * RESERVE aux actions de ce poids. Le meme traitement applique a chaque enregistrement
 * transformerait l'application en suite de fenetres a congedier — les messages en ligne
 * restent la bonne reponse pour tout le reste.
 *
 * L'icone et le titre disent le resultat autant que la couleur : rouge et vert ne suffisent
 * pas, une partie des lecteurs ne les distingue pas.
 */
export function ConsoleResultDialog({
  result,
  onClose,
}: {
  result: ConsoleResult | null;
  onClose: () => void;
}) {
  const success = result?.tone === "success";
  const Icon = success ? CircleCheck : CircleX;

  return (
    <Dialog
      open={result !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                success ? "bg-validated-soft text-validated" : "bg-rejected-soft text-rejected"
              }`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <DialogTitle className="text-app-md">
              {result?.title ?? (success ? "Document généré" : "Génération impossible")}
            </DialogTitle>
          </div>
          <DialogDescription className="mt-3 text-app-sm text-app-text-secondary">
            {result?.message}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          {/*
            Un seul bouton, qui ferme. Le dialogue ne propose pas de « reessayer » : l'action
            part d'un formulaire encore rempli derriere, il suffit de recliquer.
          */}
          <Button type="button" onClick={onClose} autoFocus>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
