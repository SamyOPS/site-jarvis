import { NextResponse } from "next/server";

import { ApiError, withActor } from "@/lib/api-handler";
import { MESSAGING_ROLES } from "@/domain/messaging";
import {
  loadGameForActor,
  resolveGameId,
  toGameItem,
  updateGameIfUnchanged,
} from "@/lib/messaging-games";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Abandonne une partie. Une invitation encore en attente peut aussi être annulée par
 * son créateur : elle se clôt sans vainqueur.
 */
export const POST = withActor<RouteContext>(
  [...MESSAGING_ROLES],
  async ({ adminClient, profile }, context) => {
    const gameId = resolveGameId((await context.params).id);
    const row = await loadGameForActor(adminClient, profile.id, gameId);

    if (row.status === "finished") return NextResponse.json({ game: toGameItem(row) });

    const isPlayerOne = row.player_one_id === profile.id;
    const isPlayerTwo = row.player_two_id === profile.id;
    if (!isPlayerOne && !isPlayerTwo) throw new ApiError("Vous ne jouez pas cette partie.", 403);

    const pending = row.status === "pending";
    const updated = await updateGameIfUnchanged(adminClient, row, {
      status: "finished",
      result: pending ? null : isPlayerOne ? "player_two" : "player_one",
      result_reason: pending ? "cancelled" : "resign",
    });
    return NextResponse.json({ game: toGameItem(updated) });
  },
  { missingSession: "Session manquante." },
);
