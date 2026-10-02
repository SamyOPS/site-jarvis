import type { UnoCard, UnoColor, UnoEvent, UnoState, UnoValue } from "@/domain/games";
import { activePlayers, nextPlayer } from "@/lib/multiplayer-turns";

/**
 * UNO, règles simplifiées. Pures : le hasard est INJECTÉ (`rand`), pour que le serveur
 * tire avec une source sûre et que l'interface puisse réutiliser `canPlayUno` sans tirer.
 *
 * Simplifications assumées :
 *   - pioche infinie, tirée selon la composition d'un vrai jeu (108 cartes) : aucune
 *     pioche à cacher ni à mélanger ;
 *   - +2 et +4 font piocher le joueur suivant et lui font passer son tour, sans cumul ni
 *     contestation du +4 ;
 *   - pas d'annonce « UNO ! » à faire soi-même.
 */

export const UNO_COLORS: UnoColor[] = ["red", "yellow", "green", "blue"];
export const UNO_START_HAND = 7;

/** Tirage d'un entier dans [0, max). */
export type Rand = (max: number) => number;

/** Les 108 cartes d'un jeu, une entrée par exemplaire : tirer une entrée suit les vraies proportions. */
const DECK: UnoCard[] = (() => {
  const cards: UnoCard[] = [];
  for (const color of UNO_COLORS) {
    cards.push({ color, value: "0" });
    for (const value of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "skip", "reverse", "draw2"] as UnoValue[]) {
      cards.push({ color, value }, { color, value });
    }
  }
  for (let copy = 0; copy < 4; copy += 1) {
    cards.push({ color: null, value: "wild" }, { color: null, value: "wild4" });
  }
  return cards;
})();

export function drawCard(rand: Rand): UnoCard {
  return { ...DECK[rand(DECK.length)] };
}

function drawCards(rand: Rand, count: number) {
  return Array.from({ length: count }, () => drawCard(rand));
}

export function isWild(card: UnoCard) {
  return card.value === "wild" || card.value === "wild4";
}

/** La carte peut-elle être posée sur la pile ? */
export function canPlayUno(card: UnoCard, state: Pick<UnoState, "top" | "color">) {
  return isWild(card) || card.color === state.color || card.value === state.top.value;
}

/** Distribue les mains et retourne la première carte, toujours un chiffre. */
export function startUno(count: number, rand: Rand): { state: UnoState; hands: UnoCard[][] } {
  let top = drawCard(rand);
  while (!/^[0-9]$/.test(top.value)) top = drawCard(rand);
  const hands = Array.from({ length: count }, () => drawCards(rand, UNO_START_HAND));
  return {
    state: {
      top,
      color: top.color as UnoColor,
      direction: 1,
      turn: 0,
      out: [],
      handCounts: hands.map((hand) => hand.length),
      hasDrawn: false,
      lastEvent: null,
    },
    hands,
  };
}

/** Coups gardés dans l'historique affiché. */
const RECENT_EVENTS = 6;

/** Enregistre un coup : dernier coup et historique court. */
function withEvent(state: UnoState, event: UnoEvent): UnoState {
  return { ...state, lastEvent: event, recent: [...(state.recent ?? []), event].slice(-RECENT_EVENTS) };
}

export type UnoPlayOutcome = {
  state: UnoState;
  hand: UnoCard[];
  /** Cartes à ajouter à la main d'un autre joueur (+2, +4). */
  penalty: { to: number; cards: UnoCard[] } | null;
  finished: boolean;
};

function assertTurn(state: UnoState, player: number) {
  if (state.turn !== player) throw new Error("Ce n'est pas votre tour.");
}

/** Pose la carte `cardIndex` de la main. `chosen` : couleur annoncée pour un joker. */
export function playUno(
  state: UnoState,
  player: number,
  hand: UnoCard[],
  cardIndex: number,
  chosen: UnoColor | null,
  rand: Rand,
): UnoPlayOutcome {
  assertTurn(state, player);
  const card = hand[cardIndex];
  if (!card) throw new Error("Carte introuvable.");
  if (!canPlayUno(card, state)) throw new Error("Cette carte ne peut pas être posée.");
  if (isWild(card) && (!chosen || !UNO_COLORS.includes(chosen))) throw new Error("Choisissez une couleur.");

  const count = state.handCounts.length;
  const nextHand = hand.filter((_, index) => index !== cardIndex);
  const handCounts = [...state.handCounts];
  handCounts[player] = nextHand.length;

  let direction = state.direction;
  let skip = 0;
  let penalty: UnoPlayOutcome["penalty"] = null;

  // À deux joueurs, l'inversion revient à faire passer son tour à l'adversaire.
  const duel = activePlayers(state, count).length === 2;

  if (card.value === "reverse") {
    direction = direction === 1 ? -1 : 1;
    if (duel) skip = 1;
  } else if (card.value === "skip") {
    skip = 1;
  } else if (card.value === "draw2" || card.value === "wild4") {
    const target = nextPlayer(player, count, state.out, direction);
    penalty = { to: target, cards: drawCards(rand, card.value === "draw2" ? 2 : 4) };
    handCounts[target] += penalty.cards.length;
    skip = 1;
  }

  const finished = nextHand.length === 0;
  const played: UnoCard = isWild(card) ? { color: chosen, value: card.value } : card;

  return {
    state: withEvent(
      {
        ...state,
        top: played,
        color: (played.color ?? state.color) as UnoColor,
        direction,
        handCounts,
        hasDrawn: false,
        turn: finished ? player : nextPlayer(player, count, state.out, direction, skip),
      },
      {
        by: player,
        kind: "play",
        card: played,
        ...(penalty ? { penalty: { to: penalty.to, count: penalty.cards.length } } : {}),
      },
    ),
    hand: nextHand,
    penalty,
    finished,
  };
}

/** Pioche une carte. Une fois par tour : ensuite, poser ou passer. */
export function drawUno(state: UnoState, player: number, hand: UnoCard[], rand: Rand, auto = false) {
  assertTurn(state, player);
  if (state.hasDrawn) throw new Error("Vous avez déjà pioché : posez une carte ou passez.");
  const handCounts = [...state.handCounts];
  handCounts[player] += 1;
  return {
    state: withEvent({ ...state, handCounts, hasDrawn: true }, { by: player, kind: "draw", ...(auto ? { auto } : {}) }),
    hand: [...hand, drawCard(rand)],
  };
}

/** Passe son tour, après avoir pioché. */
export function passUno(state: UnoState, player: number, auto = false): UnoState {
  assertTurn(state, player);
  if (!state.hasDrawn) throw new Error("Piochez d'abord une carte.");
  return withEvent(
    {
      ...state,
      hasDrawn: false,
      turn: nextPlayer(player, state.handCounts.length, state.out, state.direction),
    },
    { by: player, kind: "pass", ...(auto ? { auto } : {}) },
  );
}

/**
 * Pioche automatique : le joueur qui a la main n'a AUCUNE carte jouable. Il pioche ;
 * si la carte piochée se pose, il garde la main pour la jouer (ou passer), sinon il
 * passe. Rend `null` quand il n'y a rien à faire — une carte jouable, ou déjà pioché.
 */
export function autoDrawUno(state: UnoState, hand: UnoCard[], rand: Rand) {
  const player = state.turn;
  if (state.hasDrawn || hand.some((card) => canPlayUno(card, state))) return null;
  const drawn = drawUno(state, player, hand, rand, true);
  const card = drawn.hand[drawn.hand.length - 1];
  if (canPlayUno(card, drawn.state)) return { state: drawn.state, hand: drawn.hand };
  return { state: passUno(drawn.state, player, true), hand: drawn.hand };
}
