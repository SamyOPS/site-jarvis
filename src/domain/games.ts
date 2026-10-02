/**
 * Jeux proposés dans la messagerie.
 *
 * Le catalogue est la seule liste à tenir côté front : le menu « Jeux » l'affiche tel
 * quel. Un jeu ne s'y ajoute qu'une fois son moteur écrit côté serveur
 * (src/lib/game-engines.ts pour les jeux à deux, src/lib/multiplayer-engines.ts pour les
 * jeux à plusieurs) et son type autorisé par la contrainte `games.game_type`.
 */

/** Jeux à deux places : `player_one_id` et `player_two_id`. */
export type TwoPlayerGameType =
  | "chess"
  | "battleship"
  | "connect_four"
  | "tic_tac_toe"
  | "checkers"
  | "guess_who"
  | "mastermind";

/**
 * Jeux à plusieurs : les joueurs sont une liste ordonnée (`games.players`), désignés par
 * leur rang dans cette liste. Jouables à deux aussi quand le jeu le permet.
 */
export type MultiplayerGameType = "uno" | "tic_tac_toe_3" | "ludo" | "quiz";

export type GameType = TwoPlayerGameType | MultiplayerGameType;

export const MULTIPLAYER_GAME_TYPES: readonly MultiplayerGameType[] = [
  "uno",
  "tic_tac_toe_3",
  "ludo",
  "quiz",
];

export function isMultiplayerGame(type: string | null | undefined): type is MultiplayerGameType {
  return MULTIPLAYER_GAME_TYPES.includes(type as MultiplayerGameType);
}

export type GameStatus = "pending" | "active" | "finished";

/**
 * Issue d'une partie, exprimée en joueurs et non en couleurs. `winner` : jeu à plusieurs,
 * le gagnant est alors dans `winnerId`.
 */
export type GameResult = "player_one" | "player_two" | "draw" | "winner";

/** Issue d'un jeu à deux : jamais `winner`. */
export type TwoPlayerResult = Exclude<GameResult, "winner">;

/** Joueur, désigné par sa place et non par son identifiant. */
export type GameSeat = "player_one" | "player_two";

export type GameCatalogEntry = {
  type: GameType;
  name: string;
  description: string;
  icon: string;
  /** Nombre de joueurs. Absent : deux exactement. */
  minPlayers?: number;
  maxPlayers?: number;
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
  {
    type: "uno",
    name: "UNO",
    description: "Videz votre main le premier. +2, inversion, joker…",
    icon: "🃏",
    minPlayers: 2,
    maxPlayers: 4,
  },
  {
    type: "ludo",
    name: "Petits chevaux",
    description: "Un 6 pour sortir, rentrez vos quatre chevaux avant les autres.",
    icon: "🐎",
    minPlayers: 2,
    maxPlayers: 4,
  },
  {
    type: "tic_tac_toe_3",
    name: "Morpion à 3",
    description: "Grille 6 × 6, alignez quatre symboles. Trois joueurs.",
    icon: "🔺",
    minPlayers: 3,
    maxPlayers: 3,
  },
  {
    type: "quiz",
    name: "Quiz",
    description: "Dix questions de culture générale, le meilleur score gagne.",
    icon: "🧠",
    minPlayers: 2,
    maxPlayers: 8,
  },
];

/** Bornes du nombre de joueurs d'un jeu. */
export function playerRange(entry: Pick<GameCatalogEntry, "minPlayers" | "maxPlayers">) {
  return { min: entry.minPlayers ?? 2, max: entry.maxPlayers ?? 2 };
}

/** « 2 joueurs », « 3 joueurs », « 2 à 4 joueurs ». */
export function playerRangeLabel(entry: Pick<GameCatalogEntry, "minPlayers" | "maxPlayers">) {
  const { min, max } = playerRange(entry);
  return min === max ? `${min} joueurs` : `${min} à ${max} joueurs`;
}

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
// Jeux à plusieurs : socle commun
// ---------------------------------------------------------------------------

/**
 * Tout état de jeu à plusieurs porte le rang du joueur qui a la main et les rangs des
 * joueurs sortis (abandon) : ceux-ci ne jouent plus, le tour les saute.
 */
export type MultiplayerTurnState = {
  turn: number;
  out: number[];
};

/** Salle d'attente : partie créée, joueurs en train de rejoindre. */
export type LobbyState = { lobby: true };

// ---------------------------------------------------------------------------
// Morpion à 3
// ---------------------------------------------------------------------------

export const TIC_TAC_TOE_3_SIZE = 6;
export const TIC_TAC_TOE_3_ALIGN = 4;

/** Grille de 6 × 6, case = ligne × 6 + colonne, occupée par le rang d'un joueur. */
export type TicTacToe3State = MultiplayerTurnState & {
  board: (number | null)[];
  lastMove: number | null;
  winLine: number[] | null;
};

// ---------------------------------------------------------------------------
// UNO
// ---------------------------------------------------------------------------

export type UnoColor = "red" | "yellow" | "green" | "blue";
export type UnoValue =
  | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
  | "skip"
  | "reverse"
  | "draw2"
  | "wild"
  | "wild4";

/** Carte. Un joker n'a pas de couleur tant qu'il n'est pas posé. */
export type UnoCard = { color: UnoColor | null; value: UnoValue };

export type UnoEvent = {
  by: number;
  kind: "play" | "draw" | "pass";
  card?: UnoCard;
  /** Cartes piochées par le joueur suivant (+2, +4). */
  penalty?: { to: number; count: number };
  /** Pioche ou passe faite par le serveur : le joueur n'avait aucune carte jouable. */
  auto?: boolean;
};

/**
 * État PUBLIC d'une partie d'UNO. Les mains sont secrètes (`game_secrets`), seul leur
 * nombre de cartes est public. La pioche est infinie, tirée au hasard selon la
 * composition d'un vrai jeu : il n'y a donc pas de pioche à cacher.
 */
export type UnoState = MultiplayerTurnState & {
  top: UnoCard;
  /** Couleur à suivre : celle de la carte du dessus, ou celle choisie pour un joker. */
  color: UnoColor;
  direction: 1 | -1;
  handCounts: number[];
  /** Le joueur qui a la main a déjà pioché ce tour-ci : il peut poser ou passer. */
  hasDrawn: boolean;
  lastEvent: UnoEvent | null;
  /** Derniers coups, du plus ancien au plus récent (absent des parties plus anciennes). */
  recent?: UnoEvent[];
};

export type UnoSecret = { hand: UnoCard[] };

// ---------------------------------------------------------------------------
// Petits chevaux
// ---------------------------------------------------------------------------

export const LUDO_TRACK_LENGTH = 40;
export const LUDO_PAWNS = 4;
/** Avancée d'un cheval : -1 à l'écurie, 0 à 39 sur la piste, 40 à 43 dans la maison. */
export const LUDO_HOME_START = 40;
export const LUDO_FINISH = 43;

export type LudoState = MultiplayerTurnState & {
  /**
   * Couleur (0 rouge, 1 bleu, 2 vert, 3 jaune) de chaque joueur, qui fixe aussi sa case
   * de départ. À deux, les joueurs se font face : rouge et vert.
   */
  colors: number[];
  /** Avancée de chaque cheval, par joueur. */
  pawns: number[][];
  /** `roll` : il faut lancer le dé. `move` : il faut choisir un cheval. */
  phase: "roll" | "move";
  die: number | null;
  lastEvent: {
    by: number;
    die: number;
    pawn: number | null;
    /** Cheval adverse renvoyé à l'écurie. */
    captured: { player: number; pawn: number } | null;
  } | null;
};

// ---------------------------------------------------------------------------
// Quiz
// ---------------------------------------------------------------------------

export const QUIZ_ROUNDS = 10;

export type QuizQuestion = { text: string; choices: string[]; category: string };

export type QuizRound = QuizQuestion & {
  correct: number;
  /** Réponse de chaque joueur, par rang ; null s'il n'a pas répondu. */
  answers: (number | null)[];
};

/**
 * La bonne réponse et les réponses des joueurs ne sont rendues publiques qu'une fois la
 * question close : jusque-là, chacun répond en secret (`game_secrets`) et la bonne
 * réponse reste côté serveur.
 */
export type QuizState = MultiplayerTurnState & {
  round: number;
  total: number;
  question: QuizQuestion;
  /** Rangs des joueurs qui ont répondu à la question en cours. */
  answered: number[];
  /** Questions déjà posées (rangs dans la banque, qui reste côté serveur). */
  asked: number[];
  scores: number[];
  history: QuizRound[];
};

export type QuizSecret = { answers: Record<string, number> };

// ---------------------------------------------------------------------------
// Partie
// ---------------------------------------------------------------------------

export type GameState =
  | ChessState
  | BattleshipState
  | GridState
  | CheckersState
  | GuessWhoState
  | MastermindState
  | LobbyState
  | TicTacToe3State
  | UnoState
  | LudoState
  | QuizState;

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
  empty_hand: "plus de cartes en main",
  all_home: "tous les chevaux rentrés",
  best_score: "meilleur score",
  last_standing: "abandon des autres joueurs",
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
  /**
   * Joueurs dans l'ordre du tour. Jeu à plusieurs : la source de vérité. Jeu à deux :
   * reconstituée depuis les deux places, pour que l'interface n'ait qu'une liste à lire.
   */
  players: string[];
  /** Gagnant d'un jeu à plusieurs (`result = "winner"`). */
  winnerId: string | null;
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

/** Rang de l'utilisateur dans un jeu à plusieurs, ou -1 s'il n'y joue pas. */
export function playerIndexOf(game: Pick<GameItem, "players">, userId: string) {
  return game.players.indexOf(userId);
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
  /** Jeu à plusieurs : `wins` est le classement de la conversation à ce jeu. */
  multiplayer?: boolean;
};

/** Aperçu du résultat dans la liste des conversations. Neutre : il est lu par les deux. */
export function gameResultBody(entry: GameCatalogEntry, cancelled: boolean) {
  return `${entry.icon} Partie de ${entry.name} ${cancelled ? "annulée" : "terminée"}`;
}

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}

/**
 * Score vu par `viewerId`. Joueur : « 3 victoires · 1 défaite · 2 nuls ». Membre d'un
 * groupe qui regardait : « Selin 3 – 1 Alex · 2 nuls ».
 */
export function gameScoreLine(meta: GameResultMeta, viewerId: string, nameOf: (id: string) => string) {
  const [first, second] = meta.players;
  const draws = meta.draws > 0 ? ` · ${plural(meta.draws, "nul", "nuls")}` : "";

  // Jeu à plusieurs : classement par victoires, « Vous 3 · Selin 2 · Alex 0 ».
  if (meta.multiplayer) {
    const ranking = meta.players
      .filter((id): id is string => Boolean(id))
      .map((id) => ({ id, wins: meta.wins[id] ?? 0 }))
      .sort((left, right) => right.wins - left.wins);
    return `${ranking.map(({ id, wins }) => `${nameOf(id)} ${wins}`).join(" · ")}${draws}`;
  }

  if (!meta.players.includes(viewerId)) {
    if (!first || !second) return "";
    return `${nameOf(first)} ${meta.wins[first] ?? 0} – ${meta.wins[second] ?? 0} ${nameOf(second)}${draws}`;
  }

  const opponentId = meta.players.find((id) => id && id !== viewerId) ?? null;
  const wins = meta.wins[viewerId] ?? 0;
  const losses = opponentId ? (meta.wins[opponentId] ?? 0) : 0;
  return `${plural(wins, "victoire", "victoires")} · ${plural(losses, "défaite", "défaites")}${draws}`;
}

/** Titre du résultat vu par `viewerId`. */
export function gameResultHeadline(meta: GameResultMeta, viewerId: string, nameOf: (id: string) => string) {
  if (meta.outcome === "cancelled") return "Invitation annulée";
  if (meta.outcome === "draw") return "Match nul";
  if (!meta.players.includes(viewerId)) {
    return meta.winnerId ? `Victoire de ${nameOf(meta.winnerId)}` : "Partie terminée";
  }
  return meta.winnerId === viewerId ? "Victoire" : "Défaite";
}

/** Texte du message d'invitation : c'est aussi ce qu'affichent l'aperçu et l'e-mail de rappel. */
export function gameInvitationBody(entry: GameCatalogEntry) {
  return `${entry.icon} Invitation à une partie : ${entry.name}`;
}
