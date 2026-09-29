import { NextResponse } from "next/server";

import { ApiError, withActor } from "@/lib/api-handler";
import { MESSAGING_ROLES } from "@/domain/messaging";
import {
  loadGameForActor,
  resolveGameId,
  toGameItem,
  updateGameIfUnchanged,
} from "@/lib/messaging-games";
import { applyChessMove, replayChess, type ChessMoveOutcome } from "@/lib/chess-game";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const SQUARE = /^[a-h][1-8]$/;
const PROMOTIONS = new Set(["q", "r", "b", "n"]);

/**
 * Joue un coup.
 *
 * Tout est vérifié ici, rien n'est cru du client : que la partie soit en cours, que ce
 * soit bien au tour de l'appelant, et que le coup soit légal dans la position rejouée.
 */
export const POST = withActor<RouteContext>(
  [...MESSAGING_ROLES],
  async ({ adminClient, profile, request }, context) => {
    const gameId = resolveGameId((await context.params).id);
    const row = await loadGameForActor(adminClient, profile.id, gameId);

    if (row.status !== "active") throw new ApiError("La partie n'est pas en cours.", 409);

    const payload = (await request.json().catch(() => null)) as {
      from?: unknown;
      to?: unknown;
      promotion?: unknown;
    } | null;
    const from = typeof payload?.from === "string" ? payload.from : "";
    const to = typeof payload?.to === "string" ? payload.to : "";
    const promotion = typeof payload?.promotion === "string" ? payload.promotion : undefined;
    if (!SQUARE.test(from) || !SQUARE.test(to) || (promotion && !PROMOTIONS.has(promotion))) {
      throw new ApiError("Coup invalide.", 400);
    }

    const turn = replayChess(row.state).turn();
    const expected = turn === "w" ? row.player_one_id : row.player_two_id;
    if (expected !== profile.id) throw new ApiError("Ce n'est pas votre tour.", 409);

    let outcome: ChessMoveOutcome;
    try {
      outcome = applyChessMove(row.state, { from, to, promotion });
    } catch {
      throw new ApiError("Coup illégal.", 400);
    }

    const updated = await updateGameIfUnchanged(adminClient, row, {
      state: outcome.state,
      ...(outcome.finished
        ? { status: "finished" as const, result: outcome.result, result_reason: outcome.resultReason }
        : {}),
    });
    return NextResponse.json({ game: toGameItem(updated) });
  },
  { missingSession: "Session manquante." },
);
