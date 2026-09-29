import { NextResponse } from "next/server";

import { withActor } from "@/lib/api-handler";
import { MESSAGING_ROLES } from "@/domain/messaging";
import { loadGameForActor, resolveGameId, toGameItem } from "@/lib/messaging-games";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/** État courant d'une partie. */
export const GET = withActor<RouteContext>(
  [...MESSAGING_ROLES],
  async ({ adminClient, profile }, context) => {
    const gameId = resolveGameId((await context.params).id);
    const row = await loadGameForActor(adminClient, profile.id, gameId);
    return NextResponse.json({ game: toGameItem(row) });
  },
  { missingSession: "Session manquante." },
);
