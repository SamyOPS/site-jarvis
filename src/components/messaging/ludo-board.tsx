"use client";

import { motion } from "motion/react";
import { Dices } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LUDO_FINISH, type LudoState } from "@/domain/games";
import {
  LUDO_HOMES,
  LUDO_STABLES,
  LUDO_START_CELLS,
  LUDO_TRACK,
  legalLudoMoves,
  ludoPawnPosition,
} from "@/lib/ludo-game";
import {
  LUDO_COLORS,
  PlayerStrip,
  ludoColorOf,
  type MultiplayerBoardProps,
} from "@/components/messaging/multiplayer-common";

const SIZE = 11;
const DIE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

const key = (row: number, col: number) => `${row},${col}`;

/** Teinte de fond de chaque case du plateau : piste, départ, maison, écurie. */
const CELL_TINT = (() => {
  const tint = new Map<string, { color: number | null; kind: "track" | "start" | "home" | "stable" }>();
  LUDO_TRACK.forEach(([row, col]) => tint.set(key(row, col), { color: null, kind: "track" }));
  LUDO_START_CELLS.forEach((cell, color) => {
    const [row, col] = LUDO_TRACK[cell];
    tint.set(key(row, col), { color, kind: "start" });
  });
  LUDO_HOMES.forEach((cells, color) => cells.forEach(([row, col]) => tint.set(key(row, col), { color, kind: "home" })));
  LUDO_STABLES.forEach((cells, color) => cells.forEach(([row, col]) => tint.set(key(row, col), { color, kind: "stable" })));
  return tint;
})();

/** Petits chevaux : plateau en croix, dé tiré par le serveur. */
export function LudoBoard({ game, player, interactive, nameOf, sendMove }: MultiplayerBoardProps) {
  const state = game.state as LudoState;
  const colorOf = ludoColorOf(game);
  const movable = new Set(
    interactive && state.phase === "move" && state.die !== null ? legalLudoMoves(state, player, state.die) : [],
  );

  // Chevaux par case, pour les poser sur le plateau.
  const pawnsAt = new Map<string, { player: number; pawn: number }[]>();
  state.pawns.forEach((row, owner) => {
    if (state.out.includes(owner) && row.every((progress) => progress < 0)) return;
    row.forEach((progress, pawn) => {
      const [r, c] = ludoPawnPosition(state.colors[owner], progress, pawn);
      pawnsAt.set(key(r, c), [...(pawnsAt.get(key(r, c)) ?? []), { player: owner, pawn }]);
    });
  });

  const last = state.lastEvent;
  const lastText = last
    ? `${nameOf(game.players[last.by])} a fait ${last.die}${
        last.pawn === null ? " : aucun cheval ne peut avancer." : "."
      }${last.captured ? ` ${nameOf(game.players[last.captured.player])} retourne à l'écurie !` : ""}`
    : null;

  return (
    <div className="space-y-3">
      <PlayerStrip
        game={game}
        nameOf={nameOf}
        colorOf={colorOf}
        detail={(index) => {
          const home = state.pawns[index].filter((progress) => progress === LUDO_FINISH).length;
          return home ? `${home}/4 rentré${home > 1 ? "s" : ""}` : null;
        }}
      />

      <div className="mx-auto w-full max-w-[min(32rem,calc(100dvh-22rem))] select-none">
        <div
          className="grid aspect-square gap-[2px] rounded-app-card bg-[#fef3c7] p-1.5"
          style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: SIZE * SIZE }, (_, index) => {
            const row = Math.floor(index / SIZE);
            const col = index % SIZE;
            const tint = CELL_TINT.get(key(row, col));
            const pawns = pawnsAt.get(key(row, col)) ?? [];
            if (!tint) return <span key={index} />;
            const color = tint.color === null ? null : LUDO_COLORS[tint.color];

            return (
              <span
                key={index}
                className={cn(
                  "relative flex items-center justify-center",
                  tint.kind === "stable" ? "rounded-full" : "rounded-[30%] border border-black/15",
                )}
                style={{
                  background:
                    tint.kind === "track" ? "#ffffff" : tint.kind === "stable" ? `${color}33` : `${color}${tint.kind === "start" ? "" : "99"}`,
                }}
              >
                {pawns.map(({ player: owner, pawn }, stackIndex) => {
                  const mine = owner === player && movable.has(pawn);
                  return (
                    <motion.button
                      key={`${owner}-${pawn}`}
                      layoutId={`ludo-${game.id}-${owner}-${pawn}`}
                      type="button"
                      disabled={!mine}
                      onClick={() => sendMove({ action: "move", pawn })}
                      aria-label={`Cheval ${pawn + 1} de ${nameOf(game.players[owner])}${mine ? ", jouable" : ""}`}
                      className={cn(
                        "absolute h-[72%] w-[72%] rounded-full border-2 border-white shadow",
                        mine && "z-10 animate-pulse ring-2 ring-black/70",
                      )}
                      style={{
                        background: colorOf(owner),
                        // Plusieurs chevaux sur une case (arrivée) : légèrement décalés. Par
                        // `x`/`y` et non `transform`, que Motion gère lui-même.
                        ...(pawns.length > 1
                          ? { x: `${stackIndex * 14 - 7}%`, y: `${stackIndex * -14 + 7}%` }
                          : {}),
                      }}
                    />
                  );
                })}
              </span>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <span aria-label={state.die ? `Dé : ${state.die}` : "Dé"} className="text-5xl leading-none text-app-text">
            {state.die ? DIE_FACES[state.die - 1] : "🎲"}
          </span>
          {interactive && state.phase === "roll" && (
            <Button type="button" size="sm" onClick={() => sendMove({ action: "roll" })}>
              <Dices className="mr-2 h-4 w-4" />
              Lancer le dé
            </Button>
          )}
        </div>
        {lastText && <p className="text-center text-app-xs text-app-text-muted">{lastText}</p>}
      </div>
    </div>
  );
}
