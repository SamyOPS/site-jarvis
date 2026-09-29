/**
 * Jeux proposés dans la messagerie.
 *
 * Le catalogue est la seule liste à tenir côté front : le menu « Jeux » l'affiche tel
 * quel. Un jeu ne s'y ajoute qu'une fois sa validation écrite côté serveur et son type
 * autorisé par la contrainte `games.game_type` (voir 20260929000000_messaging_games.sql).
 */

export type GameType = "chess";

export type GameStatus = "pending" | "active" | "finished";

/** Issue d'une partie, exprimée en joueurs et non en couleurs. */
export type GameResult = "player_one" | "player_two" | "draw";

export type GameCatalogEntry = {
  type: GameType;
  name: string;
  description: string;
  icon: string;
};

export const GAME_CATALOG: GameCatalogEntry[] = [
  {
    type: "chess",
    name: "Échecs",
    description: "Une partie à deux, les coups se jouent chacun son tour.",
    icon: "♟️",
  },
];

export function gameCatalogEntry(type: string | null | undefined) {
  return GAME_CATALOG.find((entry) => entry.type === type) ?? null;
}

/** État d'une partie d'échecs, tel que stocké dans `games.state`. */
export type ChessState = {
  fen: string;
  /** Coups en notation algébrique, du premier au dernier. */
  moves: string[];
  lastMove: { from: string; to: string } | null;
};

export type GameItem = {
  id: string;
  conversationId: string;
  gameType: GameType;
  status: GameStatus;
  createdBy: string | null;
  /** Aux échecs : les blancs. */
  playerOneId: string | null;
  /** Aux échecs : les noirs. */
  playerTwoId: string | null;
  state: ChessState;
  result: GameResult | null;
  resultReason: string | null;
  updatedAt: string;
};

/** Texte du message d'invitation : c'est aussi ce qu'affichent l'aperçu et l'e-mail de rappel. */
export function gameInvitationBody(entry: GameCatalogEntry) {
  return `${entry.icon} Invitation à une partie : ${entry.name}`;
}
