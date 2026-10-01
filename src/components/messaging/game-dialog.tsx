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
import { MessageThread } from "@/components/messaging/message-thread";
import type { MessageItem } from "@/domain/messaging";
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
  /**
   * Partie d'un groupe : nom d'un membre. L'adversaire n'est alors pas l'interlocuteur
   * du fil mais l'autre joueur assis, et ceux qui ne jouent pas regardent.
   */
  nameOf?: (profileId: string) => string;
  /** Fil de la conversation, affiche a cote du plateau pour discuter pendant la partie. */
  chat?: {
    messages: MessageItem[];
    sending: boolean;
    onSend: (body: string) => Promise<boolean>;
  };
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
export function GameDialog({
  gameId,
  currentUserId,
  opponentName: conversationName,
  nameOf,
  onClose,
  onRematch,
  chat,
}: GameDialogProps) {
  const { game, loading, pending, error, sendMove, playMove, resign } = useGame(gameId);

  const seat = game ? seatOf(game, currentUserId) : null;
  /*
    Adversaire. A deux, c'est l'interlocuteur du fil. Dans un groupe, c'est l'autre joueur
    assis — tant que personne n'a rejoint, « quelqu'un ».
  */
  const otherPlayerId = game
    ? seat === "player_two"
      ? game.playerOneId
      : seat === "player_one"
        ? game.playerTwoId
        : null
    : null;
  const opponentName = nameOf
    ? otherPlayerId
      ? nameOf(otherPlayerId)
      : "quelqu'un"
    : conversationName;
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
      <DialogContent className={cn("border-app-line bg-app-surface text-app-text", gameDialogWidth(game?.gameType, !!chat))}>
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

        <div className="flex min-w-0 flex-col gap-4 lg:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {loading && !game ? (
              <div className="flex aspect-[2/1] w-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-app-text-muted" />
              </div>
            ) : game && seat && game.status === "pending" ? (
              <div className="flex aspect-[2/1] items-center justify-center rounded-app-card bg-app-surface-hover p-6 text-center text-app-sm text-app-text-secondary">
                {entry?.icon} La partie commencera dès que {opponentName} l&apos;aura rejointe.
              </div>
            ) : game && !seat ? (
              // Membre du groupe qui ne joue pas : il suit la partie par le fil.
              <div className="flex aspect-[2/1] items-center justify-center rounded-app-card bg-app-surface-hover p-6 text-center text-app-sm text-app-text-secondary">
                {entry?.icon}{" "}
                {game.status === "finished"
                  ? "Cette partie est terminée."
                  : game.playerOneId && game.playerTwoId && nameOf
                    ? `Partie en cours entre ${nameOf(game.playerOneId)} et ${nameOf(game.playerTwoId)}.`
                    : "Cette partie est déjà complète."}
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
          </div>

          {/*
            Le fil de la conversation, pour discuter sans quitter la partie. A cote du plateau
            sur ecran large, dessous sinon. Hauteur bornee : le fil defile dans sa zone.
          */}
          {chat && (
            <aside
              aria-label={`Discussion avec ${opponentName}`}
              className="flex h-80 min-h-0 flex-col overflow-hidden rounded-app-card border border-app-line lg:h-auto lg:max-h-[75dvh] lg:min-h-[26rem] lg:w-80 lg:shrink-0"
            >
              <MessageThread
                messages={chat.messages}
                currentUserId={currentUserId}
                loading={false}
                sending={chat.sending}
                onSend={chat.onSend}
                isGroup={!!nameOf}
                nameOf={nameOf}
              />
            </aside>
          )}
        </div>
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
                ? `${opponentName.charAt(0).toUpperCase()}${opponentName.slice(1)} ne pourra plus rejoindre cette partie.`
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
