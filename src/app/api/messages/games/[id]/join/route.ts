import { NextResponse } from "next/server";

import { ApiError, withActor } from "@/lib/api-handler";
import { MESSAGING_ROLES } from "@/domain/messaging";
import {
  gameForActor,
  loadGameForActor,
  resolveGameId,
  updateGameIfUnchanged,
} from "@/lib/messaging-games";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Rejoint une partie en attente et la lance.
 *
 * Idempotent pour les joueurs déjà assis : cliquer une seconde fois sur l'invitation
 * rouvre simplement la partie. Le créateur ne peut pas occuper les deux places.
 */
export const POST = withActor<RouteContext>(
  [...MESSAGING_ROLES],
  async ({ adminClient, profile }, context) => {
    const gameId = resolveGameId((await context.params).id);
    const row = await loadGameForActor(adminClient, profile.id, gameId);

    const seated = row.player_one_id === profile.id || row.player_two_id === profile.id;
    if (seated || row.status !== "pending") {
      return NextResponse.json({ game: await gameForActor(adminClient, row, profile.id) });
    }
    if (row.player_two_id) throw new ApiError("La partie est déjà complète.", 409);

    const updated = await updateGameIfUnchanged(adminClient, row, {
      player_two_id: profile.id,
      status: "active",
    });
    return NextResponse.json({ game: await gameForActor(adminClient, updated, profile.id) });
  },
  { missingSession: "Session manquante." },
);
