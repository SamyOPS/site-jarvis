import {
  CHECKERS_SIZE,
  otherSeat,
  type CheckersPiece,
  type CheckersState,
  type GameSeat,
} from "@/domain/games";

/**
 * Jeu de dames, règles internationales (10 × 10), partagées entre l'API et le damier.
 *
 *   - le pion avance d'une case en diagonale, mais PREND dans les deux sens ;
 *   - la dame se déplace et prend à distance (« dame volante ») ;
 *   - la prise est obligatoire, et c'est la rafle qui prend le PLUS de pièces qui doit
 *     être jouée (dames et pions comptent pareil) ;
 *   - les pièces prises restent sur le damier jusqu'à la fin de la rafle : on ne peut
 *     ni les sauter deux fois, ni passer à travers ;
 *   - un pion n'est promu que s'il TERMINE son coup sur la dernière rangée ;
 *   - un joueur sans pièce ou sans coup possible a perdu.
 */

const CELLS = CHECKERS_SIZE * CHECKERS_SIZE;
const DIAGONALS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
] as const;

/** Nulle après 25 coups de dames de chaque côté sans prise ni mouvement de pion. */
const QUIET_KING_LIMIT = 50;

export type CheckersMove = {
  /** Chemin complet, case de départ comprise. */
  path: number[];
  captured: number[];
};

const rowOf = (cell: number) => Math.floor(cell / CHECKERS_SIZE);
const colOf = (cell: number) => cell % CHECKERS_SIZE;
const at = (row: number, col: number) =>
  row >= 0 && row < CHECKERS_SIZE && col >= 0 && col < CHECKERS_SIZE ? row * CHECKERS_SIZE + col : null;

export function isDarkSquare(cell: number) {
  return (rowOf(cell) + colOf(cell)) % 2 === 1;
}

export function initialCheckersState(): CheckersState {
  const board: (CheckersPiece | null)[] = Array(CELLS).fill(null);
  for (let cell = 0; cell < CELLS; cell += 1) {
    if (!isDarkSquare(cell)) continue;
    if (rowOf(cell) <= 3) board[cell] = { seat: "player_two", king: false };
    if (rowOf(cell) >= 6) board[cell] = { seat: "player_one", king: false };
  }
  return { board, turn: "player_one", lastMove: null, lastCaptured: [], quietKingMoves: 0 };
}

/** Sens de marche d'un pion : les blancs (premier joueur) montent. */
const forward = (seat: GameSeat) => (seat === "player_one" ? -1 : 1);
const promotionRow = (seat: GameSeat) => (seat === "player_one" ? 0 : CHECKERS_SIZE - 1);

/** Rafles possibles depuis `from`, explorées en profondeur. */
function captures(board: CheckersState["board"], from: number): CheckersMove[] {
  const piece = board[from];
  if (!piece) return [];
  const results: CheckersMove[] = [];

  // La pièce qui joue a quitté sa case : celle-ci compte comme vide pendant la rafle.
  const isEmpty = (cell: number) => board[cell] === null || cell === from;

  const explore = (position: number, path: number[], captured: number[]) => {
    let extended = false;
    for (const [dr, dc] of DIAGONALS) {
      let row = rowOf(position) + dr;
      let col = colOf(position) + dc;

      // La dame glisse sur les cases vides jusqu'à la première pièce rencontrée.
      if (piece.king) {
        while (at(row, col) !== null && isEmpty(at(row, col)!)) {
          row += dr;
          col += dc;
        }
      }
      const victim = at(row, col);
      if (victim === null) continue;
      const target = board[victim];
      if (!target || victim === from || target.seat === piece.seat || captured.includes(victim)) continue;

      // Cases d'arrivée derrière la pièce prise : une seule pour un pion, toutes les
      // cases vides consécutives pour une dame.
      let landRow = row + dr;
      let landCol = col + dc;
      while (at(landRow, landCol) !== null && isEmpty(at(landRow, landCol)!)) {
        const landing = at(landRow, landCol)!;
        extended = true;
        explore(landing, [...path, landing], [...captured, victim]);
        if (!piece.king) break;
        landRow += dr;
        landCol += dc;
      }
    }
    if (!extended && captured.length > 0) results.push({ path, captured });
  };

  explore(from, [from], []);
  return results;
}

function quietMoves(board: CheckersState["board"], from: number): CheckersMove[] {
  const piece = board[from];
  if (!piece) return [];
  const moves: CheckersMove[] = [];
  for (const [dr, dc] of DIAGONALS) {
    if (!piece.king && dr !== forward(piece.seat)) continue;
    let row = rowOf(from) + dr;
    let col = colOf(from) + dc;
    while (at(row, col) !== null && board[at(row, col)!] === null) {
      moves.push({ path: [from, at(row, col)!], captured: [] });
      if (!piece.king) break;
      row += dr;
      col += dc;
    }
  }
  return moves;
}

/** Tous les coups légaux du joueur : les rafles maximales s'il y en a, sinon les déplacements. */
export function legalCheckersMoves(state: CheckersState, seat: GameSeat): CheckersMove[] {
  const own = state.board.flatMap((piece, cell) => (piece?.seat === seat ? [cell] : []));
  const allCaptures = own.flatMap((cell) => captures(state.board, cell));

  if (allCaptures.length > 0) {
    const best = Math.max(...allCaptures.map((move) => move.captured.length));
    // Une dame peut atteindre la même case par deux chemins identiques : on dédoublonne.
    const seen = new Set<string>();
    return allCaptures.filter((move) => {
      const key = move.path.join("-");
      if (move.captured.length !== best || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  return own.flatMap((cell) => quietMoves(state.board, cell));
}

export type CheckersOutcome = {
  state: CheckersState;
  finished: boolean;
  result: GameSeat | "draw" | null;
  reason: "all_captured" | "no_moves" | "quiet_kings" | null;
};

/** Joue le coup dont le chemin est `path`. Lève une erreur s'il n'est pas légal. */
export function playCheckers(state: CheckersState, seat: GameSeat, path: number[]): CheckersOutcome {
  const key = path.join("-");
  const move = legalCheckersMoves(state, seat).find((candidate) => candidate.path.join("-") === key);
  if (!move) throw new Error("Coup illégal.");

  const board = [...state.board];
  const from = move.path[0];
  const to = move.path[move.path.length - 1];
  const piece = board[from]!;
  board[from] = null;
  for (const cell of move.captured) board[cell] = null;
  board[to] = { seat, king: piece.king || rowOf(to) === promotionRow(seat) };

  const quietKingMoves = piece.king && move.captured.length === 0 ? state.quietKingMoves + 1 : 0;
  const opponent = otherSeat(seat);
  const next: CheckersState = {
    board,
    turn: opponent,
    lastMove: move.path,
    lastCaptured: move.captured,
    quietKingMoves,
  };

  if (!board.some((cell) => cell?.seat === opponent)) {
    return { state: next, finished: true, result: seat, reason: "all_captured" };
  }
  if (legalCheckersMoves(next, opponent).length === 0) {
    return { state: next, finished: true, result: seat, reason: "no_moves" };
  }
  if (quietKingMoves >= QUIET_KING_LIMIT) {
    return { state: next, finished: true, result: "draw", reason: "quiet_kings" };
  }
  return { state: next, finished: false, result: null, reason: null };
}
