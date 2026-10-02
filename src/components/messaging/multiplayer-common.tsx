"use client";

import { cn } from "@/lib/utils";
import type { GameItem, LudoState, MultiplayerTurnState } from "@/domain/games";

/** Pièces communes aux plateaux des jeux à plusieurs. */

/**
 * Couleurs des joueurs d'un jeu à plusieurs, par rang : fixes, hors thème, comme les
 * pions d'un jeu en boîte. Les petits chevaux ont leurs propres couleurs (`LudoState.colors`).
 */
export const PLAYER_COLORS = ["#e11d48", "#2563eb", "#16a34a", "#eab308", "#9333ea", "#ea580c", "#0891b2", "#db2777"];

export type MultiplayerBoardProps = {
  game: GameItem;
  /** Rang de l'utilisateur, ou -1 s'il regarde. */
  player: number;
  /** C'est à lui d'agir et aucun coup n'est en vol. */
  interactive: boolean;
  pending: boolean;
  isCreator: boolean;
  nameOf: (profileId: string) => string;
  sendMove: (body: Record<string, unknown>, optimistic?: (game: GameItem) => GameItem | null) => void;
};

/**
 * Bandeau des joueurs : couleur, nom, et ce que le jeu veut montrer à côté (cartes en
 * main, score). Le joueur qui a la main est souligné ; un joueur sorti est barré.
 */
export function PlayerStrip({
  game,
  nameOf,
  colorOf = (index) => PLAYER_COLORS[index % PLAYER_COLORS.length],
  detail,
  highlight,
}: {
  game: GameItem;
  nameOf: (profileId: string) => string;
  colorOf?: (index: number) => string;
  detail?: (index: number) => string | null;
  /** Rangs à mettre en avant ; par défaut, celui qui a la main. */
  highlight?: number[];
}) {
  const state = game.state as Partial<MultiplayerTurnState>;
  const active = highlight ?? (game.status === "active" && state.turn !== undefined ? [state.turn] : []);

  return (
    <ul className="flex flex-wrap justify-center gap-2">
      {game.players.map((id, index) => {
        const out = state.out?.includes(index);
        const extra = detail?.(index);
        return (
          <li
            key={id}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-app-xs",
              active.includes(index) ? "border-app-accent bg-app-accent-soft text-app-text" : "border-app-line text-app-text-secondary",
              out && "opacity-50 line-through",
            )}
          >
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: colorOf(index) }} />
            <span className="font-medium">{nameOf(id)}</span>
            {extra && <span className="text-app-text-muted">· {extra}</span>}
          </li>
        );
      })}
    </ul>
  );
}

/** Couleur d'un joueur aux petits chevaux : celle de ses pions. */
export function ludoColorOf(game: GameItem) {
  const colors = (game.state as LudoState).colors ?? [];
  return (index: number) => LUDO_COLORS[colors[index] ?? index];
}

export const LUDO_COLORS = ["#e11d48", "#2563eb", "#16a34a", "#eab308"];
