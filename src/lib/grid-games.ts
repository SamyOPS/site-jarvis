import {
  CONNECT_FOUR_COLUMNS,
  CONNECT_FOUR_ROWS,
  otherSeat,
  type GameSeat,
  type GridState,
} from "@/domain/games";

/**
 * Puissance 4 et morpion : deux jeux d'alignement sur une grille, partagés entre l'API
 * (qui valide) et l'interface (qui affiche). Seule la façon de choisir la case diffère —
 * au Puissance 4 on choisit une colonne, le jeton tombe.
 */

export type GridOutcome = {
  state: GridState;
  finished: boolean;
  result: GameSeat | "draw" | null;
  reason: "line" | "board_full" | null;
};

const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
] as const;

/** Cherche un alignement de `length` passant par `cell`. */
function lineThrough(
  board: GridState["board"],
  columns: number,
  rows: number,
  cell: number,
  length: number,
) {
  const seat = board[cell];
  if (!seat) return null;
  const row = Math.floor(cell / columns);
  const col = cell % columns;

  for (const [dr, dc] of DIRECTIONS) {
    const line = [cell];
    for (const sign of [1, -1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (r >= 0 && r < rows && c >= 0 && c < columns && board[r * columns + c] === seat) {
        line.push(r * columns + c);
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (line.length >= length) return line.sort((a, b) => a - b);
  }
  return null;
}

function place(state: GridState, seat: GameSeat, cell: number, columns: number, rows: number, length: number): GridOutcome {
  const board = [...state.board];
  board[cell] = seat;
  const winLine = lineThrough(board, columns, rows, cell, length);
  const full = board.every(Boolean);
  const next: GridState = { board, turn: otherSeat(seat), lastMove: cell, winLine };

  if (winLine) return { state: next, finished: true, result: seat, reason: "line" };
  if (full) return { state: next, finished: true, result: "draw", reason: "board_full" };
  return { state: next, finished: false, result: null, reason: null };
}

// ---------------------------------------------------------------------------
// Puissance 4
// ---------------------------------------------------------------------------

export function initialConnectFourState(): GridState {
  return {
    board: Array(CONNECT_FOUR_COLUMNS * CONNECT_FOUR_ROWS).fill(null),
    turn: "player_one",
    lastMove: null,
    winLine: null,
  };
}

/** Case où tomberait un jeton lâché dans `column`, ou null si la colonne est pleine. */
export function connectFourLanding(board: GridState["board"], column: number) {
  for (let row = CONNECT_FOUR_ROWS - 1; row >= 0; row -= 1) {
    const cell = row * CONNECT_FOUR_COLUMNS + column;
    if (!board[cell]) return cell;
  }
  return null;
}

export function playConnectFour(state: GridState, seat: GameSeat, column: number): GridOutcome {
  if (!Number.isInteger(column) || column < 0 || column >= CONNECT_FOUR_COLUMNS) {
    throw new Error("Colonne invalide.");
  }
  const cell = connectFourLanding(state.board, column);
  if (cell === null) throw new Error("Colonne pleine.");
  return place(state, seat, cell, CONNECT_FOUR_COLUMNS, CONNECT_FOUR_ROWS, 4);
}

// ---------------------------------------------------------------------------
// Morpion
// ---------------------------------------------------------------------------

export function initialTicTacToeState(): GridState {
  return { board: Array(9).fill(null), turn: "player_one", lastMove: null, winLine: null };
}

export function playTicTacToe(state: GridState, seat: GameSeat, cell: number): GridOutcome {
  if (!Number.isInteger(cell) || cell < 0 || cell >= 9) throw new Error("Case invalide.");
  if (state.board[cell]) throw new Error("Case déjà prise.");
  return place(state, seat, cell, 3, 3, 3);
}
