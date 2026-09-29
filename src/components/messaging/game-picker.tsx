"use client";

import { Gamepad2 } from "lucide-react";

import { ComposerPopover } from "@/components/messaging/composer-popover";
import { GAME_CATALOG, type GameType } from "@/domain/games";

type GamePickerProps = {
  onSelect: (gameType: GameType) => void;
  disabled?: boolean;
};

/** Menu « Jeux » de la zone de saisie : choisir un jeu envoie une invitation dans le fil. */
export function GamePicker({ onSelect, disabled = false }: GamePickerProps) {
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
            {GAME_CATALOG.map((game) => (
              <li key={game.type}>
                <button
                  type="button"
                  onClick={() => {
                    close();
                    onSelect(game.type);
                  }}
                  className="flex w-full items-center gap-3 rounded-app-control px-2 py-2 text-left hover:bg-app-surface-hover focus-visible:outline-app"
                >
                  <span className="text-2xl leading-none" aria-hidden>
                    {game.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-app-sm font-medium text-app-text">{game.name}</span>
                    <span className="block text-app-xs text-app-text-muted">{game.description}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ComposerPopover>
  );
}
