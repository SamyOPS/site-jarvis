"use client";

import { useState } from "react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";
import { connectFourLanding } from "@/lib/grid-games";
import {
  CONNECT_FOUR_COLUMNS,
  CONNECT_FOUR_ROWS,
  type GameSeat,
  type GridState,
} from "@/domain/games";

type GridBoardProps = {
  state: GridState;
  seat: GameSeat;
  interactive: boolean;
  onPlay: (value: number) => void;
};

/*
  Couleurs fixes, hors thème, comme pour l'échiquier : rouge pour le premier joueur,
  jaune pour le second — les couleurs du jeu en boîte, que tout le monde reconnaît.
*/
const DISC: Record<GameSeat, string> = {
  player_one: "bg-[#e11d48] shadow-[inset_0_-4px_0_rgba(0,0,0,0.25)]",
  player_two: "bg-[#facc15] shadow-[inset_0_-4px_0_rgba(0,0,0,0.2)]",
};

/** Puissance 4 : on choisit une colonne, le jeton tombe au plus bas. */
export function ConnectFourBoard({ state, seat, interactive, onPlay }: GridBoardProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const winning = new Set(state.winLine ?? []);
  const preview = hovered !== null && interactive ? connectFourLanding(state.board, hovered) : null;

  return (
    <div className="mx-auto w-full max-w-[min(44rem,calc((100dvh-17rem)*7/6))] select-none">
      {/* Jeton en attente au-dessus de la colonne survolée. */}
      <div className="mb-1 grid grid-cols-7 gap-1.5 px-2">
        {Array.from({ length: CONNECT_FOUR_COLUMNS }, (_, column) => (
          <span key={column} className="flex aspect-square items-center justify-center">
            {interactive && hovered === column && preview !== null && (
              <span className={cn("h-[80%] w-[80%] rounded-full opacity-70", DISC[seat])} />
            )}
          </span>
        ))}
      </div>

      <div
        className="grid grid-cols-7 gap-1.5 rounded-app-card bg-[#1d4ed8] p-2 shadow-[inset_0_-6px_0_rgba(0,0,0,0.25)]"
        onPointerLeave={() => setHovered(null)}
      >
        {state.board.map((owner, cell) => {
          const column = cell % CONNECT_FOUR_COLUMNS;
          const row = Math.floor(cell / CONNECT_FOUR_COLUMNS);
          const isLast = state.lastMove === cell;
          return (
            <button
              key={cell}
              type="button"
              disabled={!interactive || connectFourLanding(state.board, column) === null}
              onClick={() => onPlay(column)}
              onPointerEnter={() => setHovered(column)}
              aria-label={`Colonne ${column + 1}`}
              className={cn(
                "relative flex aspect-square items-center justify-center rounded-full bg-[#0f172a]/80",
                interactive ? "cursor-pointer" : "cursor-default",
                interactive && hovered === column && "bg-[#0f172a]/60",
              )}
            >
              {owner && (
                <motion.span
                  // Seul le dernier jeton tombe : rejouer la chute de toute la grille à
                  // chaque rendu serait illisible.
                  initial={isLast ? { y: `-${(row + 1) * 115}%` } : false}
                  animate={{ y: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 26 }}
                  className={cn(
                    "h-[86%] w-[86%] rounded-full",
                    DISC[owner],
                    winning.has(cell) && "ring-4 ring-white/90",
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-center text-app-xs text-app-text-muted">
        Vos jetons :{" "}
        <span className={cn("inline-block h-3 w-3 translate-y-0.5 rounded-full", DISC[seat])} />{" "}
        {seat === "player_one" ? "rouges" : "jaunes"} · {CONNECT_FOUR_ROWS} rangées, {CONNECT_FOUR_COLUMNS} colonnes
      </p>
    </div>
  );
}

const MARK: Record<GameSeat, { symbol: string; color: string }> = {
  player_one: { symbol: "✕", color: "text-[#e11d48]" },
  player_two: { symbol: "◯", color: "text-[#2563eb]" },
};

/** Morpion : trois symboles alignés. */
export function TicTacToeBoard({ state, seat, interactive, onPlay }: GridBoardProps) {
  const winning = new Set(state.winLine ?? []);

  return (
    <div className="@container mx-auto w-full max-w-[min(30rem,calc(100dvh-17rem))] select-none">
      <div className="grid grid-cols-3 gap-1.5 rounded-app-card bg-app-line p-1.5">
        {state.board.map((owner, cell) => (
          <button
            key={cell}
            type="button"
            disabled={!interactive || !!owner}
            onClick={() => onPlay(cell)}
            aria-label={`Case ${cell + 1}`}
            className={cn(
              "group flex aspect-square items-center justify-center rounded-app-control bg-app-surface text-[20cqw] font-bold leading-none transition-colors",
              interactive && !owner && "cursor-pointer hover:bg-app-surface-hover",
              winning.has(cell) && "bg-app-accent-soft",
            )}
          >
            {owner ? (
              <motion.span
                initial={state.lastMove === cell ? { scale: 0.3, opacity: 0 } : false}
                animate={{ scale: 1, opacity: 1 }}
                className={MARK[owner].color}
              >
                {MARK[owner].symbol}
              </motion.span>
            ) : (
              interactive && (
                <span className={cn("opacity-0 transition-opacity group-hover:opacity-25", MARK[seat].color)}>
                  {MARK[seat].symbol}
                </span>
              )
            )}
          </button>
        ))}
      </div>
      <p className="mt-2 text-center text-app-xs text-app-text-muted">
        Vous jouez les <span className={MARK[seat].color}>{MARK[seat].symbol}</span>
      </p>
    </div>
  );
}
