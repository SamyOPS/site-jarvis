"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeftRight, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { GameItem, UnoCard, UnoColor, UnoEvent, UnoSecret, UnoState } from "@/domain/games";
import { UNO_COLORS, canPlayUno, isWild, playUno } from "@/lib/uno-game";
import { PLAYER_COLORS, type MultiplayerBoardProps } from "@/components/messaging/multiplayer-common";

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

/** Dos de carte, pour les mains adverses. */
function CardBack({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-12 w-8 items-center justify-center rounded-md border-2 border-white bg-[#111827] text-[0.5rem] font-black text-[#facc15] shadow",
        className,
      )}
    >
      UNO
    </span>
  );
}

/**
 * Mains des adversaires, face cachée : on voit d'un coup d'œil qui est près de gagner.
 * Au-delà de dix cartes, l'éventail s'arrête et le nombre suffit.
 */
function OpponentHands({
  game,
  player,
  nameOf,
}: {
  game: GameItem;
  player: number;
  nameOf: (profileId: string) => string;
}) {
  const state = game.state as UnoState;
  const opponents = game.players.map((id, index) => ({ id, index })).filter(({ index }) => index !== player);

  return (
    <ul className="flex flex-wrap justify-center gap-3">
      {opponents.map(({ id, index }) => {
        const count = state.handCounts[index] ?? 0;
        const out = state.out.includes(index);
        const turn = game.status === "active" && state.turn === index;
        return (
          <li
            key={id}
            className={cn(
              "flex min-w-[7rem] flex-col items-center gap-1.5 rounded-app-card border px-3 py-2",
              turn ? "border-app-accent bg-app-accent-soft" : "border-app-line",
              out && "opacity-50",
            )}
          >
            <span className="flex items-center gap-1.5 text-app-xs font-medium text-app-text">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: PLAYER_COLORS[index] }} />
              {nameOf(id)}
              {out && <span className="text-app-text-muted">(parti)</span>}
            </span>
            <span className="flex h-12 items-center pl-4" aria-hidden>
              {/* Une carte gagnée arrive d'en haut ; une carte posée s'envole vers la pile. */}
              <AnimatePresence initial={false}>
                {Array.from({ length: Math.min(count, 10) }, (_, card) => (
                  <motion.span
                    key={card}
                    className="-ml-4"
                    initial={{ y: -24, opacity: 0, scale: 0.6 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 36, opacity: 0, scale: 0.6, rotate: 12 }}
                    transition={{ type: "spring", stiffness: 420, damping: 28 }}
                  >
                    <CardBack />
                  </motion.span>
                ))}
              </AnimatePresence>
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-app-xs font-semibold",
                count === 1 ? "bg-[#dc2626] text-white" : "bg-app-surface-hover text-app-text",
              )}
            >
              {count} carte{count > 1 ? "s" : ""}
              {count === 1 ? " · UNO !" : ""}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Phrase d'un coup, pour l'historique. */
function describeEvent(event: UnoEvent, game: GameItem, nameOf: (profileId: string) => string) {
  const who = nameOf(game.players[event.by]);
  if (event.kind === "play" && event.card) {
    const penalty = event.penalty ? ` : ${nameOf(game.players[event.penalty.to])} pioche ${event.penalty.count}` : "";
    return `${who} pose ${unoCardName(event.card)}${penalty}`;
  }
  if (event.kind === "draw") return event.auto ? `${who} n'a rien à jouer et pioche` : `${who} pioche`;
  return event.auto ? `${who} passe (carte piochée injouable)` : `${who} passe`;
}

/**
 * Clés stables des cartes d'une main. La main n'a pas d'identifiants : on numérote les
 * exemplaires identiques (« le 2e 7 rouge »). Poser une carte ne renumérote donc pas les
 * autres, et seule la carte posée joue son animation de départ.
 */
function handKeys(hand: UnoCard[]) {
  const seen = new Map<string, number>();
  return hand.map((card) => {
    const base = `${card.color ?? "wild"}-${card.value}`;
    const nth = (seen.get(base) ?? 0) + 1;
    seen.set(base, nth);
    return `${base}-${nth}`;
  });
}

/** Table d'UNO : mains adverses, pile, pioche, et la main de l'utilisateur. */
export function UnoBoard({ game, player, interactive, nameOf, sendMove }: MultiplayerBoardProps) {
  const state = game.state as UnoState;
  const hand = (game.private?.secret as UnoSecret | null | undefined)?.hand ?? [];
  // Joker choisi, en attente de sa couleur.
  const [choosing, setChoosing] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();

  /*
    Carte posée tout de suite, sans attendre le serveur : la main et la pile bougent au
    clic. Les cartes de pénalité (+2, +4) sont tirées au hasard côté serveur, et la
    réponse remplace cette version locale.
  */
  const play = (index: number, color?: UnoColor) =>
    sendMove({ action: "play", card: index, ...(color ? { color } : {}) }, (current: GameItem) => {
      const mine = (current.private?.secret as UnoSecret | null | undefined)?.hand;
      if (!mine) return null;
      try {
        const outcome = playUno(current.state as UnoState, player, mine, index, color ?? null, () => 0);
        return {
          ...current,
          state: outcome.state,
          private: { ...current.private!, secret: { hand: outcome.hand } satisfies UnoSecret },
        };
      } catch {
        return null;
      }
    });

  const playCard = (index: number) => {
    const card = hand[index];
    if (!card || !interactive || !canPlayUno(card, state)) return;
    if (isWild(card)) {
      setChoosing(index);
      return;
    }
    play(index);
  };

  const last = state.lastEvent;
  // Identité du dernier coup : change à chaque coup, même deux fois la même carte.
  const eventKey = `${JSON.stringify(last)}|${state.handCounts.join(",")}`;
  const keys = handKeys(hand);
  // Parties d'avant l'historique : on retombe sur le seul dernier coup.
  const recent = state.recent ?? (last ? [last] : []);

  return (
    <div className="space-y-4">
      <OpponentHands game={game} player={player} nameOf={nameOf} />

      <div className="flex items-center justify-center gap-6">
        {/* Pioche : infinie, d'où son dos toujours présent. */}
        <div className="relative">
          <button
            type="button"
            onClick={() => sendMove({ action: "draw" })}
            disabled={!interactive || state.hasDrawn}
            aria-label="Piocher une carte"
            className="relative flex h-28 w-20 items-center justify-center rounded-lg border-2 border-white bg-[#111827] text-app-sm font-bold text-[#facc15] shadow-md transition-transform enabled:hover:-translate-y-1 disabled:opacity-60"
          >
            UNO
          </button>
          {/*
            Carte qui quitte la pioche à chaque pioche (manuelle, automatique ou pénalité) :
            vers le bas pour soi, vers le haut pour un adversaire.
          */}
          {!reduceMotion && last && (last.kind === "draw" || last.penalty) && (
            <motion.span
              key={eventKey}
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-lg border-2 border-white bg-[#111827]"
              initial={{ opacity: 1, y: 0, rotate: 0 }}
              animate={{
                opacity: 0,
                y: (last.penalty ? last.penalty.to : last.by) === player ? 140 : -140,
                rotate: (last.penalty ? last.penalty.to : last.by) === player ? 8 : -8,
              }}
              transition={{ duration: 0.55, ease: "easeOut" }}
            />
          )}
        </div>

        <div className="flex flex-col items-center gap-2">
          {/* Carte posée : arrive de sa main (en bas pour soi, en haut pour un adversaire). */}
          <motion.div
            key={last?.kind === "play" ? eventKey : "pile"}
            initial={
              reduceMotion || last?.kind !== "play"
                ? false
                : { y: last.by === player ? 160 : -160, rotate: last.by === player ? -25 : 25, scale: 0.8, opacity: 0.4 }
            }
            animate={{ y: 0, rotate: 0, scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
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

      {recent.length > 0 && (
        <ol aria-label="Derniers coups" className="mx-auto max-w-sm space-y-0.5 text-center text-app-xs text-app-text-muted">
          {recent.slice(-4).map((event, index, shown) => (
            <li key={index} className={cn(index === shown.length - 1 && "font-medium text-app-text-secondary")}>
              {describeEvent(event, game, nameOf)}
            </li>
          ))}
        </ol>
      )}

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
                    play(choosing, color);
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
          <ul className="relative flex flex-wrap justify-center gap-1.5">
            {/*
              Carte piochée : glisse depuis la pioche. Carte posée : s'envole vers la pile.
              `layout` resserre la main sans à-coup.
            */}
            <AnimatePresence initial={false} mode="popLayout">
            {hand.map((card, index) => {
              const playable = interactive && canPlayUno(card, state);
              return (
                <motion.li
                  key={keys[index]}
                  layout={!reduceMotion}
                  initial={reduceMotion ? false : { y: -140, x: -60, opacity: 0, rotate: -15, scale: 0.7 }}
                  animate={{ y: 0, x: 0, opacity: 1, rotate: 0, scale: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { y: -160, opacity: 0, rotate: 20, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                >
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
                </motion.li>
              );
            })}
            </AnimatePresence>
          </ul>
        </div>
      )}
    </div>
  );
}
