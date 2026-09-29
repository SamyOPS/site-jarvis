"use client";

import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { isDarkSquare, legalCheckersMoves } from "@/lib/checkers-game";
import { CHECKERS_SIZE, type CheckersState, type GameSeat } from "@/domain/games";

type CheckersBoardProps = {
  state: CheckersState;
  seat: GameSeat;
  interactive: boolean;
  onMove: (path: number[]) => void;
};

const CELLS = CHECKERS_SIZE * CHECKERS_SIZE;

/**
 * Damier de 10 × 10.
 *
 * Le coup se construit case par case : on choisit la pièce, puis chaque arrêt de la
 * rafle. Deux rafles peuvent aboutir à la même case en prenant des pièces différentes —
 * choisir seulement l'arrivée serait ambigu. Le coup part dès que le chemin est complet.
 *
 * Le second joueur voit le damier retourné : chacun a ses pièces en bas.
 */
export function CheckersBoard({ state, seat, interactive, onMove }: CheckersBoardProps) {
  const [path, setPath] = useState<number[]>([]);

  // Le chemin en cours ne survit pas à un changement de position.
  const [lastBoard, setLastBoard] = useState(state.board);
  if (lastBoard !== state.board) {
    setLastBoard(state.board);
    setPath([]);
  }

  const legal = useMemo(
    () => (interactive ? legalCheckersMoves(state, seat) : []),
    [interactive, seat, state],
  );
  const candidates = legal.filter((move) => path.every((cell, index) => move.path[index] === cell));
  const movable = new Set(legal.map((move) => move.path[0]));
  const nextSteps = new Set(
    path.length > 0 ? candidates.map((move) => move.path[path.length]).filter((cell) => cell !== undefined) : [],
  );
  // Pièces déjà « prises » sur le chemin choisi : on les estompe pour suivre la rafle.
  const pendingCaptures = new Set(
    path.length > 1 && candidates[0] ? candidates[0].captured.slice(0, path.length - 1) : [],
  );
  const lastMove = new Set(state.lastMove ?? []);

  const handleClick = (cell: number) => {
    if (!interactive) return;
    if (movable.has(cell) && (path.length <= 1 || !nextSteps.has(cell))) {
      setPath(path[0] === cell ? [] : [cell]);
      return;
    }
    if (!nextSteps.has(cell)) return;
    const next = [...path, cell];
    const complete = candidates.find(
      (move) => move.path.length === next.length && move.path.every((step, index) => step === next[index]),
    );
    if (complete) {
      setPath([]);
      onMove(complete.path);
    } else {
      setPath(next);
    }
  };

  const flipped = seat === "player_two";
  const captureRequired = legal.some((move) => move.captured.length > 0);

  return (
    <div className="mx-auto w-full max-w-[min(30rem,calc(100dvh-16rem))] select-none">
      <div className="grid aspect-square grid-cols-10 overflow-hidden rounded-app-control border border-app-line">
        {Array.from({ length: CELLS }, (_, index) => {
          const cell = flipped ? CELLS - 1 - index : index;
          const dark = isDarkSquare(cell);
          const piece = state.board[cell];
          const selected = path.includes(cell);
          const isNext = nextSteps.has(cell);

          return (
            <button
              key={cell}
              type="button"
              disabled={!dark}
              onClick={() => handleClick(cell)}
              aria-label={`Case ${cell}`}
              className={cn(
                "relative flex items-center justify-center",
                dark ? "bg-[#8b5a3c]" : "bg-[#ecd9b8]",
                dark && lastMove.has(cell) && "bg-[#a67c3d]",
                selected && "bg-[#b8912f]",
                interactive && (movable.has(cell) || isNext) ? "cursor-pointer" : "cursor-default",
              )}
            >
              {piece && (
                <span
                  className={cn(
                    "relative flex h-[78%] w-[78%] items-center justify-center rounded-full border-2 transition-opacity",
                    piece.seat === "player_one"
                      ? "border-[#cbd5e1] bg-[#f8fafc] text-[#b45309] shadow-[inset_0_-3px_0_rgba(0,0,0,0.18)]"
                      : "border-[#111827] bg-[#374151] text-[#fbbf24] shadow-[inset_0_-3px_0_rgba(0,0,0,0.35)]",
                    pendingCaptures.has(cell) && "opacity-30",
                    // Pièce jouable, et surtout pièce qui DOIT prendre : repère discret.
                    interactive && path.length === 0 && movable.has(cell) && "ring-2 ring-emerald-400/80",
                  )}
                >
                  {piece.king && <span className="text-[min(4vw,1.1rem)] leading-none">♛</span>}
                </span>
              )}
              {isNext && <span className="absolute h-[30%] w-[30%] rounded-full bg-emerald-400/80" />}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-center text-app-xs text-app-text-muted">
        Vous jouez les {seat === "player_one" ? "blancs" : "noirs"}
        {interactive && captureRequired && " · prise obligatoire"}
      </p>
    </div>
  );
}
