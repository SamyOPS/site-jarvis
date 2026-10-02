import { QUIZ_ROUNDS, type QuizQuestion, type QuizState } from "@/domain/games";
import { activePlayers } from "@/lib/multiplayer-turns";

/**
 * Quiz : tous les joueurs répondent EN MÊME TEMPS à chaque question. La question se
 * ferme quand tous ont répondu — ou quand le créateur la passe, si quelqu'un traîne —
 * et c'est alors seulement que la bonne réponse et les réponses de chacun sont révélées.
 *
 * Règles pures. La banque (et donc les bonnes réponses) reste côté serveur : ce fichier ne
 * manipule que ce que l'appelant lui fournit.
 */

export function startQuiz(count: number, first: { index: number; question: QuizQuestion }): QuizState {
  return {
    round: 0,
    total: QUIZ_ROUNDS,
    question: first.question,
    answered: [],
    asked: [first.index],
    scores: Array(count).fill(0),
    history: [],
    turn: 0,
    out: [],
  };
}

/** Enregistre que le joueur a répondu (la réponse elle-même reste secrète). */
export function markQuizAnswered(state: QuizState, player: number, choice: number): QuizState {
  if (state.out.includes(player)) throw new Error("Vous avez quitté la partie.");
  if (state.answered.includes(player)) throw new Error("Vous avez déjà répondu.");
  if (!Number.isInteger(choice) || choice < 0 || choice >= state.question.choices.length) {
    throw new Error("Réponse invalide.");
  }
  return { ...state, answered: [...state.answered, player] };
}

/** Tous les joueurs encore en jeu ont-ils répondu ? */
export function quizRoundComplete(state: QuizState) {
  return activePlayers(state, state.scores.length).every((player) => state.answered.includes(player));
}

export type QuizResolveOutcome = {
  state: QuizState;
  finished: boolean;
  /** Rang du gagnant ; null en cas d'égalité en tête. */
  winner: number | null;
};

/**
 * Ferme la question en cours : révèle la bonne réponse et celles des joueurs, compte les
 * points, puis passe à `next` — ou termine la partie après la dernière question.
 */
export function resolveQuizRound(
  state: QuizState,
  answers: (number | null)[],
  correct: number,
  next: { index: number; question: QuizQuestion } | null,
): QuizResolveOutcome {
  const scores = state.scores.map((score, player) => score + (answers[player] === correct ? 1 : 0));
  const history = [...state.history, { ...state.question, correct, answers }];
  const round = state.round + 1;

  if (round >= state.total || !next) {
    const contenders = activePlayers(state, scores.length);
    const best = Math.max(...contenders.map((player) => scores[player]));
    const leaders = contenders.filter((player) => scores[player] === best);
    return {
      state: { ...state, scores, history, round, answered: [] },
      finished: true,
      winner: leaders.length === 1 ? leaders[0] : null,
    };
  }

  return {
    state: {
      ...state,
      scores,
      history,
      round,
      question: next.question,
      answered: [],
      asked: [...state.asked, next.index],
    },
    finished: false,
    winner: null,
  };
}
