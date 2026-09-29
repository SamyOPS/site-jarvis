"use client";

import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GuessWhoFace } from "@/components/messaging/guess-who-face";
import {
  GUESS_WHO_CHARACTERS,
  GUESS_WHO_QUESTIONS,
  guessWhoCharacter,
  guessWhoQuestion,
  remainingCandidates,
} from "@/lib/guess-who-game";
import type { GameItem, GameSeat, GuessWhoSecret, GuessWhoState } from "@/domain/games";

type GuessWhoPanelProps = {
  game: GameItem;
  seat: GameSeat;
  opponentName: string;
  interactive: boolean;
  onAsk: (questionId: string) => void;
  onGuess: (characterId: string) => void;
};

/**
 * Planche de Qui est-ce ?
 *
 * Les personnages écartés se retournent d'eux-mêmes : les réponses viennent du serveur,
 * elles sont exactes, il n'y a donc rien à retourner à la main. Désigner un personnage
 * se confirme — une erreur fait perdre la partie.
 */
export function GuessWhoPanel({ game, seat, opponentName, interactive, onAsk, onGuess }: GuessWhoPanelProps) {
  const state = game.state as GuessWhoState;
  const mine = (game.private?.secret as GuessWhoSecret | null | undefined)?.characterId;
  const theirs = (game.private?.opponentSecret as GuessWhoSecret | null | undefined)?.characterId;
  const myCharacter = mine ? guessWhoCharacter(mine) : null;

  const [questionId, setQuestionId] = useState("");
  const [target, setTarget] = useState<string | null>(null);

  const remaining = useMemo(
    () => new Set(remainingCandidates(state.questions, seat).map((character) => character.id)),
    [seat, state.questions],
  );
  const asked = new Set(state.questions.filter((q) => q.by === seat).map((q) => q.questionId));
  const available = GUESS_WHO_QUESTIONS.filter((question) => !asked.has(question.id));
  const history = [...state.questions].reverse();

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_16rem]">
      <div className="mx-auto w-full max-w-[calc((100dvh-17rem)*1.45)]">
        <p className="mb-1.5 text-app-xs font-medium text-app-text-secondary">
          Personnage de {opponentName} · {remaining.size} possibilité{remaining.size > 1 ? "s" : ""}
        </p>
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
          {GUESS_WHO_CHARACTERS.map((character) => {
            const out = !remaining.has(character.id);
            const isAnswer = theirs === character.id;
            return (
              <button
                key={character.id}
                type="button"
                disabled={!interactive || out}
                onClick={() => setTarget(target === character.id ? null : character.id)}
                className={cn(
                  "group overflow-hidden rounded-app-control border text-left transition-all",
                  target === character.id ? "border-app-accent ring-2 ring-app-accent" : "border-app-line",
                  out && "opacity-25 grayscale",
                  isAnswer && "ring-2 ring-emerald-500",
                  interactive && !out && "hover:-translate-y-0.5 hover:shadow-app-raised",
                )}
              >
                <span className="block aspect-square">
                  <GuessWhoFace character={character} />
                </span>
                <span className="block truncate bg-app-surface px-1 py-0.5 text-center text-[0.65rem] text-app-text">
                  {character.name}
                </span>
              </button>
            );
          })}
        </div>

        {target && interactive && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-app-control border border-app-line bg-app-surface-hover px-3 py-2">
            <p className="text-app-sm text-app-text">
              Désigner <strong>{guessWhoCharacter(target)?.name}</strong> ? Une erreur fait perdre la partie.
            </p>
            <div className="flex gap-1.5">
              <Button type="button" variant="outline" size="sm" onClick={() => setTarget(null)}>
                Annuler
              </Button>
              <Button type="button" size="sm" onClick={() => onGuess(target)}>
                Confirmer
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {myCharacter && (
          <div className="flex items-center gap-2 rounded-app-control border border-app-line p-2">
            <span className="h-12 w-12 shrink-0 overflow-hidden rounded-app-control">
              <GuessWhoFace character={myCharacter} />
            </span>
            <span className="min-w-0 text-app-xs text-app-text-secondary">
              Votre personnage
              <span className="block text-app-sm font-medium text-app-text">{myCharacter.name}</span>
            </span>
          </div>
        )}

        {interactive && (
          <div className="space-y-1.5">
            <select
              value={questionId}
              onChange={(event) => setQuestionId(event.target.value)}
              aria-label="Question"
              className="h-9 w-full rounded-app-control border border-app-line bg-app-field px-2 text-app-sm text-app-text"
            >
              <option value="">Choisir une question…</option>
              {available.map((question) => (
                <option key={question.id} value={question.id}>
                  {question.label}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={!questionId}
              onClick={() => {
                onAsk(questionId);
                setQuestionId("");
              }}
            >
              Poser la question
            </Button>
          </div>
        )}

        <div>
          <p className="mb-1 text-app-xs font-medium text-app-text-secondary">Questions posées</p>
          {history.length === 0 ? (
            <p className="text-app-xs text-app-text-muted">Aucune pour l&apos;instant.</p>
          ) : (
            <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
              {history.map((entry) => (
                <li
                  key={`${entry.by}-${entry.questionId}`}
                  className="flex items-start gap-1.5 text-app-xs text-app-text-secondary"
                >
                  {entry.answer ? (
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  ) : (
                    <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                  )}
                  <span>
                    <span className="font-medium text-app-text">{entry.by === seat ? "Vous" : opponentName}</span> ·{" "}
                    {guessWhoQuestion(entry.questionId)?.label}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
