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
import { ChessBoard } from "@/components/messaging/chess-board";
import { useGame } from "@/features/messaging/use-game";
import { CHESS_RESULT_REASONS, replayChess } from "@/lib/chess-game";
import type { GameItem } from "@/domain/games";

type GameDialogProps = {
  gameId: string | null;
  currentUserId: string;
  opponentName: string;
  onClose: () => void;
};

/** Phrase d'etat sous le titre : a qui le tour, ou comment la partie s'est terminee. */
function describe(game: GameItem, currentUserId: string, opponentName: string) {
  const mySide = game.playerOneId === currentUserId ? "player_one" : "player_two";

  if (game.status === "pending") {
    return game.createdBy === currentUserId
      ? `En attente de ${opponentName}…`
      : "Partie en attente d'un second joueur.";
  }
  if (game.status === "finished") {
    const reason = game.resultReason ? CHESS_RESULT_REASONS[game.resultReason] ?? "" : "";
    if (!game.result) return `Partie close${reason ? ` (${reason})` : ""}.`;
    if (game.result === "draw") return `Partie nulle${reason ? ` (${reason})` : ""}.`;
    const won = game.result === mySide;
    return `${won ? "Vous avez gagné" : `${opponentName} a gagné`}${reason ? ` par ${reason}` : ""}.`;
  }

  const chess = replayChess(game.state);
  const myTurn = (chess.turn() === "w" ? game.playerOneId : game.playerTwoId) === currentUserId;
  const check = chess.inCheck() ? " Échec !" : "";
  return myTurn ? `À vous de jouer.${check}` : `Au tour de ${opponentName}.${check}`;
}

/**
 * Partie d'echecs ouverte depuis une invitation du fil.
 *
 * Ouvrir la fenetre suffit a rejoindre la partie (voir use-game) : l'invite clique sur
 * l'invitation, l'echiquier s'affiche et la partie commence.
 */
export function GameDialog({ gameId, currentUserId, opponentName, onClose }: GameDialogProps) {
  const { game, loading, pending, error, playMove, resign } = useGame(gameId);

  const isPlayer =
    !!game && (game.playerOneId === currentUserId || game.playerTwoId === currentUserId);
  const orientation = game?.playerTwoId === currentUserId ? "b" : "w";
  const myTurn =
    !!game &&
    game.status === "active" &&
    (replayChess(game.state).turn() === "w" ? game.playerOneId : game.playerTwoId) ===
      currentUserId;

  /** Fenetre de confirmation avant d'abandonner ou d'annuler : l'action est definitive. */
  const [confirming, setConfirming] = useState(false);
  const cancelling = game?.status === "pending";

  const confirmResign = async () => {
    await resign();
    setConfirming(false);
  };

  return (
    <Dialog open={!!gameId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl border-app-line bg-app-surface text-app-text">
        <DialogHeader>
          <DialogTitle className="text-app-md">♟️ Partie d&apos;échecs</DialogTitle>
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
          <div className="flex aspect-square w-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-app-text-muted" />
          </div>
        ) : game ? (
          <>
            <div className="flex items-center justify-between text-app-xs text-app-text-muted">
              <span>
                {opponentName} · {orientation === "w" ? "Noirs" : "Blancs"}
              </span>
            </div>
            <ChessBoard
              state={game.state}
              orientation={orientation}
              interactive={myTurn && !pending}
              onMove={(move) => void playMove(move)}
            />
            <div className="flex items-center justify-between gap-3 text-app-xs text-app-text-muted">
              <span>Vous · {orientation === "w" ? "Blancs" : "Noirs"}</span>
              <span>{game.state.moves.length} coup{game.state.moves.length > 1 ? "s" : ""}</span>
            </div>
          </>
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
    </Dialog>
  );
}
