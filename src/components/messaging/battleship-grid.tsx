"use client";

import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { cellLabel } from "@/lib/battleship-game";
import { ShipShape, shipKind } from "@/components/messaging/battleship-ship";
import { BATTLESHIP_SIZE, type BattleshipShip, type BattleshipShot } from "@/domain/games";

const CELLS = Array.from({ length: BATTLESHIP_SIZE * BATTLESHIP_SIZE }, (_, index) => index);
const COLUMNS = "ABCDEFGHIJ".split("");
const ROWS = Array.from({ length: BATTLESHIP_SIZE }, (_, index) => index + 1);

/** Cle d'un bateau, independante de l'ordre de ses cases. */
const shipKey = (ship: BattleshipShip) => [...ship].sort((a, b) => a - b).join(",");

type BattleshipGridProps = {
  /**
   * Bateaux a dessiner, DANS L'ORDRE DE LA FLOTTE : c'est la place qui distingue le
   * sous-marin du contre-torpilleur. Une place vide (`null`) est un bateau pas encore pose.
   */
  ships?: (BattleshipShip | null)[];
  /** Bateaux coules, dessines en rouge ; ceux absents de `ships` sont ajoutes. */
  sunkShips?: BattleshipShip[];
  /** Dessine `ships` en retrait : flotte adverse revelee en fin de partie. */
  revealed?: boolean;
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
 * Trois couches superposees : la mer (les cases cliquables), les bateaux dessines
 * par-dessus sans capter les clics, puis les tirs et l'apercu de placement, qui doivent se
 * voir AU-DESSUS des bateaux.
 *
 * Couleurs fixes, hors theme, pour la meme raison que l'echiquier : la mer, les bateaux,
 * les touches et les ratés doivent se distinguer au premier coup d'oeil dans les deux modes.
 */
export function BattleshipGrid({
  ships = [],
  sunkShips = [],
  revealed = false,
  shots = [],
  lastShot = null,
  onCellClick,
  isCellEnabled,
  preview,
  label,
}: BattleshipGridProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const shotByCell = useMemo(() => new Map(shots.map((shot) => [shot.cell, shot.hit])), [shots]);
  const previewResult = hovered !== null && preview ? preview(hovered) : null;
  const previewCells = new Set(previewResult?.cells ?? []);

  const drawn = useMemo(() => {
    const sunkKeys = new Set(sunkShips.map(shipKey));
    const known = ships.flatMap((ship, index) => {
      if (!ship) return [];
      const tone = sunkKeys.has(shipKey(ship)) ? "sunk" : revealed ? "revealed" : "normal";
      return [{ cells: ship, kind: shipKind(ship.length, index), tone: tone as "sunk" | "revealed" | "normal" }];
    });
    // Bateaux adverses coules : on n'en connait que les cases, le type se deduit de la taille.
    const knownKeys = new Set(known.map((ship) => shipKey(ship.cells)));
    const extraSunk = sunkShips
      .filter((ship) => !knownKeys.has(shipKey(ship)))
      .map((ship) => ({ cells: ship, kind: shipKind(ship.length), tone: "sunk" as const }));
    return [...known, ...extraSunk];
  }, [revealed, ships, sunkShips]);

  return (
    <div className="@container mx-auto w-full max-w-[calc(100dvh-17rem)] select-none">
      <p className="mb-1.5 text-app-xs font-medium text-app-text-secondary">{label}</p>
      <div className="grid grid-cols-[1.1rem_1fr] gap-x-1 gap-y-0.5">
        <span />
        <div className="grid grid-cols-10">
          {COLUMNS.map((column) => (
            <span key={column} className="text-center text-[0.6rem] font-semibold text-app-text-muted">
              {column}
            </span>
          ))}
        </div>

        <div className="grid grid-rows-10">
          {ROWS.map((row) => (
            <span
              key={row}
              className="flex items-center justify-center text-[0.6rem] font-semibold text-app-text-muted"
            >
              {row}
            </span>
          ))}
        </div>

        <div
          className="relative aspect-square w-full overflow-hidden rounded-app-control bg-[#1e5a8a]"
          onPointerLeave={() => setHovered(null)}
        >
          {/* Couche 1 : la mer, quadrillee, et les clics. */}
          <div className="absolute inset-0 grid grid-cols-10 grid-rows-10">
            {CELLS.map((cell) => {
              const enabled = !!onCellClick && (isCellEnabled ? isCellEnabled(cell) : true);
              const shot = shotByCell.get(cell);
              return (
                <button
                  key={cell}
                  type="button"
                  disabled={!enabled}
                  onClick={() => onCellClick?.(cell)}
                  onPointerEnter={() => setHovered(cell)}
                  aria-label={`${cellLabel(cell)}${shot === true ? " touché" : shot === false ? " dans l'eau" : ""}`}
                  className={cn(
                    "border-[0.5px] border-white/10 transition-colors",
                    enabled ? "cursor-pointer hover:bg-white/15" : "cursor-default",
                  )}
                />
              );
            })}
          </div>

          {/* Couche 2 : les bateaux. */}
          {drawn.map((ship) => (
            <ShipShape key={shipKey(ship.cells)} cells={ship.cells} kind={ship.kind} tone={ship.tone} />
          ))}

          {/* Couche 3 : apercu, tirs, dernier tir. Transparente aux clics. */}
          <div className="pointer-events-none absolute inset-0 grid grid-cols-10 grid-rows-10">
            {CELLS.map((cell) => {
              const shot = shotByCell.get(cell);
              const inPreview = previewCells.has(cell);
              return (
                <span
                  key={cell}
                  className={cn(
                    "flex items-center justify-center",
                    inPreview && (previewResult?.valid ? "bg-emerald-400/45" : "bg-red-500/55"),
                    lastShot === cell && "ring-2 ring-inset ring-yellow-300",
                  )}
                >
                  {shot === true && (
                    <span className="flex h-[62%] w-[62%] items-center justify-center rounded-full bg-orange-500 text-[4.5cqw] font-black leading-none text-white shadow-[0_0_6px_rgba(249,115,22,0.9)]">
                      ✕
                    </span>
                  )}
                  {shot === false && <span className="h-[26%] w-[26%] rounded-full bg-white/75" />}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
