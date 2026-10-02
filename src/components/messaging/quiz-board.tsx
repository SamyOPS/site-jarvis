"use client";

import { Check, SkipForward, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { QuizSecret, QuizState } from "@/domain/games";
import { activePlayers } from "@/lib/multiplayer-turns";
import { PLAYER_COLORS, PlayerStrip, type MultiplayerBoardProps } from "@/components/messaging/multiplayer-common";

const LETTERS = ["A", "B", "C", "D"];

/**
 * Quiz : chacun répond de son côté. La bonne réponse et les réponses des autres ne
 * s'affichent qu'à la fermeture de la question — avant, le serveur ne les a pas rendues.
 */
export function QuizBoard({ game, interactive, pending, isCreator, nameOf, sendMove }: MultiplayerBoardProps) {
  const state = game.state as QuizState;
  const finished = game.status === "finished";
  const secret = game.private?.secret as QuizSecret | null | undefined;
  const myAnswer = secret?.answers[String(state.round)];
  const previous = state.history[state.history.length - 1] ?? null;
  const waitingFor = activePlayers(state, state.scores.length).filter((index) => !state.answered.includes(index));

  return (
    <div className="space-y-4">
      <PlayerStrip
        game={game}
        nameOf={nameOf}
        highlight={finished ? [] : state.answered}
        detail={(index) => `${state.scores[index]} pt${state.scores[index] > 1 ? "s" : ""}${!finished && state.answered.includes(index) ? " · ✓" : ""}`}
      />

      {/* Correction de la question précédente. */}
      {previous && (
        <div className="rounded-app-card border border-app-line p-3 text-app-xs">
          <p className="text-app-text-secondary">
            Question {state.history.length} : {previous.text}
          </p>
          <p className="mt-1 font-medium text-validated">
            Réponse : {LETTERS[previous.correct]}. {previous.choices[previous.correct]}
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
            {game.players.map((id, index) => {
              const answer = previous.answers[index];
              const right = answer === previous.correct;
              return (
                <li key={id} className={cn("flex items-center gap-1", right ? "text-validated" : "text-app-text-muted")}>
                  {right ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  {nameOf(id)} {answer === null || answer === undefined ? "(pas de réponse)" : LETTERS[answer]}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {finished ? (
        <p className="text-center text-app-sm text-app-text-secondary">
          Quiz terminé : {state.history.length} question{state.history.length > 1 ? "s" : ""}.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="text-center">
            <p className="text-app-2xs uppercase tracking-wider text-app-text-muted">
              {state.question.category} · {state.round + 1}/{state.total}
            </p>
            <p className="mt-1 text-app-lg font-medium text-app-text">{state.question.text}</p>
          </div>

          <ul className="grid gap-2 sm:grid-cols-2">
            {state.question.choices.map((choice, index) => {
              const chosen = myAnswer === index;
              return (
                <li key={index}>
                  <button
                    type="button"
                    disabled={!interactive || pending}
                    onClick={() => sendMove({ action: "answer", choice: index })}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-app-control border px-3 py-2.5 text-left text-app-sm transition-colors focus-visible:outline-app",
                      chosen ? "border-app-accent bg-app-accent-soft text-app-text" : "border-app-line text-app-text",
                      interactive && "hover:bg-app-surface-hover",
                      !interactive && !chosen && "opacity-60",
                    )}
                  >
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-app-xs font-bold text-white"
                      style={{ background: PLAYER_COLORS[index] }}
                    >
                      {LETTERS[index]}
                    </span>
                    {choice}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap items-center justify-center gap-3 text-app-xs text-app-text-muted">
            {myAnswer !== undefined && <span>Réponse envoyée.</span>}
            {waitingFor.length > 0 && (
              <span>En attente de {waitingFor.map((index) => nameOf(game.players[index])).join(", ")}.</span>
            )}
            {/* Quelqu'un ne répond pas : le créateur ferme la question sans lui. */}
            {isCreator && waitingFor.length > 0 && myAnswer !== undefined && (
              <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => sendMove({ action: "skip" })}>
                <SkipForward className="mr-2 h-4 w-4" />
                Passer la question
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
