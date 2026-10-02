import type {
  GameItem,
  LudoState,
  MultiplayerTurnState,
  QuizState,
  UnoState,
} from "@/domain/games";

/**
 * Qui doit jouer, et que dire sous le titre, pour un jeu à plusieurs. Sert à l'interface
 * seulement : le serveur refait le contrôle à chaque coup.
 */

/** Le joueur de rang `player` a-t-il la main ? Au quiz, tous répondent en même temps. */
export function isPlayerToPlay(game: GameItem, player: number) {
  if (game.status !== "active" || player < 0) return false;
  const state = game.state as MultiplayerTurnState;
  if (state.out?.includes(player)) return false;
  if (game.gameType === "quiz") return !(game.state as QuizState).answered.includes(player);
  return state.turn === player;
}

/** Phrase d'état d'une partie à plusieurs en cours. */
export function multiplayerStatus(game: GameItem, player: number, nameOf: (profileId: string) => string) {
  const state = game.state as MultiplayerTurnState;
  if (player >= 0 && state.out?.includes(player)) return "Vous avez quitté la partie.";

  const mine = isPlayerToPlay(game, player);
  const current = game.players[state.turn];
  const theirs = current ? `Au tour de ${nameOf(current)}.` : "Partie en cours.";

  switch (game.gameType) {
    case "uno": {
      const uno = game.state as UnoState;
      if (!mine) return theirs;
      return uno.hasDrawn ? "Posez la carte piochée, ou passez." : "À vous : posez une carte ou piochez.";
    }
    case "ludo": {
      const ludo = game.state as LudoState;
      if (!mine) return theirs;
      return ludo.phase === "roll" ? "À vous : lancez le dé." : `Vous avez fait ${ludo.die} : choisissez un cheval.`;
    }
    case "quiz": {
      const quiz = game.state as QuizState;
      const progress = `Question ${Math.min(quiz.round + 1, quiz.total)} sur ${quiz.total}`;
      if (player < 0) return `${progress}.`;
      return mine ? `${progress} : à vous de répondre.` : `${progress} : en attente des autres joueurs…`;
    }
    default:
      return mine ? "À vous de jouer." : theirs;
  }
}
