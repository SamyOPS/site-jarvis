import type { MultiplayerTurnState } from "@/domain/games";

/**
 * Rotation du tour d'un jeu à plusieurs.
 *
 * Les joueurs sortis (abandon) sont sautés : ils restent dans la liste — leurs pions,
 * leurs marques restent sur le plateau — mais ne reprennent jamais la main.
 */

/** Rangs encore en jeu, dans l'ordre. */
export function activePlayers(state: Pick<MultiplayerTurnState, "out">, count: number) {
  return Array.from({ length: count }, (_, index) => index).filter((index) => !state.out.includes(index));
}

/**
 * Rang du joueur qui suit `from`, dans le sens `direction`, en sautant les sortis.
 * `skip` saute en plus ce nombre de joueurs en jeu (carte « passe » de l'UNO).
 */
export function nextPlayer(
  from: number,
  count: number,
  out: number[],
  direction: 1 | -1 = 1,
  skip = 0,
) {
  let current = from;
  let remaining = skip + 1;
  // Borne de sécurité : au pire, un tour complet par joueur à sauter.
  for (let guard = 0; guard < count * (skip + 2) && remaining > 0; guard += 1) {
    current = (current + direction + count) % count;
    if (!out.includes(current)) remaining -= 1;
  }
  return current;
}

/**
 * Sort un joueur de la partie. Rend le nouvel état et, s'il ne reste qu'un joueur, son
 * rang : il gagne par abandon des autres.
 */
export function forfeitPlayer<S extends MultiplayerTurnState>(
  state: S,
  index: number,
  count: number,
): { state: S; lastStanding: number | null } {
  if (state.out.includes(index)) return { state, lastStanding: null };
  const out = [...state.out, index];
  const remaining = activePlayers({ out }, count);
  const turn = state.turn === index ? nextPlayer(index, count, out) : state.turn;
  return {
    state: { ...state, out, turn },
    lastStanding: remaining.length === 1 ? remaining[0] : null,
  };
}
