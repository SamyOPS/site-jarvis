import { NextResponse } from "next/server";

import { ApiError, withActor } from "@/lib/api-handler";
import { MESSAGING_ROLES } from "@/domain/messaging";
import { gameCatalogEntry, isMultiplayerGame, playerRange } from "@/domain/games";
import {
  gameForActor,
  loadGameForActor,
  resolveGameId,
  startMultiplayerGame,
} from "@/lib/messaging-games";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Lance une partie à plusieurs avant que la table soit pleine. Réservé à son créateur,
 * et seulement une fois atteint le nombre minimum de joueurs.
 */
export const POST = withActor<RouteContext>(
  [...MESSAGING_ROLES],
  async ({ adminClient, profile }, context) => {
    const gameId = resolveGameId((await context.params).id);
    const row = await loadGameForActor(adminClient, profile.id, gameId);

    if (!isMultiplayerGame(row.game_type)) throw new ApiError("Cette partie démarre d'elle-même.", 409);
    if (row.created_by !== profile.id) throw new ApiError("Seul le créateur peut lancer la partie.", 403);
    if (row.status !== "pending") {
      return NextResponse.json({ game: await gameForActor(adminClient, row, profile.id) });
    }

    const players = row.players ?? [];
    const { min } = playerRange(gameCatalogEntry(row.game_type)!);
    if (players.length < min) {
      throw new ApiError(`Il faut au moins ${min} joueurs pour lancer la partie.`, 409);
    }

    const updated = await startMultiplayerGame(adminClient, row, players);
    return NextResponse.json({ game: await gameForActor(adminClient, updated, profile.id) });
  },
  { missingSession: "Session manquante." },
);
