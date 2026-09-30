"use client";

import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GameBoard, gameDialogWidth } from "@/components/messaging/game-board";
import { GameResultDialog, type GameOutcome } from "@/components/messaging/game-result-dialog";
import { useGame } from "@/features/messaging/use-game";
import { activeStatus, isSeatToPlay } from "@/lib/game-turns";
import { GAME_RESULT_REASONS, gameCatalogEntry, seatOf, type GameItem, type GameType } from "@/domain/games";

type GameDialogProps = {
  gameId: string | null;
  currentUserId: string;
  opponentName: string;
  onClose: () => void;
  /** Relance une partie du meme jeu depuis l'annonce de fin. */
  onRematch?: (gameType: GameType) => void;
};

/** Phrase d'etat sous le titre : a qui le tour, ou comment la partie s'est terminee. */
function describe(game: GameItem, currentUserId: string, opponentName: string) {
  const mySide = seatOf(game, currentUserId);

  if (game.status === "pending") {
    return game.createdBy === currentUserId
      ? `En attente de ${opponentName}…`
      : "Partie en attente d'un second joueur.";
  }
  if (game.status === "finished") {
    const reason = game.resultReason ? GAME_RESULT_REASONS[game.resultReason] ?? "" : "";
    if (!game.result) return `Partie close${reason ? ` (${reason})` : ""}.`;
    if (game.result === "draw") return `Partie nulle${reason ? ` (${reason})` : ""}.`;
    const won = game.result === mySide;
    return `${won ? "Vous avez gagné" : `${opponentName} a gagné`}${reason ? ` par ${reason}` : ""}.`;
  }
  return mySide ? activeStatus(game, mySide, opponentName) : "Partie en cours.";
}

/**
 * Partie ouverte depuis une invitation du fil, quel que soit le jeu.
 *
 * Ouvrir la fenetre suffit a rejoindre la partie (voir use-game) : l'invite clique sur
 * l'invitation, le plateau s'affiche et la partie commence.
 */
export function GameDialog({ gameId, currentUserId, opponentName, onClose, onRematch }: GameDialogProps) {
  const { game, loading, pending, error, sendMove, playMove, resign } = useGame(gameId);

  const seat = game ? seatOf(game, currentUserId) : null;
  const isPlayer = !!seat;
  const myTurn = !!game && !!seat && isSeatToPlay(game, seat);
  const entry = gameCatalogEntry(game?.gameType);

  /*
    Annonce de fin de partie : seulement quand la partie se termine SOUS LES YEUX de
    l'utilisateur (passage de « en cours » a « terminee »). Rouvrir une partie finie depuis
    le fil ne relance ni les confettis ni la pluie.
  */
  const [outcome, setOutcome] = useState<GameOutcome | null>(null);
  const [seen, setSeen] = useState<{ id: string; status: GameItem["status"] } | null>(null);
  if (game && (seen?.id !== game.id || seen.status !== game.status)) {
    if (seen?.id === game.id && seen.status === "active" && game.status === "finished" && seat) {
      setOutcome(game.result === "draw" || !game.result ? "draw" : game.result === seat ? "win" : "lose");
    }
    setSeen({ id: game.id, status: game.status });
  }

  /** Fenetre de confirmation avant d'abandonner ou d'annuler : l'action est definitive. */
  const [confirming, setConfirming] = useState(false);
  const cancelling = game?.status === "pending";

  const confirmResign = async () => {
    await resign();
    setConfirming(false);
  };

  return (
    <Dialog
      open={!!gameId}
      onOpenChange={(open) => {
        if (open) return;
        // Le composant reste monte une fois ferme : l'annonce ne doit pas lui survivre.
        setOutcome(null);
        onClose();
      }}
    >
      <DialogContent className={cn("border-app-line bg-app-surface text-app-text", gameDialogWidth(game?.gameType))}>
        <DialogHeader>
          <DialogTitle className="text-app-md">
            {entry ? `${entry.icon} ${entry.name}` : "Partie"}
          </DialogTitle>
          <DialogDescription
            className={cn(
              "text-app-sm",
              myTurn ? "font-medium text-app-text" : "text-app-text-secondary",
            )}
          >
            {game ? describe(game, currentUserId, opponentName) : "Ouverture de la partie…"}
          </DialogDescription>
        </DialogHeader>

        {loading && !game ? (
          <div className="flex aspect-[2/1] w-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-app-text-muted" />
          </div>
        ) : game && seat && game.status === "pending" ? (
          <div className="flex aspect-[2/1] items-center justify-center rounded-app-card bg-app-surface-hover p-6 text-center text-app-sm text-app-text-secondary">
            {entry?.icon} La partie commencera dès que {opponentName} l&apos;aura rejointe.
          </div>
        ) : game && seat ? (
          <GameBoard
            game={game}
            seat={seat}
            opponentName={opponentName}
            interactive={myTurn && !pending}
            pending={pending}
            sendMove={(body, optimistic) => void sendMove(body, optimistic)}
            playChessMove={(move) => void playMove(move)}
          />
        ) : null}

        {error && <p className="text-app-sm text-red-500">{error}</p>}

        {game && isPlayer && game.status !== "finished" && (
          <div className="flex justify-end">
            {/* Annuler une invitation n'appartient qu'a son auteur ; abandonner, aux deux joueurs. */}
            {(game.status === "active" || game.createdBy === currentUserId) && (
              <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(true)} disabled={pending}>
                <Flag className="mr-2 h-4 w-4" />
                {game.status === "pending" ? "Annuler l'invitation" : "Abandonner"}
              </Button>
            )}
          </div>
        )}
      </DialogContent>

      {/* Imbriquee dans la fenetre de partie : Radix empile les deux et rend le focus a la premiere. */}
      <Dialog open={confirming} onOpenChange={(open) => !pending && setConfirming(open)}>
        <DialogContent className="sm:max-w-md border-app-line bg-app-surface text-app-text">
          <DialogHeader>
            <DialogTitle className="text-app-md">
              {cancelling ? "Annuler l'invitation ?" : "Abandonner la partie ?"}
            </DialogTitle>
            <DialogDescription className="text-app-sm text-app-text-secondary">
              {cancelling
                ? `${opponentName} ne pourra plus rejoindre cette partie.`
                : `La partie sera perdue et ${opponentName} sera déclaré(e) vainqueur. Cette action est définitive.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirming(false)}
              disabled={pending}
            >
              {cancelling ? "Garder l'invitation" : "Continuer la partie"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => void confirmResign()}
              disabled={pending}
            >
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {cancelling ? "Annuler l'invitation" : "Abandonner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <GameResultDialog
        outcome={outcome}
        reason={game?.resultReason ?? null}
        opponentName={opponentName}
        onClose={() => setOutcome(null)}
        onRematch={
          onRematch && game
            ? () => {
                setOutcome(null);
                onRematch(game.gameType);
              }
            : undefined
        }
      />
    </Dialog>
  );
}
