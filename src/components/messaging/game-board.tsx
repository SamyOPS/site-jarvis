"use client";

import { ChessBoard } from "@/components/messaging/chess-board";
import { BattleshipPanel } from "@/components/messaging/battleship-panel";
import { ConnectFourBoard, TicTacToeBoard } from "@/components/messaging/grid-boards";
import { CheckersBoard } from "@/components/messaging/checkers-board";
import { GuessWhoPanel } from "@/components/messaging/guess-who-panel";
import { MastermindPanel } from "@/components/messaging/mastermind-panel";
import type { ChessMoveInput } from "@/lib/chess-game";
import { playConnectFour, playTicTacToe } from "@/lib/grid-games";
import { playCheckers } from "@/lib/checkers-game";
import type {
  BattleshipShip,
  CheckersState,
  ChessState,
  GameItem,
  GameSeat,
  GridState,
} from "@/domain/games";

type GameBoardProps = {
  game: GameItem;
  seat: GameSeat;
  opponentName: string;
  /** Vrai quand c'est à l'utilisateur d'agir et qu'aucun coup n'est en vol. */
  interactive: boolean;
  pending: boolean;
  /** `optimistic` rejoue le coup localement pour l'afficher sans attendre le serveur. */
  sendMove: (body: Record<string, unknown>, optimistic?: (game: GameItem) => GameItem | null) => void;
  playChessMove: (move: ChessMoveInput) => void;
};

/**
 * Coup rejoue en local avec les regles du moteur. Le serveur reste seul juge : s'il
 * refuse, la partie revient a sa version. Un coup que les regles locales refusent n'est
 * pas envoye du tout.
 */
function locally<S>(apply: (state: S) => { state: S }) {
  return (current: GameItem): GameItem | null => {
    try {
      return { ...current, state: apply(current.state as S).state as GameItem["state"] };
    } catch {
      return null;
    }
  };
}

/**
 * Aiguillage vers le plateau du jeu. Chaque plateau parle le format de coup de son
 * moteur (src/lib/game-engines.ts) : c'est ici que les deux se rejoignent.
 */
export function GameBoard({ game, seat, opponentName, interactive, pending, sendMove, playChessMove }: GameBoardProps) {
  switch (game.gameType) {
    case "chess": {
      const state = game.state as ChessState;
      const orientation = seat === "player_two" ? "b" : "w";
      return (
        <>
          <p className="text-app-xs text-app-text-muted">
            {opponentName} · {orientation === "w" ? "Noirs" : "Blancs"}
          </p>
          <ChessBoard state={state} orientation={orientation} interactive={interactive} onMove={playChessMove} />
          <div className="flex items-center justify-between gap-3 text-app-xs text-app-text-muted">
            <span>Vous · {orientation === "w" ? "Blancs" : "Noirs"}</span>
            <span>
              {state.moves.length} coup{state.moves.length > 1 ? "s" : ""}
            </span>
          </div>
        </>
      );
    }
    case "battleship":
      return (
        <BattleshipPanel
          game={game}
          seat={seat}
          opponentName={opponentName}
          pending={pending}
          onPlace={(ships: BattleshipShip[]) => sendMove({ action: "place", ships })}
          onFire={(cell) => sendMove({ action: "fire", cell })}
        />
      );
    case "connect_four":
      return (
        <ConnectFourBoard
          state={game.state as GridState}
          seat={seat}
          interactive={interactive}
          onPlay={(column) =>
            sendMove({ column }, locally<GridState>((state) => playConnectFour(state, seat, column)))
          }
        />
      );
    case "tic_tac_toe":
      return (
        <TicTacToeBoard
          state={game.state as GridState}
          seat={seat}
          interactive={interactive}
          onPlay={(cell) =>
            sendMove({ cell }, locally<GridState>((state) => playTicTacToe(state, seat, cell)))
          }
        />
      );
    case "checkers":
      return (
        <CheckersBoard
          state={game.state as CheckersState}
          seat={seat}
          interactive={interactive}
          onMove={(path) =>
            sendMove({ path }, locally<CheckersState>((state) => playCheckers(state, seat, path)))
          }
        />
      );
    case "guess_who":
      return (
        <GuessWhoPanel
          game={game}
          seat={seat}
          opponentName={opponentName}
          interactive={interactive}
          onAsk={(questionId) => sendMove({ action: "ask", questionId })}
          onGuess={(characterId) => sendMove({ action: "guess", characterId })}
        />
      );
    case "mastermind":
      return (
        <MastermindPanel
          game={game}
          seat={seat}
          opponentName={opponentName}
          interactive={interactive}
          pending={pending}
          onSetCode={(code) => sendMove({ action: "set", code })}
          onGuess={(code) => sendMove({ action: "guess", code })}
        />
      );
  }
}

/**
 * Largeur de la fenêtre, proportionnelle à l'écran : les jeux à deux planches demandent
 * plus de place. La HAUTEUR, elle, est bornée par chaque plateau (voir leurs `max-w`
 * calculés sur `100dvh`) : un plateau carré qui suivrait seulement la largeur déborderait
 * sur un écran large et peu haut.
 */
export function gameDialogWidth(type: GameItem["gameType"] | undefined, withChat = false) {
  const wide =
    type === "battleship" ||
    type === "guess_who" ||
    type === "mastermind" ||
    type === "uno" ||
    type === "ludo" ||
    type === "quiz";
  // Le chat prend une colonne de 20rem a cote du plateau, a partir de l'ecran large.
  if (withChat) return wide ? "max-w-[min(98vw,100rem)]" : "max-w-[min(96vw,76rem)]";
  return wide ? "max-w-[min(96vw,80rem)]" : "max-w-[min(94vw,54rem)]";
}
