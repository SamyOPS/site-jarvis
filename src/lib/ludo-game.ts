import {
  LUDO_FINISH,
  LUDO_HOME_START,
  LUDO_PAWNS,
  LUDO_TRACK_LENGTH,
  type LudoState,
} from "@/domain/games";
import { nextPlayer } from "@/lib/multiplayer-turns";

/**
 * Petits chevaux, sur le plateau en croix de 11 × 11 (40 cases de piste).
 *
 * Règles retenues :
 *   - il faut un 6 pour sortir un cheval de l'écurie ;
 *   - un 6 donne un lancer de plus ;
 *   - tomber sur un cheval adverse le renvoie à l'écurie ; on ne peut pas tomber sur
 *     l'un des siens ;
 *   - la maison (4 cases) se termine au compte exact : un dé trop fort ne bouge pas le
 *     cheval ;
 *   - sans coup possible, la main passe (sauf sur un 6, qui fait relancer).
 *
 * Règles pures, le dé est fourni par l'appelant : le serveur le tire, l'interface
 * réutilise `legalLudoMoves` pour désigner les chevaux jouables.
 */

/** Cases de départ par couleur : chaque couleur part un quart de tour plus loin. */
const COLOR_START = [0, 10, 20, 30];

/** Couleurs attribuées selon le nombre de joueurs : à deux, face à face. */
export function ludoColors(count: number) {
  if (count === 2) return [0, 2];
  return [0, 1, 2, 3].slice(0, count);
}

export function startLudo(count: number): LudoState {
  return {
    colors: ludoColors(count),
    pawns: Array.from({ length: count }, () => Array(LUDO_PAWNS).fill(-1)),
    turn: 0,
    out: [],
    phase: "roll",
    die: null,
    lastEvent: null,
  };
}

/** Case absolue de la piste (0 à 39) d'un cheval sur la piste, ou null hors piste. */
export function ludoTrackCell(color: number, progress: number) {
  if (progress < 0 || progress >= LUDO_HOME_START) return null;
  return (COLOR_START[color] + progress) % LUDO_TRACK_LENGTH;
}

/** Chevaux du joueur qu'un lancer de `die` peut déplacer. */
export function legalLudoMoves(state: LudoState, player: number, die: number) {
  const own = state.pawns[player];
  return own
    .map((progress, pawn) => ({ progress, pawn }))
    .filter(({ progress }) => {
      if (progress === LUDO_FINISH) return false;
      const target = progress < 0 ? (die === 6 ? 0 : null) : progress + die;
      if (target === null || target > LUDO_FINISH) return false;
      // Pas deux chevaux de la même couleur sur une même case, sauf à l'arrivée.
      return target === LUDO_FINISH || !own.includes(target);
    })
    .map(({ pawn }) => pawn);
}

function passTurn(state: LudoState, player: number, die: number) {
  return die === 6 ? player : nextPlayer(player, state.pawns.length, state.out);
}

/** Lance le dé. Sans coup possible, la main passe aussitôt. */
export function rollLudo(state: LudoState, player: number, die: number): LudoState {
  if (state.turn !== player) throw new Error("Ce n'est pas votre tour.");
  if (state.phase !== "roll") throw new Error("Choisissez d'abord un cheval.");
  if (legalLudoMoves(state, player, die).length) {
    return { ...state, phase: "move", die };
  }
  return {
    ...state,
    phase: "roll",
    die,
    turn: passTurn(state, player, die),
    lastEvent: { by: player, die, pawn: null, captured: null },
  };
}

export type LudoMoveOutcome = { state: LudoState; finished: boolean };

/** Avance le cheval `pawn` du dernier lancer. */
export function moveLudo(state: LudoState, player: number, pawn: number): LudoMoveOutcome {
  if (state.turn !== player) throw new Error("Ce n'est pas votre tour.");
  if (state.phase !== "move" || state.die === null) throw new Error("Lancez d'abord le dé.");
  const die = state.die;
  if (!legalLudoMoves(state, player, die).includes(pawn)) throw new Error("Ce cheval ne peut pas avancer.");

  const pawns = state.pawns.map((row) => [...row]);
  const from = pawns[player][pawn];
  const to = from < 0 ? 0 : from + die;
  pawns[player][pawn] = to;

  // Cheval adverse sur la case d'arrivée : retour à l'écurie.
  let captured: { player: number; pawn: number } | null = null;
  const cell = ludoTrackCell(state.colors[player], to);
  if (cell !== null) {
    pawns.forEach((row, other) => {
      if (other === player) return;
      row.forEach((progress, otherPawn) => {
        if (ludoTrackCell(state.colors[other], progress) === cell) {
          row[otherPawn] = -1;
          captured = { player: other, pawn: otherPawn };
        }
      });
    });
  }

  const finished = pawns[player].every((progress) => progress === LUDO_FINISH);
  return {
    state: {
      ...state,
      pawns,
      phase: "roll",
      die,
      turn: finished ? player : passTurn(state, player, die),
      lastEvent: { by: player, die, pawn, captured },
    },
    finished,
  };
}

// ---------------------------------------------------------------------------
// Géométrie du plateau (11 × 11), pour l'affichage
// ---------------------------------------------------------------------------

/** Les 40 cases de piste, en [ligne, colonne], dans le sens de la marche. */
export const LUDO_TRACK: [number, number][] = [
  [4, 0], [4, 1], [4, 2], [4, 3], [4, 4], [3, 4], [2, 4], [1, 4], [0, 4], [0, 5],
  [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [4, 7], [4, 8], [4, 9], [4, 10], [5, 10],
  [6, 10], [6, 9], [6, 8], [6, 7], [6, 6], [7, 6], [8, 6], [9, 6], [10, 6], [10, 5],
  [10, 4], [9, 4], [8, 4], [7, 4], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0], [5, 0],
];

/** Maison de chaque couleur : 4 cases vers le centre. */
export const LUDO_HOMES: [number, number][][] = [
  [[5, 1], [5, 2], [5, 3], [5, 4]],
  [[1, 5], [2, 5], [3, 5], [4, 5]],
  [[5, 9], [5, 8], [5, 7], [5, 6]],
  [[9, 5], [8, 5], [7, 5], [6, 5]],
];

/** Écurie de chaque couleur, dans un coin. */
export const LUDO_STABLES: [number, number][][] = [
  [[0, 0], [0, 1], [1, 0], [1, 1]],
  [[0, 9], [0, 10], [1, 9], [1, 10]],
  [[9, 9], [9, 10], [10, 9], [10, 10]],
  [[9, 0], [9, 1], [10, 0], [10, 1]],
];

export const LUDO_START_CELLS = COLOR_START;

/** Position à l'écran d'un cheval. */
export function ludoPawnPosition(color: number, progress: number, pawn: number): [number, number] {
  if (progress < 0) return LUDO_STABLES[color][pawn];
  if (progress >= LUDO_HOME_START) return LUDO_HOMES[color][progress - LUDO_HOME_START];
  return LUDO_TRACK[ludoTrackCell(color, progress)!];
}
