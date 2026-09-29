"use client";

import { useEffect, useState } from "react";
import { RotateCw, Shuffle, Eraser, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BattleshipGrid } from "@/components/messaging/battleship-grid";
import { randomFleet, shipCells } from "@/lib/battleship-game";
import {
  BATTLESHIP_FLEET,
  otherSeat,
  type BattleshipShip,
  type BattleshipState,
  type GameItem,
  type GameSeat,
} from "@/domain/games";

type BattleshipPanelProps = {
  game: GameItem;
  seat: GameSeat;
  opponentName: string;
  pending: boolean;
  onPlace: (ships: BattleshipShip[]) => void;
  onFire: (cell: number) => void;
};

/**
 * Bataille navale : placement de la flotte, puis les deux grilles face a face.
 *
 * La grille adverse ne montre que ce que l'on SAIT d'elle — ses tirs, et les bateaux
 * coules. Le serveur ne transmet rien d'autre avant la fin de la partie.
 */
export function BattleshipPanel({
  game,
  seat,
  opponentName,
  pending,
  onPlace,
  onFire,
}: BattleshipPanelProps) {
  const state = game.state as BattleshipState;
  const opponent = otherSeat(seat);
  const myShips = game.private?.ships ?? null;

  if (game.status === "pending") {
    return (
      <div className="flex aspect-[2/1] items-center justify-center rounded-app-card bg-[#1e5a8a]/10 p-6 text-center text-app-sm text-app-text-secondary">
        🚢 Vous placerez votre flotte dès que {opponentName} aura rejoint la partie.
      </div>
    );
  }

  if (game.status === "active" && state.phase === "placement" && !state.ready[seat]) {
    return <FleetEditor pending={pending} onConfirm={onPlace} />;
  }

  const alreadyShot = new Set(state.shotsAt[opponent].map((shot) => shot.cell));
  const canFire = game.status === "active" && state.phase === "battle" && state.turn === seat && !pending;
  // En fin de partie, la flotte adverse est revelee par le serveur.
  const revealed = game.private?.opponentShips ?? [];

  return (
    <div className="space-y-3">
      {state.phase === "placement" && game.status === "active" && (
        <p className="rounded-app-control bg-app-surface-hover px-3 py-2 text-app-sm text-app-text-secondary">
          Flotte validée. {opponentName} place encore ses bateaux…
        </p>
      )}
      {state.lastShot && game.status === "active" && (
        <p className="text-center text-app-sm text-app-text-secondary">
          {state.lastShot.by === seat ? "Votre tir" : `Tir de ${opponentName}`} :{" "}
          <span
            className={cn(
              "font-medium",
              state.lastShot.hit ? "text-red-500" : "text-app-text-secondary",
            )}
          >
            {state.lastShot.sunk ? "touché, coulé !" : state.lastShot.hit ? "touché !" : "dans l'eau."}
          </span>
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <BattleshipGrid
          label={`Flotte de ${opponentName} · ${state.sunkShips[opponent].length}/${BATTLESHIP_FLEET.length} coulés`}
          ships={revealed}
          sunkShips={state.sunkShips[opponent]}
          shots={state.shotsAt[opponent]}
          lastShot={state.lastShot?.by === seat ? state.lastShot.cell : null}
          onCellClick={canFire ? onFire : undefined}
          isCellEnabled={(cell) => !alreadyShot.has(cell)}
        />
        <BattleshipGrid
          label={`Votre flotte · ${state.sunkShips[seat].length}/${BATTLESHIP_FLEET.length} coulés`}
          ships={myShips ?? []}
          sunkShips={state.sunkShips[seat]}
          shots={state.shotsAt[seat]}
          lastShot={state.lastShot?.by === opponent ? state.lastShot.cell : null}
        />
      </div>
    </div>
  );
}

/** Placement de la flotte : clic pour poser le bateau choisi, clic sur un bateau pour le reprendre. */
function FleetEditor({
  pending,
  onConfirm,
}: {
  pending: boolean;
  onConfirm: (ships: BattleshipShip[]) => void;
}) {
  const [ships, setShips] = useState<(BattleshipShip | null)[]>(() =>
    BATTLESHIP_FLEET.map(() => null),
  );
  const [selected, setSelected] = useState<number | null>(0);
  const [vertical, setVertical] = useState(false);

  // R fait pivoter, comme dans la plupart des jeux de placement.
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "r" || event.key === "R") setVertical((value) => !value);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const occupied = (except: number | null) =>
    new Set(ships.flatMap((ship, index) => (index === except || !ship ? [] : ship)));

  const candidate = (start: number) => {
    if (selected === null) return null;
    const cells = shipCells(start, BATTLESHIP_FLEET[selected].size, vertical);
    if (!cells) return null;
    const taken = occupied(selected);
    return { cells, valid: cells.every((cell) => !taken.has(cell)) };
  };

  const nextUnplaced = (list: (BattleshipShip | null)[], from: number) => {
    for (let offset = 1; offset <= list.length; offset += 1) {
      const index = (from + offset) % list.length;
      if (!list[index]) return index;
    }
    return null;
  };

  const handleCell = (cell: number) => {
    const owner = ships.findIndex((ship) => ship?.includes(cell));
    if (owner !== -1 && owner !== selected) {
      // Reprendre un bateau deja pose pour le deplacer.
      setShips((current) => current.map((ship, index) => (index === owner ? null : ship)));
      setSelected(owner);
      return;
    }
    const placed = candidate(cell);
    if (!placed?.valid || selected === null) return;
    const next = ships.map((ship, index) => (index === selected ? placed.cells : ship));
    setShips(next);
    setSelected(nextUnplaced(next, selected));
  };

  const complete = ships.every(Boolean);

  return (
    <div className="space-y-3">
      <p className="text-app-sm text-app-text-secondary">
        Placez vos bateaux : choisissez-en un, puis cliquez sur la grille. Cliquez sur un bateau
        posé pour le déplacer.
      </p>

      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <BattleshipGrid
          label="Votre flotte"
          ships={ships.filter((ship): ship is BattleshipShip => !!ship)}
          onCellClick={handleCell}
          preview={candidate}
        />

        <div className="space-y-2">
          <ul className="space-y-1">
            {BATTLESHIP_FLEET.map((ship, index) => (
              <li key={ship.name}>
                <button
                  type="button"
                  onClick={() => setSelected(index)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-app-control border px-2 py-1.5 text-left text-app-xs transition-colors",
                    selected === index
                      ? "border-app-accent bg-app-accent-soft text-app-text"
                      : "border-app-line text-app-text-secondary hover:bg-app-surface-hover",
                  )}
                >
                  <span className="truncate">{ship.name}</span>
                  <span className="flex shrink-0 items-center gap-0.5">
                    {Array.from({ length: ship.size }, (_, part) => (
                      <span
                        key={part}
                        className={cn("h-2 w-2 rounded-[1px]", ships[index] ? "bg-[#475569]" : "bg-app-line")}
                      />
                    ))}
                    {ships[index] && <Check className="ml-1 h-3 w-3 text-emerald-500" />}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-2 gap-1.5">
            <Button type="button" variant="outline" size="sm" onClick={() => setVertical((v) => !v)}>
              <RotateCw className="mr-1.5 h-3.5 w-3.5" />
              {vertical ? "Vertical" : "Horizontal"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShips(randomFleet());
                setSelected(null);
              }}
            >
              <Shuffle className="mr-1.5 h-3.5 w-3.5" />
              Aléatoire
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              setShips(BATTLESHIP_FLEET.map(() => null));
              setSelected(0);
            }}
          >
            <Eraser className="mr-1.5 h-3.5 w-3.5" />
            Tout retirer
          </Button>
          <Button
            type="button"
            size="sm"
            className="w-full"
            disabled={!complete || pending}
            onClick={() => onConfirm(ships as BattleshipShip[])}
          >
            Valider ma flotte
          </Button>
          <p className="text-app-2xs text-app-text-muted">Touche R pour pivoter.</p>
        </div>
      </div>
    </div>
  );
}
