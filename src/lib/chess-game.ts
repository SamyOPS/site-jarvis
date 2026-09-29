import { Chess } from "chess.js";

import type { ChessState, GameResult } from "@/domain/games";

/**
 * Règles des échecs, partagées entre l'API et l'échiquier.
 *
 * Le serveur est seul juge : il rejoue la partie et refuse tout coup illégal. Le client
 * s'en sert uniquement pour surligner les cases jouables — un confort, pas un contrôle.
 */

export function initialChessState(): ChessState {
  return { fen: new Chess().fen(), moves: [], lastMove: null };
}

/**
 * Reconstitue la partie en REJOUANT les coups, et non depuis la seule position : la
 * nulle par triple répétition exige l'historique, qu'un FEN ne porte pas.
 */
export function replayChess(state: ChessState | null | undefined) {
  const chess = new Chess();
  for (const san of state?.moves ?? []) {
    chess.move(san);
  }
  return chess;
}

export type ChessMoveInput = { from: string; to: string; promotion?: string };

export type ChessMoveOutcome = {
  state: ChessState;
  finished: boolean;
  result: GameResult | null;
  resultReason: string | null;
};

/** Joue un coup. Lève une erreur si le coup est illégal. */
export function applyChessMove(state: ChessState, input: ChessMoveInput): ChessMoveOutcome {
  const chess = replayChess(state);
  // chess.js lève sur un coup illégal : on laisse remonter, l'appelant traduit en 400.
  const move = chess.move({
    from: input.from,
    to: input.to,
    promotion: input.promotion ?? "q",
  });

  const next: ChessState = {
    fen: chess.fen(),
    moves: [...(state.moves ?? []), move.san],
    lastMove: { from: move.from, to: move.to },
  };

  if (chess.isCheckmate()) {
    // Le camp qui vient de jouer a gagné ; c'est désormais au perdant d'avoir le trait.
    return {
      state: next,
      finished: true,
      result: chess.turn() === "w" ? "player_two" : "player_one",
      resultReason: "checkmate",
    };
  }
  if (chess.isDraw() || chess.isStalemate()) {
    return {
      state: next,
      finished: true,
      result: "draw",
      resultReason: chess.isStalemate()
        ? "stalemate"
        : chess.isThreefoldRepetition()
          ? "repetition"
          : chess.isInsufficientMaterial()
            ? "insufficient_material"
            : "fifty_moves",
    };
  }
  return { state: next, finished: false, result: null, resultReason: null };
}
