"use client";

import { Check, Loader2, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { gameCatalogEntry, playerRange } from "@/domain/games";
import type { MultiplayerBoardProps } from "@/components/messaging/multiplayer-common";
import { TicTacToe3Board } from "@/components/messaging/tic-tac-toe-3-board";
import { UnoBoard } from "@/components/messaging/uno-board";
import { LudoBoard } from "@/components/messaging/ludo-board";
import { QuizBoard } from "@/components/messaging/quiz-board";

/** Salle d'attente : qui est assis, et le bouton de lancement pour le créateur. */
function Lobby({
  game,
  nameOf,
  isCreator,
  pending,
  onStart,
}: Pick<MultiplayerBoardProps, "game" | "nameOf" | "isCreator" | "pending"> & { onStart: () => void }) {
  const entry = gameCatalogEntry(game.gameType)!;
  const { min, max } = playerRange(entry);
  const seats = game.players.length;
  const canStart = isCreator && seats >= min;

  return (
    <div className="flex flex-col items-center gap-4 rounded-app-card bg-app-surface-hover p-6 text-center">
      <p className="text-4xl" aria-hidden>{entry.icon}</p>
      <p className="text-app-sm text-app-text-secondary">
        {seats} joueur{seats > 1 ? "s" : ""} sur {max}
        {seats < min ? ` — il en faut ${min} pour commencer` : ""}
      </p>
      <ul className="space-y-1">
        {game.players.map((id, index) => (
          <li key={id} className="flex items-center justify-center gap-2 text-app-sm text-app-text">
            <Check className="h-4 w-4 text-validated" />
            {nameOf(id)}
            {index === 0 && <span className="text-app-xs text-app-text-muted">(a lancé l&apos;invitation)</span>}
          </li>
        ))}
      </ul>
      {isCreator ? (
        <Button type="button" size="sm" onClick={onStart} disabled={!canStart || pending}>
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
          {seats === max ? "Lancer la partie" : `Lancer à ${seats}`}
        </Button>
      ) : (
        <p className="text-app-xs text-app-text-muted">
          La partie démarre quand la table est pleine, ou quand son créateur la lance.
        </p>
      )}
    </div>
  );
}

/** Aiguillage vers le plateau du jeu à plusieurs, ou la salle d'attente. */
export function MultiplayerBoard(props: MultiplayerBoardProps & { onStart: () => void }) {
  const { game } = props;
  if (game.status === "pending") return <Lobby {...props} />;

  switch (game.gameType) {
    case "tic_tac_toe_3":
      return <TicTacToe3Board {...props} />;
    case "uno":
      return <UnoBoard {...props} />;
    case "ludo":
      return <LudoBoard {...props} />;
    case "quiz":
      return <QuizBoard {...props} />;
    default:
      return null;
  }
}
