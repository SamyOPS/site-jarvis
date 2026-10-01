import { replayChess } from "@/lib/chess-game";
import type {
  BattleshipState,
  ChessState,
  GameItem,
  GameSeat,
  GridState,
  MastermindState,
} from "@/domain/games";

/**
 * Qui doit jouer, jeu par jeu. Sert à l'interface seulement (phrase d'état, plateau
 * cliquable ou non) : le serveur refait le contrôle pour chaque coup.
 *
 * Certains jeux ont une phase SIMULTANÉE — placer sa flotte, composer son code — où les
 * deux joueurs agissent en même temps : chacun a « la main » tant qu'il n'a pas validé.
 */
export function isSeatToPlay(game: GameItem, seat: GameSeat) {
  if (game.status !== "active") return false;

  switch (game.gameType) {
    case "chess":
      return (replayChess(game.state as ChessState).turn() === "w" ? "player_one" : "player_two") === seat;
    case "battleship": {
      const state = game.state as BattleshipState;
      return state.phase === "placement" ? !state.ready[seat] : state.turn === seat;
    }
    case "mastermind": {
      const state = game.state as MastermindState;
      return state.phase === "setup" ? !state.ready[seat] : state.turn === seat;
    }
    default:
      return (game.state as GridState).turn === seat;
  }
}

/** Phrase d'état d'une partie en cours, selon le jeu et sa phase. */
export function activeStatus(game: GameItem, seat: GameSeat, opponentName: string) {
  const mine = isSeatToPlay(game, seat);

  switch (game.gameType) {
    case "chess": {
      const check = replayChess(game.state as ChessState).inCheck() ? " Échec !" : "";
      return mine ? `À vous de jouer.${check}` : `Au tour de ${opponentName}.${check}`;
    }
    case "battleship": {
      const state = game.state as BattleshipState;
      if (state.phase === "placement") return mine ? "Placez votre flotte." : `${opponentName} place sa flotte…`;
      // Un tir réussi donne un tir de plus : on le dit, sinon garder la main surprend.
      const replay = state.lastShot?.hit === true;
      if (mine) return replay ? "Touché ! Vous rejouez." : "À vous de tirer.";
      return replay ? `${opponentName} a touché et rejoue…` : `Au tour de ${opponentName}.`;
    }
    case "mastermind": {
      const state = game.state as MastermindState;
      if (state.phase === "setup") return mine ? "Composez votre code secret." : `${opponentName} compose son code…`;
      return mine ? "À vous de proposer un code." : `Au tour de ${opponentName}.`;
    }
    case "guess_who":
      return mine ? "À vous : posez une question ou désignez un personnage." : `${opponentName} réfléchit…`;
    default:
      return mine ? "À vous de jouer." : `Au tour de ${opponentName}.`;
  }
}
