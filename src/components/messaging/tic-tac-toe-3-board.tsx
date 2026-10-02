"use client";

import { motion } from "motion/react";

import { cn } from "@/lib/utils";
import { TIC_TAC_TOE_3_ALIGN, TIC_TAC_TOE_3_SIZE, type GameItem, type TicTacToe3State } from "@/domain/games";
import { playTicTacToe3 } from "@/lib/tic-tac-toe-3-game";
import { PLAYER_COLORS, PlayerStrip, type MultiplayerBoardProps } from "@/components/messaging/multiplayer-common";

/** Symbole de chaque joueur, par rang. Doublé d'une couleur, jamais la couleur seule. */
const SYMBOLS = ["✕", "◯", "△"];

/** Morpion à trois : grille de 6 × 6, quatre symboles alignés pour gagner. */
export function TicTacToe3Board({ game, player, interactive, nameOf, sendMove }: MultiplayerBoardProps) {
  const state = game.state as TicTacToe3State;
  const winning = new Set(state.winLine ?? []);

  // Coup rejoué en local pour s'afficher aussitôt ; le serveur reste seul juge.
  const play = (cell: number) =>
    sendMove({ cell }, (current: GameItem) => {
      try {
        return { ...current, state: playTicTacToe3(current.state as TicTacToe3State, player, cell).state };
      } catch {
        return null;
      }
    });

  return (
    <div className="space-y-3">
      <PlayerStrip
        game={game}
        nameOf={nameOf}
        detail={(index) => SYMBOLS[index]}
      />
      <div className="@container mx-auto w-full max-w-[min(30rem,calc(100dvh-20rem))] select-none">
        <div
          className="grid gap-1 rounded-app-card bg-app-line p-1"
          style={{ gridTemplateColumns: `repeat(${TIC_TAC_TOE_3_SIZE}, minmax(0, 1fr))` }}
        >
          {state.board.map((owner, cell) => (
            <button
              key={cell}
              type="button"
              disabled={!interactive || owner !== null}
              onClick={() => play(cell)}
              aria-label={`Case ${cell + 1}${owner !== null ? `, ${SYMBOLS[owner]}` : ""}`}
              className={cn(
                "group flex aspect-square items-center justify-center rounded-app-control bg-app-surface text-[9cqw] font-bold leading-none transition-colors",
                interactive && owner === null && "cursor-pointer hover:bg-app-surface-hover",
                winning.has(cell) && "bg-app-accent-soft",
              )}
            >
              {owner !== null ? (
                <motion.span
                  initial={state.lastMove === cell ? { scale: 0.3, opacity: 0 } : false}
                  animate={{ scale: 1, opacity: 1 }}
                  style={{ color: PLAYER_COLORS[owner] }}
                >
                  {SYMBOLS[owner]}
                </motion.span>
              ) : (
                interactive && (
                  <span className="opacity-0 transition-opacity group-hover:opacity-25" style={{ color: PLAYER_COLORS[player] }}>
                    {SYMBOLS[player]}
                  </span>
                )
              )}
            </button>
          ))}
        </div>
        <p className="mt-2 text-center text-app-xs text-app-text-muted">
          {player >= 0 ? (
            <>
              Vous jouez les <span style={{ color: PLAYER_COLORS[player] }}>{SYMBOLS[player]}</span> ·{" "}
            </>
          ) : null}
          alignez-en {TIC_TAC_TOE_3_ALIGN}
        </p>
      </div>
    </div>
  );
}
