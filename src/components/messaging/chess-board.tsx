"use client";

import { useMemo, useState } from "react";
import type { Square } from "chess.js";

import { cn } from "@/lib/utils";
import { replayChess, type ChessMoveInput } from "@/lib/chess-game";
import type { ChessState } from "@/domain/games";

/*
  Glyphes pleins pour les deux camps, la couleur venant du CSS : les glyphes « creux »
  des blancs se lisent mal en petit. U+FE0E force la presentation texte — sans lui, le
  pion (U+265F) s'affiche en emoji sur la plupart des systemes.
*/
const GLYPHS: Record<string, string> = {
  k: "♚︎",
  q: "♛︎",
  r: "♜︎",
  b: "♝︎",
  n: "♞︎",
  p: "♟︎",
};

const PROMOTION_CHOICES = ["q", "r", "b", "n"] as const;

type ChessBoardProps = {
  state: ChessState;
  /** Camp affiche en bas. */
  orientation: "w" | "b";
  /** Vrai quand c'est a l'utilisateur de jouer. */
  interactive: boolean;
  onMove: (move: ChessMoveInput) => void;
};

/**
 * Echiquier cliquable : un clic sur une piece montre ses coups, un second clic joue.
 *
 * Les couleurs des cases sont FIXES, hors theme de la console : un echiquier aux cases
 * gris sur gris en mode sombre ne se lit plus.
 */
export function ChessBoard({ state, orientation, interactive, onMove }: ChessBoardProps) {
  const chess = useMemo(() => replayChess(state), [state]);
  const [selected, setSelected] = useState<Square | null>(null);
  const [promotion, setPromotion] = useState<{ from: Square; to: Square } | null>(null);

  // La selection ne survit pas a un changement de position (coup adverse, retour serveur).
  const [lastFen, setLastFen] = useState(state.fen);
  if (lastFen !== state.fen) {
    setLastFen(state.fen);
    setSelected(null);
    setPromotion(null);
  }

  const targets = useMemo(() => {
    if (!selected) return new Map<string, boolean>();
    // Valeur : vrai si le coup est une prise, pour dessiner un anneau plutot qu'un point.
    return new Map(
      chess
        .moves({ square: selected, verbose: true })
        .map((move) => [move.to, Boolean(move.captured)] as const),
    );
  }, [chess, selected]);

  const checkedKing = useMemo(() => {
    if (!chess.inCheck()) return null;
    const turn = chess.turn();
    for (const row of chess.board()) {
      for (const cell of row) {
        if (cell && cell.type === "k" && cell.color === turn) return cell.square;
      }
    }
    return null;
  }, [chess]);

  const rows = useMemo(() => {
    const board = chess.board();
    return orientation === "w" ? board : [...board].reverse().map((row) => [...row].reverse());
  }, [chess, orientation]);

  const files = orientation === "w" ? "abcdefgh" : "hgfedcba";
  const ranks = orientation === "w" ? "87654321" : "12345678";
  const myColor = orientation;

  const handleClick = (square: Square) => {
    if (!interactive) return;
    const piece = chess.get(square);

    if (selected && targets.has(square)) {
      const moving = chess.get(selected);
      const lastRank = square[1] === "8" || square[1] === "1";
      if (moving?.type === "p" && lastRank) {
        setPromotion({ from: selected, to: square });
        return;
      }
      onMove({ from: selected, to: square });
      setSelected(null);
      return;
    }

    setSelected(piece && piece.color === myColor && square !== selected ? square : null);
  };

  return (
    <div className="@container relative mx-auto aspect-square w-full max-w-[min(46rem,calc(100dvh-15rem))] select-none overflow-hidden rounded-app-control border border-app-line">
      <div className="grid h-full w-full grid-cols-8 grid-rows-8">
        {rows.map((row, rowIndex) =>
          row.map((_, colIndex) => {
            const square = `${files[colIndex]}${ranks[rowIndex]}` as Square;
            const cell = chess.get(square);
            const dark = (rowIndex + colIndex) % 2 === 1;
            const isLast =
              state.lastMove?.from === square || state.lastMove?.to === square;
            const target = targets.get(square);

            return (
              <button
                key={square}
                type="button"
                onClick={() => handleClick(square)}
                aria-label={`${square}${cell ? ` ${cell.color === "w" ? "blanc" : "noir"} ${cell.type}` : ""}`}
                className={cn(
                  "relative flex items-center justify-center",
                  dark ? "bg-[#b58863]" : "bg-[#f0d9b5]",
                  interactive ? "cursor-pointer" : "cursor-default",
                )}
              >
                {isLast && <span className="absolute inset-0 bg-yellow-300/45" />}
                {selected === square && <span className="absolute inset-0 bg-yellow-400/60" />}
                {checkedKing === square && (
                  <span className="absolute inset-0 bg-[radial-gradient(circle,rgba(239,68,68,0.9)_0%,rgba(239,68,68,0)_70%)]" />
                )}

                {cell && (
                  <span
                    className={cn(
                      "relative text-[10cqw] leading-none",
                      cell.color === "w"
                        ? "text-white [text-shadow:0_0_1px_#000,0_0_1px_#000,0_1px_2px_rgba(0,0,0,0.6)]"
                        : "text-neutral-900 [text-shadow:0_1px_1px_rgba(255,255,255,0.25)]",
                    )}
                  >
                    {GLYPHS[cell.type]}
                  </span>
                )}

                {target !== undefined &&
                  (target ? (
                    <span className="absolute inset-[6%] rounded-full border-[0.35rem] border-black/25" />
                  ) : (
                    <span className="absolute h-[28%] w-[28%] rounded-full bg-black/25" />
                  ))}

                {colIndex === 0 && (
                  <span
                    className={cn(
                      "absolute left-0.5 top-0 text-[max(0.6rem,1.6cqw)] font-semibold",
                      dark ? "text-[#f0d9b5]" : "text-[#b58863]",
                    )}
                  >
                    {ranks[rowIndex]}
                  </span>
                )}
                {rowIndex === 7 && (
                  <span
                    className={cn(
                      "absolute bottom-0 right-0.5 text-[max(0.6rem,1.6cqw)] font-semibold",
                      dark ? "text-[#f0d9b5]" : "text-[#b58863]",
                    )}
                  >
                    {files[colIndex]}
                  </span>
                )}
              </button>
            );
          }),
        )}
      </div>

      {promotion && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="rounded-app-card bg-app-raised p-3 shadow-app-raised">
            <p className="mb-2 text-center text-app-xs text-app-text-muted">Promotion</p>
            <div className="flex gap-1">
              {PROMOTION_CHOICES.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => {
                    onMove({ ...promotion, promotion: choice });
                    setPromotion(null);
                    setSelected(null);
                  }}
                  className="flex h-12 w-12 items-center justify-center rounded-app-control bg-[#f0d9b5] text-4xl leading-none hover:bg-[#e6c99a]"
                >
                  <span
                    className={
                      myColor === "w"
                        ? "text-white [text-shadow:0_0_1px_#000,0_0_1px_#000]"
                        : "text-neutral-900"
                    }
                  >
                    {GLYPHS[choice]}
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setPromotion(null)}
              className="mt-2 w-full text-center text-app-xs text-app-text-muted hover:text-app-text"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
