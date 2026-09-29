import {
  MASTERMIND_COLORS,
  MASTERMIND_LENGTH,
  MASTERMIND_ROUNDS,
  otherSeat,
  type GameSeat,
  type MastermindState,
} from "@/domain/games";

/**
 * Mastermind en duel : chacun compose un code secret de 4 pions parmi 6 couleurs
 * (répétitions permises), puis les deux joueurs cherchent le code de l'autre en
 * alternance, 10 essais chacun.
 *
 * ÉQUITÉ : le premier joueur propose toujours avant le second. S'il perce le code au
 * tour N, le second a encore droit à sa proposition du tour N ; s'il perce aussi, c'est
 * nulle. Sans cette règle, commencer donnerait un avantage d'un demi-tour.
 */

export function initialMastermindState(): MastermindState {
  return {
    phase: "setup",
    ready: { player_one: false, player_two: false },
    guesses: { player_one: [], player_two: [] },
    turn: "player_one",
  };
}

export function isValidCode(code: unknown): code is number[] {
  return (
    Array.isArray(code) &&
    code.length === MASTERMIND_LENGTH &&
    code.every((peg) => Number.isInteger(peg) && peg >= 0 && peg < MASTERMIND_COLORS)
  );
}

/** Réponse à une proposition : pions bien placés, puis bonnes couleurs mal placées. */
export function scoreGuess(secret: number[], guess: number[]) {
  let exact = 0;
  const secretLeft: number[] = [];
  const guessLeft: number[] = [];
  secret.forEach((peg, index) => {
    if (guess[index] === peg) exact += 1;
    else {
      secretLeft.push(peg);
      guessLeft.push(guess[index]);
    }
  });
  let misplaced = 0;
  for (const peg of guessLeft) {
    const found = secretLeft.indexOf(peg);
    if (found !== -1) {
      misplaced += 1;
      secretLeft.splice(found, 1);
    }
  }
  return { exact, misplaced };
}

export function markCodeReady(state: MastermindState, seat: GameSeat): MastermindState {
  const ready = { ...state.ready, [seat]: true };
  return { ...state, ready, phase: ready.player_one && ready.player_two ? "play" : "setup" };
}

const solved = (state: MastermindState, seat: GameSeat) =>
  state.guesses[seat].some((guess) => guess.exact === MASTERMIND_LENGTH);

export function playMastermindGuess(
  state: MastermindState,
  seat: GameSeat,
  guess: number[],
  opponentCode: number[],
) {
  const score = scoreGuess(opponentCode, guess);
  const next: MastermindState = {
    ...state,
    guesses: { ...state.guesses, [seat]: [...state.guesses[seat], { code: guess, ...score }] },
    turn: otherSeat(seat),
  };

  // Le tour ne se juge qu'une fois que le second joueur a proposé.
  if (seat === "player_one") return { state: next, finished: false, result: null, reason: null };

  const one = solved(next, "player_one");
  const two = solved(next, "player_two");
  if (one && two) return { state: next, finished: true, result: "draw" as const, reason: "code_broken" };
  if (one || two) {
    return {
      state: next,
      finished: true,
      result: (one ? "player_one" : "player_two") as GameSeat,
      reason: "code_broken",
    };
  }
  if (next.guesses.player_two.length >= MASTERMIND_ROUNDS) {
    return { state: next, finished: true, result: "draw" as const, reason: "rounds_exhausted" };
  }
  return { state: next, finished: false, result: null, reason: null };
}
