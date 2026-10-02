"use client";

import { Gamepad2 } from "lucide-react";

import { ComposerPopover } from "@/components/messaging/composer-popover";
import { cn } from "@/lib/utils";
import {
  GAME_CATALOG,
  isMultiplayerGame,
  playerRange,
  playerRangeLabel,
  type GameCatalogEntry,
  type GameType,
} from "@/domain/games";

type GamePickerProps = {
  onSelect: (gameType: GameType) => void;
  disabled?: boolean;
  /** Membres de la conversation : un jeu qui en demande plus est grisé. */
  memberCount?: number;
};

/**
 * Menu « Jeux » de la zone de saisie : choisir un jeu envoie une invitation dans le fil.
 *
 * Rangé en deux sections, la plus utile d'abord : les jeux à plusieurs dans un groupe,
 * les jeux à deux en tête-à-tête. Une ligne par jeu (description complète au survol) et
 * une hauteur bornée : la liste ne doit pas déborder de l'écran.
 */
export function GamePicker({ onSelect, disabled = false, memberCount = 2 }: GamePickerProps) {
  const inGroup = memberCount > 2;
  // Jouables d'abord dans chaque section : un jeu grisé n'a pas à passer devant.
  const playableFirst = (games: GameCatalogEntry[]) =>
    [...games].sort(
      (left, right) =>
        Number(memberCount < playerRange(left).min) - Number(memberCount < playerRange(right).min),
    );
  const multiplayer = playableFirst(GAME_CATALOG.filter((game) => isMultiplayerGame(game.type)));
  const duel = playableFirst(GAME_CATALOG.filter((game) => !isMultiplayerGame(game.type)));
  const sections = inGroup
    ? [
        { title: "À plusieurs", games: multiplayer },
        { title: "À deux", games: duel },
      ]
    : [
        { title: "À deux", games: duel },
        { title: "À plusieurs", games: multiplayer },
      ];

  return (
    <ComposerPopover
      icon={<Gamepad2 className="h-4 w-4" />}
      label="Proposer un jeu"
      disabled={disabled}
      className="w-72"
    >
      {(close) => (
        <div className="max-h-[min(24rem,60dvh)] space-y-2 overflow-y-auto">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="sticky top-0 bg-app-raised px-1 pb-1 text-app-2xs uppercase tracking-wider text-app-text-muted">
                {section.title}
              </p>
              <ul>
                {section.games.map((game) => {
                  // Pas assez de monde dans la conversation : le jeu reste visible, grisé, et
                  // dit pourquoi — le serveur le refuserait de toute façon.
                  const tooFew = memberCount < playerRange(game).min;
                  return (
                    <li key={game.type}>
                      <button
                        type="button"
                        disabled={tooFew}
                        title={tooFew ? `${game.description} Se joue dans un groupe.` : game.description}
                        onClick={() => {
                          close();
                          onSelect(game.type);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-app-control px-2 py-1.5 text-left focus-visible:outline-app",
                          tooFew ? "cursor-not-allowed opacity-50" : "hover:bg-app-surface-hover",
                        )}
                      >
                        <span className="text-xl leading-none" aria-hidden>
                          {game.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-app-sm font-medium text-app-text">{game.name}</span>
                            <span className="shrink-0 text-app-2xs text-app-text-muted">
                              {tooFew ? "dans un groupe" : playerRangeLabel(game)}
                            </span>
                          </span>
                          <span className="block truncate text-app-xs text-app-text-muted">{game.description}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </ComposerPopover>
  );
}
