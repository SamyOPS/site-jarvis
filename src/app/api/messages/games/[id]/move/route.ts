import { NextResponse } from "next/server";

import { ApiError, withActor } from "@/lib/api-handler";
import { MESSAGING_ROLES } from "@/domain/messaging";
import { seatOf, type GameSeat } from "@/domain/games";
import {
  gameForActor,
  loadGameForActor,
  loadSecret,
  profileAtSeat,
  postGameResult,
  resolveGameId,
  saveSecret,
  updateGameIfUnchanged,
} from "@/lib/messaging-games";
import { GAME_ENGINES } from "@/lib/game-engines";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Joue un coup.
 *
 * La route verifie ce qui est commun a tous les jeux — la partie est en cours, l'appelant
 * y joue — puis delegue au moteur du jeu, seul juge du tour et de la legalite du coup
 * (voir src/lib/game-engines.ts). Rien n'est cru du client.
 */
export const POST = withActor<RouteContext>(
  [...MESSAGING_ROLES],
  async ({ adminClient, profile, request }, context) => {
    const gameId = resolveGameId((await context.params).id);
    const row = await loadGameForActor(adminClient, profile.id, gameId);

    if (row.status !== "active") throw new ApiError("La partie n'est pas en cours.", 409);
    const seat = seatOf({ playerOneId: row.player_one_id, playerTwoId: row.player_two_id }, profile.id);
    if (!seat) throw new ApiError("Vous ne jouez pas cette partie.", 403);

    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;

    const outcome = await GAME_ENGINES[row.game_type].play({
      state: row.state,
      seat,
      payload,
      loadSecret: <T,>(target: GameSeat) => loadSecret<T>(adminClient, row.id, profileAtSeat(row, target)),
      saveSecret: (target, data) => saveSecret(adminClient, row.id, profileAtSeat(row, target), data),
    });

    const updated = await updateGameIfUnchanged(adminClient, row, {
      state: outcome.state,
      ...(outcome.finished
        ? { status: "finished" as const, result: outcome.result ?? null, result_reason: outcome.reason ?? null }
        : {}),
    });
    await postGameResult(adminClient, updated);
    return NextResponse.json({ game: await gameForActor(adminClient, updated, profile.id) });
  },
  { missingSession: "Session manquante." },
);
