"use client";

import { Gamepad2 } from "lucide-react";

import { ComposerPopover } from "@/components/messaging/composer-popover";
import { cn } from "@/lib/utils";
import { GAME_CATALOG, playerRange, playerRangeLabel, type GameType } from "@/domain/games";

type GamePickerProps = {
  onSelect: (gameType: GameType) => void;
  disabled?: boolean;
  /** Membres de la conversation : un jeu qui en demande plus est grisé. */
  memberCount?: number;
};

/** Menu « Jeux » de la zone de saisie : choisir un jeu envoie une invitation dans le fil. */
export function GamePicker({ onSelect, disabled = false, memberCount = 2 }: GamePickerProps) {
  return (
    <ComposerPopover
      icon={<Gamepad2 className="h-4 w-4" />}
      label="Proposer un jeu"
      disabled={disabled}
      className="w-72"
    >
      {(close) => (
        <div>
          <p className="px-1 pb-1.5 text-app-2xs uppercase tracking-wider text-app-text-muted">
            Jeux
          </p>
          <ul className="space-y-0.5">
            {GAME_CATALOG.map((game) => {
              // Pas assez de monde dans la conversation : le jeu reste visible, grisé, et
              // dit pourquoi — le serveur le refuserait de toute façon.
              const tooFew = memberCount < playerRange(game).min;
              return (
              <li key={game.type}>
                <button
                  type="button"
                  disabled={tooFew}
                  onClick={() => {
                    close();
                    onSelect(game.type);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-app-control px-2 py-2 text-left focus-visible:outline-app",
                    tooFew ? "cursor-not-allowed opacity-50" : "hover:bg-app-surface-hover",
                  )}
                >
                  <span className="text-2xl leading-none" aria-hidden>
                    {game.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-app-sm font-medium text-app-text">{game.name}</span>
                    <span className="block text-app-xs text-app-text-muted">{game.description}</span>
                    <span className="block text-app-2xs text-app-text-muted">
                      {playerRangeLabel(game)}
                      {tooFew ? " · dans un groupe" : ""}
                    </span>
                  </span>
                </button>
              </li>
              );
            })}
          </ul>
        </div>
      )}
    </ComposerPopover>
  );
}
