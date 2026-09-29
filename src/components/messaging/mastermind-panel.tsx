"use client";

import { useState } from "react";
import { Delete, Shuffle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  MASTERMIND_COLORS,
  MASTERMIND_LENGTH,
  MASTERMIND_ROUNDS,
  otherSeat,
  type GameItem,
  type GameSeat,
  type MastermindGuess,
  type MastermindSecret,
  type MastermindState,
} from "@/domain/games";

/* Couleurs fixes, hors thème : ce sont les pions, elles doivent rester identiques partout. */
const PEGS = ["#dc2626", "#2563eb", "#16a34a", "#facc15", "#9333ea", "#f97316"];
const PEG_NAMES = ["rouge", "bleu", "vert", "jaune", "violet", "orange"];

type MastermindPanelProps = {
  game: GameItem;
  seat: GameSeat;
  opponentName: string;
  interactive: boolean;
  pending: boolean;
  onSetCode: (code: number[]) => void;
  onGuess: (code: number[]) => void;
};

function Peg({ color, size = "md" }: { color: number | null; size?: "sm" | "md" }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full",
        size === "md" ? "h-6 w-6" : "h-4 w-4",
        color === null ? "border-2 border-dashed border-app-line" : "shadow-[inset_0_-2px_0_rgba(0,0,0,0.25)]",
      )}
      style={color === null ? undefined : { backgroundColor: PEGS[color] }}
    />
  );
}

/** Réponse d'un essai : fiches noires (bien placés) puis blanches (mal placés). */
function Feedback({ guess }: { guess: MastermindGuess }) {
  const marks = [
    ...Array(guess.exact).fill("exact"),
    ...Array(guess.misplaced).fill("misplaced"),
    ...Array(MASTERMIND_LENGTH - guess.exact - guess.misplaced).fill("none"),
  ];
  return (
    <span
      className="grid grid-cols-2 gap-0.5"
      title={`${guess.exact} bien placé(s), ${guess.misplaced} mal placé(s)`}
    >
      {marks.map((mark, index) => (
        <span
          key={index}
          className={cn(
            "h-2 w-2 rounded-full",
            mark === "exact" && "bg-app-text",
            mark === "misplaced" && "border border-app-text-muted bg-white",
            mark === "none" && "bg-app-line",
          )}
        />
      ))}
    </span>
  );
}

/** Saisie d'un code : on clique les couleurs, elles remplissent les trous dans l'ordre. */
function CodeComposer({
  label,
  disabled,
  onSubmit,
  withRandom = false,
}: {
  label: string;
  disabled: boolean;
  onSubmit: (code: number[]) => void;
  withRandom?: boolean;
}) {
  const [code, setCode] = useState<(number | null)[]>(Array(MASTERMIND_LENGTH).fill(null));
  const complete = code.every((peg) => peg !== null);

  const add = (color: number) => {
    const slot = code.indexOf(null);
    if (slot === -1) return;
    setCode(code.map((peg, index) => (index === slot ? color : peg)));
  };

  return (
    <div className="space-y-2 rounded-app-control border border-app-line p-3">
      <div className="flex items-center justify-center gap-2">
        {code.map((peg, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setCode(code.map((value, i) => (i === index ? null : value)))}
            aria-label={peg === null ? `Trou ${index + 1}` : `Retirer le pion ${PEG_NAMES[peg]}`}
          >
            <Peg color={peg} />
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {PEGS.map((_, color) => (
          <button
            key={color}
            type="button"
            onClick={() => add(color)}
            disabled={complete}
            aria-label={`Ajouter ${PEG_NAMES[color]}`}
            className="rounded-full p-0.5 transition-transform hover:scale-110 disabled:opacity-40"
          >
            <Peg color={color} />
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        {withRandom && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setCode(Array.from({ length: MASTERMIND_LENGTH }, () => Math.floor(Math.random() * MASTERMIND_COLORS)))
            }
          >
            <Shuffle className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setCode(Array(MASTERMIND_LENGTH).fill(null))}
          aria-label="Effacer"
        >
          <Delete className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          className="flex-1"
          disabled={!complete || disabled}
          onClick={() => {
            onSubmit(code as number[]);
            setCode(Array(MASTERMIND_LENGTH).fill(null));
          }}
        >
          {label}
        </Button>
      </div>
    </div>
  );
}

function GuessBoard({ title, guesses, code }: { title: string; guesses: MastermindGuess[]; code?: number[] | null }) {
  return (
    <div>
      <p className="mb-1.5 text-app-xs font-medium text-app-text-secondary">{title}</p>
      {code && (
        <div className="mb-1.5 flex items-center gap-1.5 rounded-app-control bg-app-surface-hover px-2 py-1.5">
          <span className="text-app-2xs uppercase tracking-wider text-app-text-muted">Code</span>
          {code.map((peg, index) => (
            <Peg key={index} color={peg} size="sm" />
          ))}
        </div>
      )}
      <ol className="space-y-1">
        {Array.from({ length: MASTERMIND_ROUNDS }, (_, round) => {
          const guess = guesses[round];
          return (
            <li
              key={round}
              className={cn(
                "flex items-center gap-2 rounded-app-control px-2 py-1",
                guess?.exact === MASTERMIND_LENGTH ? "bg-emerald-500/15" : "bg-app-surface-hover/60",
              )}
            >
              <span className="w-4 text-right text-app-2xs text-app-text-muted">{round + 1}</span>
              <span className="flex gap-1">
                {Array.from({ length: MASTERMIND_LENGTH }, (_, index) => (
                  <Peg key={index} color={guess ? guess.code[index] : null} size="sm" />
                ))}
              </span>
              <span className="ml-auto">{guess && <Feedback guess={guess} />}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Mastermind en duel : chacun compose son code, puis cherche celui de l'autre.
 *
 * Deux tableaux côte à côte : ses propres essais, et ceux de l'adversaire sur son code —
 * on voit ainsi s'il se rapproche.
 */
export function MastermindPanel({
  game,
  seat,
  opponentName,
  interactive,
  pending,
  onSetCode,
  onGuess,
}: MastermindPanelProps) {
  const state = game.state as MastermindState;
  const myCode = (game.private?.secret as MastermindSecret | null | undefined)?.code ?? null;
  const theirCode = (game.private?.opponentSecret as MastermindSecret | null | undefined)?.code ?? null;
  const opponent = otherSeat(seat);

  if (game.status === "active" && state.phase === "setup" && !state.ready[seat]) {
    return (
      <div className="mx-auto max-w-sm space-y-2">
        <p className="text-center text-app-sm text-app-text-secondary">
          Composez un code de {MASTERMIND_LENGTH} pions. Les répétitions sont permises.
        </p>
        <CodeComposer label="Valider mon code" disabled={pending} onSubmit={onSetCode} withRandom />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {state.phase === "setup" && game.status === "active" && (
        <p className="rounded-app-control bg-app-surface-hover px-3 py-2 text-app-sm text-app-text-secondary">
          Code validé. {opponentName} compose encore le sien…
        </p>
      )}
      {interactive && state.phase === "play" && (
        <CodeComposer label="Proposer" disabled={pending} onSubmit={onGuess} />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <GuessBoard title={`Vos essais sur le code de ${opponentName}`} guesses={state.guesses[seat]} code={theirCode} />
        <GuessBoard title={`Essais de ${opponentName} sur votre code`} guesses={state.guesses[opponent]} code={myCode} />
      </div>
    </div>
  );
}
