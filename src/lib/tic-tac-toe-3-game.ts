import {
  TIC_TAC_TOE_3_ALIGN,
  TIC_TAC_TOE_3_SIZE,
  type TicTacToe3State,
} from "@/domain/games";
import { nextPlayer } from "@/lib/multiplayer-turns";

/**
 * Morpion à trois joueurs : grille de 6 × 6, il faut aligner quatre symboles (ligne,
 * colonne ou diagonale). Règles pures, partagées par le serveur et l'interface.
 */

export const TIC_TAC_TOE_3_PLAYERS = 3;

export function initialTicTacToe3State(): TicTacToe3State {
  return {
    board: Array(TIC_TAC_TOE_3_SIZE * TIC_TAC_TOE_3_SIZE).fill(null),
    turn: 0,
    out: [],
    lastMove: null,
    winLine: null,
  };
}

const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
] as const;

/** Alignement de `TIC_TAC_TOE_3_ALIGN` cases passant par `cell`, ou null. */
function lineThrough(board: (number | null)[], cell: number): number[] | null {
  const owner = board[cell];
  if (owner === null) return null;
  const row = Math.floor(cell / TIC_TAC_TOE_3_SIZE);
  const col = cell % TIC_TAC_TOE_3_SIZE;

  for (const [dr, dc] of DIRECTIONS) {
    const line = [cell];
    // Dans les deux sens à partir de la case jouée.
    for (const sign of [1, -1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (
        r >= 0 && r < TIC_TAC_TOE_3_SIZE && c >= 0 && c < TIC_TAC_TOE_3_SIZE &&
        board[r * TIC_TAC_TOE_3_SIZE + c] === owner
      ) {
        line.push(r * TIC_TAC_TOE_3_SIZE + c);
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (line.length >= TIC_TAC_TOE_3_ALIGN) return line.sort((a, b) => a - b);
  }
  return null;
}

export type TicTacToe3Outcome = {
  state: TicTacToe3State;
  finished: boolean;
  /** Rang du gagnant ; null pour une grille pleine sans alignement. */
  winner: number | null;
  reason: "line" | "board_full" | null;
};

/** Pose le symbole du joueur `player` sur `cell`. Lève une erreur si le coup est illégal. */
export function playTicTacToe3(state: TicTacToe3State, player: number, cell: number): TicTacToe3Outcome {
  if (state.turn !== player) throw new Error("Ce n'est pas votre tour.");
  if (!Number.isInteger(cell) || cell < 0 || cell >= state.board.length) throw new Error("Case invalide.");
  if (state.board[cell] !== null) throw new Error("Case déjà prise.");

  const board = [...state.board];
  board[cell] = player;
  const winLine = lineThrough(board, cell);

  if (winLine) {
    return { state: { ...state, board, lastMove: cell, winLine }, finished: true, winner: player, reason: "line" };
  }
  if (board.every((value) => value !== null)) {
    return { state: { ...state, board, lastMove: cell }, finished: true, winner: null, reason: "board_full" };
  }
  return {
    state: {
      ...state,
      board,
      lastMove: cell,
      turn: nextPlayer(player, TIC_TAC_TOE_3_PLAYERS, state.out),
    },
    finished: false,
    winner: null,
    reason: null,
  };
}
