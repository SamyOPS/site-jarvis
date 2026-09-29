"use client";

import { useMemo, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { cellLabel } from "@/lib/battleship-game";
import { BATTLESHIP_SIZE, type BattleshipShip, type BattleshipShot } from "@/domain/games";

const CELLS = Array.from({ length: BATTLESHIP_SIZE * BATTLESHIP_SIZE }, (_, index) => index);
const COLUMNS = "ABCDEFGHIJ".split("");

type BattleshipGridProps = {
  /** Bateaux dessines en clair : sa propre flotte, ou celle de l'adversaire en fin de partie. */
  ships?: BattleshipShip[];
  /** Bateaux coules, dessines en rouge sombre. */
  sunkShips?: BattleshipShip[];
  shots?: BattleshipShot[];
  /** Case du dernier tir, entouree. */
  lastShot?: number | null;
  /** Rend les cases cliquables. */
  onCellClick?: (cell: number) => void;
  /** Case cliquable ou non, quand `onCellClick` est fourni. */
  isCellEnabled?: (cell: number) => boolean;
  /** Apercu de placement, calcule a partir de la case survolee. */
  preview?: (hovered: number) => { cells: number[]; valid: boolean } | null;
  label: string;
};

/**
 * Grille de 10 × 10, avec ses coordonnees A–J et 1–10.
 *
 * Couleurs fixes, hors theme, pour la meme raison que l'echiquier : la mer, les bateaux,
 * les touches et les ratés doivent se distinguer au premier coup d'oeil dans les deux
 * modes.
 */
export function BattleshipGrid({
  ships = [],
  sunkShips = [],
  shots = [],
  lastShot = null,
  onCellClick,
  isCellEnabled,
  preview,
  label,
}: BattleshipGridProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const shipCells = useMemo(() => new Set(ships.flat()), [ships]);
  const sunkCells = useMemo(() => new Set(sunkShips.flat()), [sunkShips]);
  const shotByCell = useMemo(() => new Map(shots.map((shot) => [shot.cell, shot.hit])), [shots]);
  const previewResult = hovered !== null && preview ? preview(hovered) : null;
  const previewCells = new Set(previewResult?.cells ?? []);

  return (
    <div className="w-full select-none">
      <p className="mb-1.5 text-app-xs font-medium text-app-text-secondary">{label}</p>
      <div
        className="grid w-full gap-px"
        style={{ gridTemplateColumns: `1.1rem repeat(${BATTLESHIP_SIZE}, minmax(0, 1fr))` }}
        onPointerLeave={() => setHovered(null)}
      >
        <span />
        {COLUMNS.map((column) => (
          <span key={column} className="text-center text-[0.6rem] font-semibold text-app-text-muted">
            {column}
          </span>
        ))}

        {CELLS.map((cell) => {
          const col = cell % BATTLESHIP_SIZE;
          const shot = shotByCell.get(cell);
          const isShip = shipCells.has(cell);
          const isSunk = sunkCells.has(cell);
          const enabled = !!onCellClick && (isCellEnabled ? isCellEnabled(cell) : true);
          const inPreview = previewCells.has(cell);

          return (
            <FragmentRow key={cell} col={col} row={Math.floor(cell / BATTLESHIP_SIZE)}>
              <button
                type="button"
                disabled={!enabled}
                onClick={() => onCellClick?.(cell)}
                onPointerEnter={() => setHovered(cell)}
                aria-label={`${cellLabel(cell)}${shot === true ? " touché" : shot === false ? " dans l'eau" : ""}`}
                className={cn(
                  "relative flex aspect-square items-center justify-center rounded-[2px] transition-colors",
                  isSunk
                    ? "bg-[#7f1d1d]"
                    : isShip
                      ? "bg-[#475569]"
                      : "bg-[#1e5a8a]",
                  enabled && !inPreview && "hover:brightness-125",
                  inPreview && (previewResult?.valid ? "bg-[#10b981]" : "bg-[#ef4444]/80"),
                  enabled ? "cursor-pointer" : "cursor-default",
                  lastShot === cell && "ring-2 ring-inset ring-yellow-300",
                )}
              >
                {shot === true && (
                  <span className="text-[0.8rem] font-black leading-none text-[#fca5a5]">✕</span>
                )}
                {shot === false && <span className="h-[28%] w-[28%] rounded-full bg-white/70" />}
              </button>
            </FragmentRow>
          );
        })}
      </div>
    </div>
  );
}

/** Insere le numero de ligne devant la premiere case de chaque ligne. */
function FragmentRow({ col, row, children }: { col: number; row: number; children: ReactNode }) {
  if (col !== 0) return <>{children}</>;
  return (
    <>
      <span className="flex items-center justify-center text-[0.6rem] font-semibold text-app-text-muted">
        {row + 1}
      </span>
      {children}
    </>
  );
}
