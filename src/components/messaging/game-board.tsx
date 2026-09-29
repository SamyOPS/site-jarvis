"use client";

import { ChessBoard } from "@/components/messaging/chess-board";
import { BattleshipPanel } from "@/components/messaging/battleship-panel";
import { ConnectFourBoard, TicTacToeBoard } from "@/components/messaging/grid-boards";
import { CheckersBoard } from "@/components/messaging/checkers-board";
import { GuessWhoPanel } from "@/components/messaging/guess-who-panel";
import { MastermindPanel } from "@/components/messaging/mastermind-panel";
import type { ChessMoveInput } from "@/lib/chess-game";
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
  sendMove: (body: Record<string, unknown>) => void;
  playChessMove: (move: ChessMoveInput) => void;
};

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
          onPlay={(column) => sendMove({ column })}
        />
      );
    case "tic_tac_toe":
      return (
        <TicTacToeBoard
          state={game.state as GridState}
          seat={seat}
          interactive={interactive}
          onPlay={(cell) => sendMove({ cell })}
        />
      );
    case "checkers":
      return (
        <CheckersBoard
          state={game.state as CheckersState}
          seat={seat}
          interactive={interactive}
          onMove={(path) => sendMove({ path })}
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
export function gameDialogWidth(type: GameItem["gameType"] | undefined) {
  if (type === "battleship" || type === "guess_who" || type === "mastermind") {
    return "max-w-[min(96vw,80rem)]";
  }
  return "max-w-[min(94vw,54rem)]";
}
