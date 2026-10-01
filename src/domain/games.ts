/**
 * Jeux proposés dans la messagerie.
 *
 * Le catalogue est la seule liste à tenir côté front : le menu « Jeux » l'affiche tel
 * quel. Un jeu ne s'y ajoute qu'une fois son moteur écrit côté serveur
 * (src/lib/game-engines.ts) et son type autorisé par la contrainte `games.game_type`.
 */

export type GameType =
  | "chess"
  | "battleship"
  | "connect_four"
  | "tic_tac_toe"
  | "checkers"
  | "guess_who"
  | "mastermind";

export type GameStatus = "pending" | "active" | "finished";

/** Issue d'une partie, exprimée en joueurs et non en couleurs. */
export type GameResult = "player_one" | "player_two" | "draw";

/** Joueur, désigné par sa place et non par son identifiant. */
export type GameSeat = "player_one" | "player_two";

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
    description: "Le grand classique, chacun son tour.",
    icon: "♟️",
  },
  {
    type: "checkers",
    name: "Dames",
    description: "Règles internationales sur 10 × 10, prise obligatoire.",
    icon: "⚪",
  },
  {
    type: "connect_four",
    name: "Puissance 4",
    description: "Alignez quatre jetons avant l'adversaire.",
    icon: "🔴",
  },
  {
    type: "tic_tac_toe",
    name: "Morpion",
    description: "Trois symboles alignés, une partie en une minute.",
    icon: "❌",
  },
  {
    type: "battleship",
    name: "Bataille navale",
    description: "Placez votre flotte, puis coulez celle de l'adversaire. Touché, vous rejouez.",
    icon: "🚢",
  },
  {
    type: "guess_who",
    name: "Qui est-ce ?",
    description: "Posez des questions pour démasquer le personnage adverse.",
    icon: "🕵️",
  },
  {
    type: "mastermind",
    name: "Mastermind",
    description: "Composez un code secret, percez celui de l'adversaire.",
    icon: "🎯",
  },
];

export function gameCatalogEntry(type: string | null | undefined) {
  return GAME_CATALOG.find((entry) => entry.type === type) ?? null;
}

// ---------------------------------------------------------------------------
// Échecs
// ---------------------------------------------------------------------------

/** État d'une partie d'échecs, tel que stocké dans `games.state`. */
export type ChessState = {
  fen: string;
  /** Coups en notation algébrique, du premier au dernier. */
  moves: string[];
  lastMove: { from: string; to: string } | null;
};

// ---------------------------------------------------------------------------
// Bataille navale
// ---------------------------------------------------------------------------

/**
 * Grille de 10 × 10, cases numérotées de 0 à 99 (ligne × 10 + colonne).
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

export type BattleshipSecret = { ships: BattleshipShip[] };

// ---------------------------------------------------------------------------
// Puissance 4 et morpion : grilles de cases, occupées par un joueur ou vides
// ---------------------------------------------------------------------------

export const CONNECT_FOUR_COLUMNS = 7;
export const CONNECT_FOUR_ROWS = 6;

/** Grille lue ligne par ligne, du haut vers le bas : case = ligne × colonnes + colonne. */
export type GridState = {
  board: (GameSeat | null)[];
  turn: GameSeat;
  lastMove: number | null;
  /** Cases de l'alignement gagnant, pour le surligner. */
  winLine: number[] | null;
};

export type ConnectFourState = GridState;
export type TicTacToeState = GridState;

// ---------------------------------------------------------------------------
// Dames
// ---------------------------------------------------------------------------

export const CHECKERS_SIZE = 10;

export type CheckersPiece = { seat: GameSeat; king: boolean };

/**
 * Damier de 10 × 10, case = ligne × 10 + colonne, ligne 0 en haut. Le premier joueur a
 * les blancs, en bas, et monte ; il joue en premier, comme le veut la règle.
 */
export type CheckersState = {
  board: (CheckersPiece | null)[];
  turn: GameSeat;
  /** Chemin du dernier coup, case de départ comprise. */
  lastMove: number[] | null;
  /** Cases des pièces prises au dernier coup. */
  lastCaptured: number[];
  /** Coups de dames consécutifs sans prise ni mouvement de pion : nulle à 25. */
  quietKingMoves: number;
};

// ---------------------------------------------------------------------------
// Qui est-ce ?
// ---------------------------------------------------------------------------

export type GuessWhoQuestion = { by: GameSeat; questionId: string; answer: boolean };
export type GuessWhoGuess = { by: GameSeat; characterId: string; correct: boolean };

/**
 * Les questions et leurs réponses sont publiques, comme autour d'une vraie table. Seul
 * le personnage de chacun est secret (`game_secrets`), et c'est le serveur qui répond :
 * personne ne peut mentir.
 */
export type GuessWhoState = {
  questions: GuessWhoQuestion[];
  guesses: GuessWhoGuess[];
  turn: GameSeat;
};

export type GuessWhoSecret = { characterId: string };

// ---------------------------------------------------------------------------
// Mastermind
// ---------------------------------------------------------------------------

export const MASTERMIND_COLORS = 6;
export const MASTERMIND_LENGTH = 4;
export const MASTERMIND_ROUNDS = 10;

/** Proposition et réponse : pions bien placés, et bonnes couleurs mal placées. */
export type MastermindGuess = { code: number[]; exact: number; misplaced: number };

export type MastermindState = {
  phase: "setup" | "play";
  ready: Record<GameSeat, boolean>;
  /** Propositions de chaque joueur, faites sur le code de l'AUTRE. */
  guesses: Record<GameSeat, MastermindGuess[]>;
  turn: GameSeat;
};

export type MastermindSecret = { code: number[] };

// ---------------------------------------------------------------------------
// Partie
// ---------------------------------------------------------------------------

export type GameState =
  | ChessState
  | BattleshipState
  | GridState
  | CheckersState
  | GuessWhoState
  | MastermindState;

/**
 * Données cachées : celles de l'appelant (sa flotte, son personnage, son code), jamais
 * celles de l'adversaire — sauf une fois la partie terminée, pour montrer ce qu'on
 * cherchait. Leur forme dépend du jeu (`BattleshipSecret`, `GuessWhoSecret`...).
 */
export type GamePrivate = {
  secret: unknown;
  opponentSecret?: unknown;
};

/** Raisons de fin de partie, telles qu'affichées (« gagné par … »). */
export const GAME_RESULT_REASONS: Record<string, string> = {
  checkmate: "échec et mat",
  stalemate: "pat",
  repetition: "triple répétition",
  insufficient_material: "matériel insuffisant",
  fifty_moves: "règle des 50 coups",
  fleet_sunk: "flotte coulée",
  line: "alignement",
  board_full: "grille pleine",
  no_moves: "blocage",
  all_captured: "prise de toutes les pièces",
  quiet_kings: "25 coups de dames sans prise",
  guessed: "bonne réponse",
  wrong_guess: "mauvaise réponse",
  code_broken: "code percé",
  rounds_exhausted: "essais épuisés",
  resign: "abandon",
  cancelled: "invitation annulée",
};

export type GameItem = {
  id: string;
  conversationId: string;
  gameType: GameType;
  status: GameStatus;
  createdBy: string | null;
  /** Le joueur qui a lancé l'invitation : blancs aux échecs et aux dames, premier à jouer. */
  playerOneId: string | null;
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

/**
 * Contenu d'un message de résultat (`messages.meta`), posté dans le fil à la fin d'une
 * partie. Le score est celui des deux participants à CE jeu, figé au moment de la partie.
 * Les compteurs sont indexés par profil et non par place : la place change d'une partie
 * à l'autre (le créateur joue en premier), le joueur non.
 */
export type GameResultMeta = {
  gameType: GameType;
  outcome: "win" | "draw" | "cancelled";
  winnerId: string | null;
  reason: string | null;
  players: (string | null)[];
  wins: Record<string, number>;
  draws: number;
};

/** Aperçu du résultat dans la liste des conversations. Neutre : il est lu par les deux. */
export function gameResultBody(entry: GameCatalogEntry, cancelled: boolean) {
  return `${entry.icon} Partie de ${entry.name} ${cancelled ? "annulée" : "terminée"}`;
}

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}

/** Score vu par `viewerId` : « 3 victoires · 1 défaite · 2 nuls ». */
export function gameScoreLine(meta: GameResultMeta, viewerId: string) {
  const opponentId = meta.players.find((id) => id && id !== viewerId) ?? null;
  const wins = meta.wins[viewerId] ?? 0;
  const losses = opponentId ? (meta.wins[opponentId] ?? 0) : 0;
  const parts = [plural(wins, "victoire", "victoires"), plural(losses, "défaite", "défaites")];
  if (meta.draws > 0) parts.push(plural(meta.draws, "nul", "nuls"));
  return parts.join(" · ");
}

/** Titre du résultat vu par `viewerId`. */
export function gameResultHeadline(meta: GameResultMeta, viewerId: string) {
  if (meta.outcome === "cancelled") return "Invitation annulée";
  if (meta.outcome === "draw") return "Match nul";
  return meta.winnerId === viewerId ? "Victoire" : "Défaite";
}

/** Texte du message d'invitation : c'est aussi ce qu'affichent l'aperçu et l'e-mail de rappel. */
export function gameInvitationBody(entry: GameCatalogEntry) {
  return `${entry.icon} Invitation à une partie : ${entry.name}`;
}
