"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ArrowLeftRight, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { UnoCard, UnoColor, UnoSecret, UnoState } from "@/domain/games";
import { UNO_COLORS, canPlayUno, isWild } from "@/lib/uno-game";
import { PlayerStrip, type MultiplayerBoardProps } from "@/components/messaging/multiplayer-common";

/** Couleurs du jeu en boîte, hors thème. */
const COLOR: Record<UnoColor, { bg: string; label: string }> = {
  red: { bg: "#dc2626", label: "Rouge" },
  yellow: { bg: "#eab308", label: "Jaune" },
  green: { bg: "#16a34a", label: "Vert" },
  blue: { bg: "#2563eb", label: "Bleu" },
};

const VALUE_LABEL: Record<string, string> = {
  skip: "⊘",
  reverse: "⇄",
  draw2: "+2",
  wild: "★",
  wild4: "+4",
};

const VALUE_NAME: Record<string, string> = {
  skip: "passe",
  reverse: "inversion",
  draw2: "+2",
  wild: "joker",
  wild4: "joker +4",
};

/** Nom lisible d'une carte, pour les lecteurs d'écran et le journal. */
export function unoCardName(card: UnoCard) {
  const value = VALUE_NAME[card.value] ?? card.value;
  return card.color ? `${value} ${COLOR[card.color].label.toLowerCase()}` : value;
}

/** Une carte. Un joker sans couleur choisie est noir, avec les quatre couleurs en coin. */
function CardFace({ card, size = "md" }: { card: UnoCard; size?: "md" | "lg" }) {
  const bg = card.color ? COLOR[card.color].bg : "#111827";
  return (
    <span
      className={cn(
        "relative flex items-center justify-center rounded-lg border-2 border-white font-black text-white shadow-md",
        size === "lg" ? "h-28 w-20 text-3xl" : "h-20 w-14 text-xl",
      )}
      style={{ background: bg }}
    >
      <span className="flex h-[70%] w-[80%] -rotate-12 items-center justify-center rounded-[50%] bg-white/90" style={{ color: bg }}>
        {VALUE_LABEL[card.value] ?? card.value}
      </span>
      {isWild(card) && !card.color && (
        <span aria-hidden className="absolute right-1 top-1 grid grid-cols-2 gap-px">
          {UNO_COLORS.map((color) => (
            <span key={color} className="h-1.5 w-1.5 rounded-sm" style={{ background: COLOR[color].bg }} />
          ))}
        </span>
      )}
    </span>
  );
}

/** Table d'UNO : pile, pioche, et la main de l'utilisateur. */
export function UnoBoard({ game, player, interactive, nameOf, sendMove }: MultiplayerBoardProps) {
  const state = game.state as UnoState;
  const hand = (game.private?.secret as UnoSecret | null | undefined)?.hand ?? [];
  // Joker choisi, en attente de sa couleur.
  const [choosing, setChoosing] = useState<number | null>(null);

  const playCard = (index: number) => {
    const card = hand[index];
    if (!card || !interactive || !canPlayUno(card, state)) return;
    if (isWild(card)) {
      setChoosing(index);
      return;
    }
    sendMove({ action: "play", card: index });
  };

  const last = state.lastEvent;
  const lastText = last
    ? last.kind === "play" && last.card
      ? `${nameOf(game.players[last.by])} a posé ${unoCardName(last.card)}${
          last.penalty ? ` : ${nameOf(game.players[last.penalty.to])} pioche ${last.penalty.count}` : ""
        }.`
      : last.kind === "draw"
        ? `${nameOf(game.players[last.by])} a pioché.`
        : `${nameOf(game.players[last.by])} a passé.`
    : null;

  return (
    <div className="space-y-4">
      <PlayerStrip
        game={game}
        nameOf={nameOf}
        detail={(index) => `${state.handCounts[index]} carte${state.handCounts[index] > 1 ? "s" : ""}${state.handCounts[index] === 1 ? " · UNO !" : ""}`}
      />

      <div className="flex items-center justify-center gap-6">
        {/* Pioche : infinie, d'où son dos toujours présent. */}
        <button
          type="button"
          onClick={() => sendMove({ action: "draw" })}
          disabled={!interactive || state.hasDrawn}
          aria-label="Piocher une carte"
          className="relative flex h-28 w-20 items-center justify-center rounded-lg border-2 border-white bg-[#111827] text-app-sm font-bold text-[#facc15] shadow-md transition-transform enabled:hover:-translate-y-1 disabled:opacity-60"
        >
          UNO
        </button>

        <div className="flex flex-col items-center gap-2">
          <motion.div
            key={`${state.top.value}-${state.top.color}-${last?.by ?? ""}-${state.handCounts.join(",")}`}
            initial={{ scale: 0.85, rotate: -8, opacity: 0.6 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
          >
            <CardFace card={state.top} size="lg" />
          </motion.div>
          <span className="flex items-center gap-1.5 text-app-xs text-app-text-secondary">
            <span className="h-3 w-3 rounded-full" style={{ background: COLOR[state.color].bg }} />
            {COLOR[state.color].label}
            {state.direction === 1 ? (
              <ArrowRight aria-label="Sens horaire" className="h-3.5 w-3.5" />
            ) : (
              <ArrowLeftRight aria-label="Sens inversé" className="h-3.5 w-3.5" />
            )}
          </span>
        </div>
      </div>

      {lastText && <p className="text-center text-app-xs text-app-text-muted">{lastText}</p>}

      {player >= 0 && (
        <div className="space-y-2">
          {choosing !== null ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-app-sm text-app-text-secondary">Couleur du joker :</span>
              {UNO_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    sendMove({ action: "play", card: choosing, color });
                    setChoosing(null);
                  }}
                  className="rounded-full px-3 py-1 text-app-sm font-medium text-white focus-visible:outline-app"
                  style={{ background: COLOR[color].bg }}
                >
                  {COLOR[color].label}
                </button>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setChoosing(null)}>
                Annuler
              </Button>
            </div>
          ) : (
            state.hasDrawn &&
            interactive && (
              <div className="flex justify-center">
                <Button type="button" variant="outline" size="sm" onClick={() => sendMove({ action: "pass" })}>
                  Passer mon tour
                </Button>
              </div>
            )
          )}

          <p className="text-center text-app-xs text-app-text-muted">Votre main · {hand.length} carte{hand.length > 1 ? "s" : ""}</p>
          <ul className="flex flex-wrap justify-center gap-1.5">
            {hand.map((card, index) => {
              const playable = interactive && canPlayUno(card, state);
              return (
                <li key={`${index}-${card.color}-${card.value}`}>
                  <button
                    type="button"
                    onClick={() => playCard(index)}
                    disabled={!playable}
                    aria-label={`Poser ${unoCardName(card)}`}
                    className={cn(
                      "rounded-lg transition-transform focus-visible:outline-app",
                      playable ? "hover:-translate-y-2" : interactive ? "opacity-40" : "",
                      choosing === index && "-translate-y-2 ring-2 ring-app-accent",
                    )}
                  >
                    <CardFace card={card} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
