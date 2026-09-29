import { ApiError } from "@/lib/api-handler";
import {
  BATTLESHIP_SIZE,
  otherSeat,
  type BattleshipSecret,
  type BattleshipState,
  type CheckersState,
  type ChessState,
  type GameResult,
  type GameSeat,
  type GameState,
  type GameType,
  type GridState,
  type GuessWhoSecret,
  type GuessWhoState,
  type MastermindSecret,
  type MastermindState,
} from "@/domain/games";
import { applyChessMove, initialChessState, replayChess } from "@/lib/chess-game";
import { applyShot, initialBattleshipState, isValidFleet, markReady } from "@/lib/battleship-game";
import {
  initialConnectFourState,
  initialTicTacToeState,
  playConnectFour,
  playTicTacToe,
} from "@/lib/grid-games";
import { initialCheckersState, playCheckers } from "@/lib/checkers-game";
import {
  askQuestion,
  drawGuessWhoCharacters,
  guessCharacter,
  initialGuessWhoState,
} from "@/lib/guess-who-game";
import {
  initialMastermindState,
  isValidCode,
  markCodeReady,
  playMastermindGuess,
} from "@/lib/mastermind-game";

/**
 * Moteurs de jeu, côté serveur.
 *
 * Un moteur par type : son état initial, et la façon de jouer un coup. C'est ici, et
 * seulement ici, qu'un coup est jugé — la route se contente de charger la partie, de
 * vérifier que l'appelant y joue, puis d'écrire ce que le moteur rend.
 *
 * Les jeux à information cachée (bataille navale, Qui est-ce ?, Mastermind) lisent et
 * écrivent leurs secrets par le contexte, qui les range dans `game_secrets` : jamais dans
 * `games.state`, lisible par les deux joueurs.
 */

export type EngineContext = {
  state: GameState;
  seat: GameSeat;
  payload: Record<string, unknown> | null;
  loadSecret: <T>(seat: GameSeat) => Promise<T | null>;
  saveSecret: (seat: GameSeat, data: unknown) => Promise<void>;
};

export type EngineResult = {
  state: GameState;
  finished?: boolean;
  result?: GameResult | null;
  reason?: string | null;
};

export type GameEngine = {
  initial: () => GameState;
  /** Vrai si le jeu garde des données cachées, à renvoyer à chacun avec la partie. */
  hasSecrets?: boolean;
  /** Appelé quand le second joueur rejoint : distribution des secrets tirés au sort. */
  onStart?: (ctx: Pick<EngineContext, "saveSecret">) => Promise<void>;
  play: (ctx: EngineContext) => Promise<EngineResult>;
};

/** Traduit l'erreur d'une fonction de règles en 400, avec son message. */
function rule<T>(apply: () => T): T {
  try {
    return apply();
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : "Coup illégal.", 400);
  }
}

function assertTurn(turn: GameSeat, seat: GameSeat) {
  if (turn !== seat) throw new ApiError("Ce n'est pas votre tour.", 409);
}

function finish(state: GameState, result: GameSeat | "draw" | null, reason: string | null): EngineResult {
  return { state, finished: true, result, reason };
}

const SQUARE = /^[a-h][1-8]$/;
const PROMOTIONS = new Set(["q", "r", "b", "n"]);

const chess: GameEngine = {
  initial: initialChessState,
  async play({ state, seat, payload }) {
    const from = typeof payload?.from === "string" ? payload.from : "";
    const to = typeof payload?.to === "string" ? payload.to : "";
    const promotion = typeof payload?.promotion === "string" ? payload.promotion : undefined;
    if (!SQUARE.test(from) || !SQUARE.test(to) || (promotion && !PROMOTIONS.has(promotion))) {
      throw new ApiError("Coup invalide.", 400);
    }
    const current = state as ChessState;
    assertTurn(replayChess(current).turn() === "w" ? "player_one" : "player_two", seat);

    const outcome = rule(() => applyChessMove(current, { from, to, promotion }));
    return outcome.finished
      ? finish(outcome.state, outcome.result, outcome.resultReason)
      : { state: outcome.state };
  },
};

const battleship: GameEngine = {
  initial: initialBattleshipState,
  hasSecrets: true,
  async play({ state, seat, payload, loadSecret, saveSecret }) {
    const current = state as BattleshipState;

    if (payload?.action === "place") {
      if (current.phase !== "placement") throw new ApiError("Le placement est terminé.", 409);
      if (current.ready[seat]) throw new ApiError("Votre flotte est déjà validée.", 409);
      if (!isValidFleet(payload.ships)) throw new ApiError("Placement de la flotte invalide.", 400);
      // Le secret est écrit AVANT l'état public : un joueur ne peut pas être marqué prêt
      // sans flotte enregistrée.
      await saveSecret(seat, { ships: payload.ships } satisfies BattleshipSecret);
      return { state: markReady(current, seat) };
    }

    if (payload?.action === "fire") {
      if (current.phase !== "battle") throw new ApiError("La bataille n'a pas commencé.", 409);
      assertTurn(current.turn, seat);
      const cell = payload.cell;
      if (typeof cell !== "number" || !Number.isInteger(cell) || cell < 0 || cell >= BATTLESHIP_SIZE ** 2) {
        throw new ApiError("Case invalide.", 400);
      }
      const target = await loadSecret<BattleshipSecret>(otherSeat(seat));
      if (!target) throw new ApiError("Flotte adverse introuvable.", 409);

      const outcome = rule(() => applyShot(current, seat, cell, target.ships));
      return outcome.finished ? finish(outcome.state, outcome.winner, "fleet_sunk") : { state: outcome.state };
    }

    throw new ApiError("Action inconnue.", 400);
  },
};

function gridEngine(initial: () => GridState, apply: typeof playTicTacToe, field: "cell" | "column"): GameEngine {
  return {
    initial,
    async play({ state, seat, payload }) {
      const current = state as GridState;
      assertTurn(current.turn, seat);
      const value = payload?.[field];
      if (typeof value !== "number") throw new ApiError("Coup invalide.", 400);
      const outcome = rule(() => apply(current, seat, value));
      return outcome.finished ? finish(outcome.state, outcome.result, outcome.reason) : { state: outcome.state };
    },
  };
}

const checkers: GameEngine = {
  initial: initialCheckersState,
  async play({ state, seat, payload }) {
    const current = state as CheckersState;
    assertTurn(current.turn, seat);
    const path = payload?.path;
    if (!Array.isArray(path) || path.length < 2 || !path.every((cell) => Number.isInteger(cell))) {
      throw new ApiError("Coup invalide.", 400);
    }
    const outcome = rule(() => playCheckers(current, seat, path as number[]));
    return outcome.finished ? finish(outcome.state, outcome.result, outcome.reason) : { state: outcome.state };
  },
};

const guessWho: GameEngine = {
  initial: initialGuessWhoState,
  hasSecrets: true,
  async onStart({ saveSecret }) {
    const [one, two] = drawGuessWhoCharacters();
    await saveSecret("player_one", { characterId: one } satisfies GuessWhoSecret);
    await saveSecret("player_two", { characterId: two } satisfies GuessWhoSecret);
  },
  async play({ state, seat, payload, loadSecret }) {
    const current = state as GuessWhoState;
    assertTurn(current.turn, seat);
    const target = await loadSecret<GuessWhoSecret>(otherSeat(seat));
    if (!target) throw new ApiError("Personnage adverse introuvable.", 409);

    if (payload?.action === "ask" && typeof payload.questionId === "string") {
      const questionId = payload.questionId;
      return { state: rule(() => askQuestion(current, seat, questionId, target.characterId)) };
    }
    if (payload?.action === "guess" && typeof payload.characterId === "string") {
      const characterId = payload.characterId;
      const outcome = rule(() => guessCharacter(current, seat, characterId, target.characterId));
      return finish(outcome.state, outcome.winner, outcome.reason);
    }
    throw new ApiError("Action inconnue.", 400);
  },
};

const mastermind: GameEngine = {
  initial: initialMastermindState,
  hasSecrets: true,
  async play({ state, seat, payload, loadSecret, saveSecret }) {
    const current = state as MastermindState;

    if (payload?.action === "set") {
      if (current.phase !== "setup") throw new ApiError("Les codes sont déjà composés.", 409);
      if (current.ready[seat]) throw new ApiError("Votre code est déjà validé.", 409);
      if (!isValidCode(payload.code)) throw new ApiError("Code invalide.", 400);
      await saveSecret(seat, { code: payload.code } satisfies MastermindSecret);
      return { state: markCodeReady(current, seat) };
    }

    if (payload?.action === "guess") {
      if (current.phase !== "play") throw new ApiError("Les codes ne sont pas encore composés.", 409);
      assertTurn(current.turn, seat);
      if (!isValidCode(payload.code)) throw new ApiError("Proposition invalide.", 400);
      const target = await loadSecret<MastermindSecret>(otherSeat(seat));
      if (!target) throw new ApiError("Code adverse introuvable.", 409);
      const outcome = playMastermindGuess(current, seat, payload.code, target.code);
      return outcome.finished ? finish(outcome.state, outcome.result, outcome.reason) : { state: outcome.state };
    }

    throw new ApiError("Action inconnue.", 400);
  },
};

export const GAME_ENGINES: Record<GameType, GameEngine> = {
  chess,
  battleship,
  connect_four: gridEngine(initialConnectFourState, playConnectFour, "column"),
  tic_tac_toe: gridEngine(initialTicTacToeState, playTicTacToe, "cell"),
  checkers,
  guess_who: guessWho,
  mastermind,
};
