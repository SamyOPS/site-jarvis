/**
 * Jeux proposés dans la messagerie.
 *
 * Le catalogue est la seule liste à tenir côté front : le menu « Jeux » l'affiche tel
 * quel. Un jeu ne s'y ajoute qu'une fois sa validation écrite côté serveur et son type
 * autorisé par la contrainte `games.game_type` (voir 20260929000000_messaging_games.sql).
 */

export type GameType = "chess" | "battleship";

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
  {
    type: "battleship",
    name: "Bataille navale",
    description: "Placez votre flotte, puis coulez celle de l'adversaire.",
    icon: "🚢",
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

/** Joueur, désigné par sa place et non par son identifiant. */
export type GameSeat = "player_one" | "player_two";

/**
 * Bataille navale : grille de 10 × 10, cases numérotées de 0 à 99 (ligne × 10 + colonne).
 * Flotte classique de cinq bateaux, 17 cases en tout.
 */
export const BATTLESHIP_SIZE = 10;

export const BATTLESHIP_FLEET = [
  { name: "Porte-avions", size: 5 },
  { name: "Croiseur", size: 4 },
  { name: "Contre-torpilleur", size: 3 },
  { name: "Sous-marin", size: 3 },
  { name: "Torpilleur", size: 2 },
] as const;

/** Un bateau : ses cases, dans l'ordre de la flotte. */
export type BattleshipShip = number[];

export type BattleshipShot = { cell: number; hit: boolean };

/**
 * État PUBLIC d'une bataille navale, stocké dans `games.state` et donc lisible par les
 * deux joueurs. Il ne contient jamais la position des bateaux intacts : celle-ci vit dans
 * `game_secrets`, que seul le serveur lit. Un bateau coulé, lui, est révélé.
 */
export type BattleshipState = {
  phase: "placement" | "battle";
  ready: Record<GameSeat, boolean>;
  /** Tirs reçus PAR chaque joueur, sur sa propre grille. */
  shotsAt: Record<GameSeat, BattleshipShot[]>;
  /** Bateaux coulés de chaque joueur, révélés à l'adversaire. */
  sunkShips: Record<GameSeat, BattleshipShip[]>;
  /** Joueur qui a le trait pendant la bataille. */
  turn: GameSeat;
  lastShot: { by: GameSeat; cell: number; hit: boolean; sunk: boolean } | null;
};

export type GameState = ChessState | BattleshipState;

/**
 * Données propres à l'appelant, jamais diffusées à l'adversaire : sa flotte. La flotte
 * adverse n'y figure qu'une fois la partie terminée, pour montrer ce qu'on a manqué.
 */
export type GamePrivate = {
  ships: BattleshipShip[] | null;
  opponentShips?: BattleshipShip[] | null;
};

/** Raisons de fin de partie, telles qu'affichées (« gagné par … »). */
export const GAME_RESULT_REASONS: Record<string, string> = {
  checkmate: "échec et mat",
  stalemate: "pat",
  repetition: "triple répétition",
  insufficient_material: "matériel insuffisant",
  fifty_moves: "règle des 50 coups",
  fleet_sunk: "flotte coulée",
  resign: "abandon",
  cancelled: "invitation annulée",
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
  state: GameState;
  result: GameResult | null;
  resultReason: string | null;
  updatedAt: string;
  /**
   * Absent des évènements Realtime (ils ne portent que la ligne publique) : le client
   * garde alors la dernière valeur reçue de l'API.
   */
  private?: GamePrivate;
};

/** Place de l'utilisateur dans la partie, ou null s'il n'y joue pas. */
export function seatOf(game: Pick<GameItem, "playerOneId" | "playerTwoId">, userId: string): GameSeat | null {
  if (game.playerOneId === userId) return "player_one";
  if (game.playerTwoId === userId) return "player_two";
  return null;
}

export function otherSeat(seat: GameSeat): GameSeat {
  return seat === "player_one" ? "player_two" : "player_one";
}

/** Texte du message d'invitation : c'est aussi ce qu'affichent l'aperçu et l'e-mail de rappel. */
export function gameInvitationBody(entry: GameCatalogEntry) {
  return `${entry.icon} Invitation à une partie : ${entry.name}`;
}
