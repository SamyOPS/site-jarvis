import { createHmac, randomInt } from "node:crypto";

import { ApiError } from "@/lib/api-handler";
import type {
  GameState,
  LudoState,
  MultiplayerGameType,
  MultiplayerTurnState,
  QuizQuestion,
  QuizSecret,
  QuizState,
  TicTacToe3State,
  UnoColor,
  UnoSecret,
  UnoState,
} from "@/domain/games";
import { forfeitPlayer, nextPlayer } from "@/lib/multiplayer-turns";
import { initialTicTacToe3State, playTicTacToe3 } from "@/lib/tic-tac-toe-3-game";
import { UNO_COLORS, autoDrawUno, drawUno, passUno, playUno, startUno } from "@/lib/uno-game";
import { moveLudo, rollLudo, startLudo } from "@/lib/ludo-game";
import { markQuizAnswered, quizRoundComplete, resolveQuizRound, startQuiz } from "@/lib/quiz-game";
import { QUIZ_BANK } from "@/lib/quiz-bank";

/**
 * Moteurs des jeux à plusieurs, côté serveur. Même rôle que src/lib/game-engines.ts pour
 * les jeux à deux : SEUL juge des coups. Les joueurs sont désignés par leur rang dans
 * `games.players`.
 *
 * Le hasard (pioche, dé, questions) est tiré ICI, avec `crypto.randomInt` : jamais par le
 * client, qui pourrait choisir son dé.
 */

export type MultiplayerContext = {
  gameId: string;
  state: GameState;
  player: number;
  count: number;
  /** L'appelant a créé la partie : il peut passer une question qui traîne. */
  isCreator: boolean;
  payload: Record<string, unknown> | null;
  loadSecret: <T>(player: number) => Promise<T | null>;
  saveSecret: (player: number, data: unknown) => Promise<void>;
};

export type MultiplayerResult = {
  state: GameState;
  finished?: boolean;
  /** Rang du gagnant ; null avec `finished` : égalité. */
  winner?: number | null;
  reason?: string | null;
};

export type MultiplayerEngine = {
  hasSecrets?: boolean;
  /** Lance la partie une fois les joueurs réunis : état initial, secrets distribués. */
  start: (ctx: Pick<MultiplayerContext, "gameId" | "count" | "loadSecret" | "saveSecret">) => Promise<GameState>;
  play: (ctx: MultiplayerContext) => Promise<MultiplayerResult>;
  /** Abandon d'un joueur. Par défaut : il sort du tour. */
  forfeit?: (ctx: MultiplayerContext) => Promise<MultiplayerResult>;
};

const rand = (max: number) => randomInt(max);

/** Traduit l'erreur d'une fonction de règles en 400, avec son message. */
function rule<T>(apply: () => T): T {
  try {
    return apply();
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : "Coup illégal.", 400);
  }
}

/** Abandon générique : le joueur sort, et le dernier restant gagne. */
function defaultForfeit({ state, player, count }: MultiplayerContext): MultiplayerResult {
  const outcome = forfeitPlayer(state as MultiplayerTurnState & GameState, player, count);
  return outcome.lastStanding !== null
    ? { state: outcome.state, finished: true, winner: outcome.lastStanding, reason: "last_standing" }
    : { state: outcome.state };
}

// ---------------------------------------------------------------------------

const ticTacToe3: MultiplayerEngine = {
  async start() {
    return initialTicTacToe3State();
  },
  async play({ state, player, payload }) {
    const cell = payload?.cell;
    if (typeof cell !== "number") throw new ApiError("Coup invalide.", 400);
    const outcome = rule(() => playTicTacToe3(state as TicTacToe3State, player, cell));
    return outcome.finished
      ? { state: outcome.state, finished: true, winner: outcome.winner, reason: outcome.reason }
      : { state: outcome.state };
  },
};

// ---------------------------------------------------------------------------

/**
 * Fait piocher, puis passer s'il le faut, chaque joueur qui reçoit la main sans carte
 * jouable — en chaîne : celui qui suit peut être dans le même cas. Borné à un tour de
 * table complet (deux par joueur) : si personne ne peut jouer, la main reste au dernier,
 * qui piochera lui-même.
 */
async function settleUnoTurn(
  state: UnoState,
  ctx: Pick<MultiplayerContext, "count" | "loadSecret" | "saveSecret">,
): Promise<UnoState> {
  let current = state;
  for (let guard = 0; guard < ctx.count * 2; guard += 1) {
    const player = current.turn;
    const hand = (await ctx.loadSecret<UnoSecret>(player))?.hand;
    if (!hand) return current;
    const step = autoDrawUno(current, hand, rand);
    if (!step) return current;
    await ctx.saveSecret(player, { hand: step.hand } satisfies UnoSecret);
    current = step.state;
    // La carte piochée se joue : le joueur garde la main pour la poser.
    if (current.hasDrawn) return current;
  }
  return current;
}

const uno: MultiplayerEngine = {
  hasSecrets: true,
  async start(ctx) {
    const { state, hands } = startUno(ctx.count, rand);
    for (const [player, hand] of hands.entries()) {
      await ctx.saveSecret(player, { hand } satisfies UnoSecret);
    }
    // Le premier joueur peut déjà n'avoir rien à poser.
    return settleUnoTurn(state, ctx);
  },
  async play({ state, player, count, payload, loadSecret, saveSecret }) {
    const current = state as UnoState;
    const hand = (await loadSecret<UnoSecret>(player))?.hand;
    if (!hand) throw new ApiError("Main introuvable.", 409);

    if (payload?.action === "play") {
      const cardIndex = payload.card;
      const color = typeof payload.color === "string" ? (payload.color as UnoColor) : null;
      if (typeof cardIndex !== "number") throw new ApiError("Carte invalide.", 400);
      if (color && !UNO_COLORS.includes(color)) throw new ApiError("Couleur invalide.", 400);

      const outcome = rule(() => playUno(current, player, hand, cardIndex, color, rand));
      await saveSecret(player, { hand: outcome.hand } satisfies UnoSecret);
      if (outcome.penalty) {
        const target = (await loadSecret<UnoSecret>(outcome.penalty.to))?.hand ?? [];
        await saveSecret(outcome.penalty.to, { hand: [...target, ...outcome.penalty.cards] } satisfies UnoSecret);
      }
      return outcome.finished
        ? { state: outcome.state, finished: true, winner: player, reason: "empty_hand" }
        : { state: await settleUnoTurn(outcome.state, { count, loadSecret, saveSecret }) };
    }

    if (payload?.action === "draw") {
      const outcome = rule(() => drawUno(current, player, hand, rand));
      await saveSecret(player, { hand: outcome.hand } satisfies UnoSecret);
      return { state: outcome.state };
    }

    if (payload?.action === "pass") {
      return { state: await settleUnoTurn(rule(() => passUno(current, player)), { count, loadSecret, saveSecret }) };
    }

    throw new ApiError("Action inconnue.", 400);
  },
  // Le tour passe dans le SENS du jeu, qui a pu être inversé.
  async forfeit(ctx) {
    const result = defaultForfeit(ctx);
    const current = ctx.state as UnoState;
    if (result.finished || current.turn !== ctx.player) return result;
    const next = result.state as UnoState;
    return {
      state: await settleUnoTurn(
        { ...next, hasDrawn: false, turn: nextPlayer(ctx.player, ctx.count, next.out, current.direction) },
        ctx,
      ),
    };
  },
};

// ---------------------------------------------------------------------------

const ludo: MultiplayerEngine = {
  async start({ count }) {
    return startLudo(count);
  },
  async play({ state, player, payload }) {
    const current = state as LudoState;
    if (payload?.action === "roll") {
      // Dé tiré par le serveur : de 1 à 6.
      return { state: rule(() => rollLudo(current, player, randomInt(1, 7))) };
    }
    if (payload?.action === "move" && typeof payload.pawn === "number") {
      const pawn = payload.pawn;
      const outcome = rule(() => moveLudo(current, player, pawn));
      return outcome.finished
        ? { state: outcome.state, finished: true, winner: player, reason: "all_home" }
        : { state: outcome.state };
    }
    throw new ApiError("Action inconnue.", 400);
  },
};

// ---------------------------------------------------------------------------

/**
 * Question n° `bankIndex` telle que posée dans CETTE partie : choix mélangés. Le mélange
 * est dérivé d'un HMAC (partie, question) sous une clé serveur — reproductible au moment
 * de corriger sans rien stocker, et imprévisible pour les joueurs : la position de la
 * bonne réponse ne se devine pas.
 */
function quizQuestion(gameId: string, bankIndex: number): { question: QuizQuestion; correct: number } {
  const entry = QUIZ_BANK[bankIndex];
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "quiz";
  const digest = createHmac("sha256", key).update(`${gameId}:${bankIndex}`).digest();
  const order = entry.choices.map((_, index) => index);
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swap = digest[index] % (index + 1);
    [order[index], order[swap]] = [order[swap], order[index]];
  }
  return {
    question: {
      category: entry.category,
      text: entry.text,
      choices: order.map((original) => entry.choices[original]),
    },
    // Dans la banque, la bonne réponse est toujours le premier choix.
    correct: order.indexOf(0),
  };
}

function pickQuestion(gameId: string, asked: number[]) {
  const remaining = QUIZ_BANK.map((_, index) => index).filter((index) => !asked.includes(index));
  if (!remaining.length) return null;
  const index = remaining[randomInt(remaining.length)];
  return { index, question: quizQuestion(gameId, index).question };
}

/** Ferme la question : lit les réponses secrètes de chacun et passe à la suivante. */
async function closeQuizRound(ctx: MultiplayerContext, state: QuizState): Promise<MultiplayerResult> {
  const answers = await Promise.all(
    Array.from({ length: ctx.count }, async (_, player) => {
      const secret = await ctx.loadSecret<QuizSecret>(player);
      return secret?.answers[String(state.round)] ?? null;
    }),
  );
  const bankIndex = state.asked[state.asked.length - 1];
  const { correct } = quizQuestion(ctx.gameId, bankIndex);
  const outcome = resolveQuizRound(state, answers, correct, pickQuestion(ctx.gameId, state.asked));
  return outcome.finished
    ? outcome.winner === null
      ? { state: outcome.state, finished: true, winner: null, reason: null }
      : { state: outcome.state, finished: true, winner: outcome.winner, reason: "best_score" }
    : { state: outcome.state };
}

const quiz: MultiplayerEngine = {
  hasSecrets: true,
  async start({ gameId, count }) {
    const first = pickQuestion(gameId, []);
    if (!first) throw new ApiError("Banque de questions vide.", 500);
    return startQuiz(count, first);
  },
  async play(ctx) {
    const current = ctx.state as QuizState;

    if (ctx.payload?.action === "answer" && typeof ctx.payload.choice === "number") {
      const choice = ctx.payload.choice;
      const next = rule(() => markQuizAnswered(current, ctx.player, choice));
      const secret = (await ctx.loadSecret<QuizSecret>(ctx.player)) ?? { answers: {} };
      await ctx.saveSecret(ctx.player, {
        answers: { ...secret.answers, [String(current.round)]: choice },
      } satisfies QuizSecret);
      return quizRoundComplete(next) ? closeQuizRound(ctx, next) : { state: next };
    }

    // Un joueur ne répond pas : le créateur peut fermer la question sans lui.
    if (ctx.payload?.action === "skip") {
      if (!ctx.isCreator) throw new ApiError("Seul le créateur de la partie peut passer une question.", 403);
      return closeQuizRound(ctx, current);
    }

    throw new ApiError("Action inconnue.", 400);
  },
  // Après un abandon, ceux qui restent ont peut-être tous déjà répondu.
  async forfeit(ctx) {
    const result = defaultForfeit(ctx);
    if (result.finished) return result;
    const next = result.state as QuizState;
    return quizRoundComplete(next) ? closeQuizRound(ctx, next) : result;
  },
};

export const MULTIPLAYER_ENGINES: Record<MultiplayerGameType, MultiplayerEngine> = {
  uno,
  tic_tac_toe_3: ticTacToe3,
  ludo,
  quiz,
};

/** Abandon d'un joueur, selon le jeu. */
export function forfeitMultiplayer(type: MultiplayerGameType, ctx: MultiplayerContext) {
  const engine = MULTIPLAYER_ENGINES[type];
  return engine.forfeit ? engine.forfeit(ctx) : Promise.resolve(defaultForfeit(ctx));
}
