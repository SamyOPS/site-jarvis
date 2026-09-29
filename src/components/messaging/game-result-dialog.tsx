"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WeatherEffect } from "@/components/messaging/weather-effect";
import { GAME_RESULT_REASONS } from "@/domain/games";

export type GameOutcome = "win" | "lose" | "draw";

type GameResultDialogProps = {
  outcome: GameOutcome | null;
  reason: string | null;
  opponentName: string;
  onClose: () => void;
  /** Relance une partie du même jeu. Absent : pas de bouton « Rejouer ». */
  onRematch?: () => void;
};

const COPY: Record<GameOutcome, { icon: string; title: string }> = {
  win: { icon: "🏆", title: "Victoire !" },
  lose: { icon: "🌧️", title: "Défaite…" },
  draw: { icon: "🤝", title: "Match nul" },
};

/**
 * Annonce de fin de partie, par-dessus le plateau : confettis pour le gagnant, pluie
 * pour le perdant. Fermer l'annonce laisse le plateau final visible.
 */
export function GameResultDialog({ outcome, reason, opponentName, onClose, onRematch }: GameResultDialogProps) {
  const copy = outcome ? COPY[outcome] : null;
  const reasonLabel = reason ? GAME_RESULT_REASONS[reason] : null;

  const detail =
    outcome === "win"
      ? `Bien joué, vous battez ${opponentName}${reasonLabel ? ` (${reasonLabel})` : ""}.`
      : outcome === "lose"
        ? `${opponentName} remporte la partie${reasonLabel ? ` (${reasonLabel})` : ""}. Ce sera pour la revanche !`
        : `Personne ne l'emporte${reasonLabel ? ` (${reasonLabel})` : ""}.`;

  return (
    <>
      {outcome === "win" && <WeatherEffect kind="confetti" />}
      {outcome === "lose" && <WeatherEffect kind="rain" />}

      <Dialog open={!!outcome} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="border-app-line bg-app-surface text-center text-app-text sm:max-w-sm">
          {copy && (
            <>
              <DialogHeader className="items-center sm:text-center">
                <span className="text-6xl leading-none" aria-hidden>
                  {copy.icon}
                </span>
                <DialogTitle className="pt-2 text-app-xl">{copy.title}</DialogTitle>
                <DialogDescription className="text-app-sm text-app-text-secondary">{detail}</DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:justify-center sm:gap-0">
                <Button type="button" variant="outline" size="sm" onClick={onClose}>
                  Revoir la partie
                </Button>
                {onRematch && (
                  <Button type="button" size="sm" onClick={onRematch}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Rejouer
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
