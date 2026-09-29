import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiError, unwrap, withActor } from "@/lib/api-handler";
import { MESSAGING_ROLES } from "@/domain/messaging";
import {
  BATTLESHIP_SIZE,
  otherSeat,
  seatOf,
  type BattleshipState,
  type ChessState,
  type GameSeat,
} from "@/domain/games";
import {
  gameForActor,
  loadGameForActor,
  loadShips,
  resolveGameId,
  updateGameIfUnchanged,
  type GameRow,
} from "@/lib/messaging-games";
import { applyChessMove, replayChess, type ChessMoveOutcome } from "@/lib/chess-game";
import { applyShot, isValidFleet, markReady } from "@/lib/battleship-game";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

type MovePayload = Record<string, unknown> | null;

const SQUARE = /^[a-h][1-8]$/;
const PROMOTIONS = new Set(["q", "r", "b", "n"]);

/** Échecs : un coup `{ from, to, promotion? }`. */
async function playChess(adminClient: SupabaseClient, row: GameRow, seat: GameSeat, payload: MovePayload) {
  const from = typeof payload?.from === "string" ? payload.from : "";
  const to = typeof payload?.to === "string" ? payload.to : "";
  const promotion = typeof payload?.promotion === "string" ? payload.promotion : undefined;
  if (!SQUARE.test(from) || !SQUARE.test(to) || (promotion && !PROMOTIONS.has(promotion))) {
    throw new ApiError("Coup invalide.", 400);
  }

  const state = row.state as ChessState;
  const turn = replayChess(state).turn() === "w" ? "player_one" : "player_two";
  if (turn !== seat) throw new ApiError("Ce n'est pas votre tour.", 409);

  let outcome: ChessMoveOutcome;
  try {
    outcome = applyChessMove(state, { from, to, promotion });
  } catch {
    throw new ApiError("Coup illégal.", 400);
  }

  return updateGameIfUnchanged(adminClient, row, {
    state: outcome.state,
    ...(outcome.finished
      ? { status: "finished" as const, result: outcome.result, result_reason: outcome.resultReason }
      : {}),
  });
}

/**
 * Bataille navale : `{ action: "place", ships }` pour valider sa flotte, puis
 * `{ action: "fire", cell }` pour tirer.
 */
async function playBattleship(
  adminClient: SupabaseClient,
  row: GameRow,
  seat: GameSeat,
  actorId: string,
  payload: MovePayload,
) {
  const state = row.state as BattleshipState;

  if (payload?.action === "place") {
    if (state.phase !== "placement") throw new ApiError("Le placement est terminé.", 409);
    if (state.ready[seat]) throw new ApiError("Votre flotte est déjà validée.", 409);
    if (!isValidFleet(payload.ships)) throw new ApiError("Placement de la flotte invalide.", 400);

    /*
      La flotte est écrite AVANT la ligne publique : si la seconde écriture échoue (course
      avec l'adversaire), la flotte est simplement réécrite au prochain essai. L'ordre
      inverse pourrait marquer un joueur prêt sans flotte enregistrée.
    */
    unwrap(
      await adminClient
        .from("game_secrets")
        .upsert({ game_id: row.id, profile_id: actorId, data: { ships: payload.ships } }),
    );
    return updateGameIfUnchanged(adminClient, row, { state: markReady(state, seat) });
  }

  if (payload?.action === "fire") {
    if (state.phase !== "battle") throw new ApiError("La bataille n'a pas commencé.", 409);
    if (state.turn !== seat) throw new ApiError("Ce n'est pas votre tour.", 409);
    const cell = payload.cell;
    if (typeof cell !== "number" || !Number.isInteger(cell) || cell < 0 || cell >= BATTLESHIP_SIZE ** 2) {
      throw new ApiError("Case invalide.", 400);
    }

    const opponentId = otherSeat(seat) === "player_one" ? row.player_one_id : row.player_two_id;
    const targetShips = await loadShips(adminClient, row.id, opponentId);
    if (!targetShips) throw new ApiError("Flotte adverse introuvable.", 409);

    let outcome;
    try {
      outcome = applyShot(state, seat, cell, targetShips);
    } catch {
      throw new ApiError("Case déjà visée.", 400);
    }

    return updateGameIfUnchanged(adminClient, row, {
      state: outcome.state,
      ...(outcome.finished
        ? { status: "finished" as const, result: outcome.winner, result_reason: "fleet_sunk" }
        : {}),
    });
  }

  throw new ApiError("Action inconnue.", 400);
}

/**
 * Joue un coup.
 *
 * Tout est vérifié ici, rien n'est cru du client : que la partie soit en cours, que
 * l'appelant y joue, que ce soit son tour, et que le coup respecte les règles du jeu.
 */
export const POST = withActor<RouteContext>(
  [...MESSAGING_ROLES],
  async ({ adminClient, profile, request }, context) => {
    const gameId = resolveGameId((await context.params).id);
    const row = await loadGameForActor(adminClient, profile.id, gameId);

    if (row.status !== "active") throw new ApiError("La partie n'est pas en cours.", 409);
    const seat = seatOf({ playerOneId: row.player_one_id, playerTwoId: row.player_two_id }, profile.id);
    if (!seat) throw new ApiError("Vous ne jouez pas cette partie.", 403);

    const payload = (await request.json().catch(() => null)) as MovePayload;

    const updated =
      row.game_type === "battleship"
        ? await playBattleship(adminClient, row, seat, profile.id, payload)
        : await playChess(adminClient, row, seat, payload);

    return NextResponse.json({ game: await gameForActor(adminClient, updated, profile.id) });
  },
  { missingSession: "Session manquante." },
);
