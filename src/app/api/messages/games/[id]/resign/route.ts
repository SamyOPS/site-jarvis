import { NextResponse } from "next/server";

import { ApiError, withActor } from "@/lib/api-handler";
import { MESSAGING_ROLES } from "@/domain/messaging";
import { isMultiplayerGame, type MultiplayerTurnState } from "@/domain/games";
import { forfeitMultiplayer } from "@/lib/multiplayer-engines";
import {
  loadGameForActor,
  gameForActor,
  multiplayerContext,
  multiplayerFinish,
  postGameResult,
  resolveGameId,
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

    if (row.status === "finished") return NextResponse.json({ game: await gameForActor(adminClient, row, profile.id) });

    /*
      Jeu à plusieurs. En salle d'attente, le créateur annule l'invitation ; un autre
      joueur quitte simplement la table. En cours, le joueur sort du tour — la partie
      continue sans lui, et s'il ne reste qu'un joueur, celui-ci gagne.
    */
    if (isMultiplayerGame(row.game_type)) {
      const players = row.players ?? [];
      if (!players.includes(profile.id)) throw new ApiError("Vous ne jouez pas cette partie.", 403);

      if (row.status === "pending") {
        const updated =
          row.created_by === profile.id
            ? await updateGameIfUnchanged(adminClient, row, {
                status: "finished",
                result: null,
                result_reason: "cancelled",
              })
            : await updateGameIfUnchanged(adminClient, row, {
                players: players.filter((id) => id !== profile.id),
              });
        await postGameResult(adminClient, updated);
        return NextResponse.json({ game: await gameForActor(adminClient, updated, profile.id) });
      }

      const ctx = multiplayerContext(adminClient, row, profile.id, null);
      if ((row.state as MultiplayerTurnState).out?.includes(ctx.player)) {
        throw new ApiError("Vous avez déjà quitté cette partie.", 409);
      }
      const outcome = await forfeitMultiplayer(row.game_type, ctx);
      const updated = await updateGameIfUnchanged(adminClient, row, {
        state: outcome.state,
        ...(outcome.finished ? multiplayerFinish(row, outcome.winner ?? null, outcome.reason ?? null) : {}),
      });
      await postGameResult(adminClient, updated);
      return NextResponse.json({ game: await gameForActor(adminClient, updated, profile.id) });
    }

    const isPlayerOne = row.player_one_id === profile.id;
    const isPlayerTwo = row.player_two_id === profile.id;
    if (!isPlayerOne && !isPlayerTwo) throw new ApiError("Vous ne jouez pas cette partie.", 403);

    const pending = row.status === "pending";
    const updated = await updateGameIfUnchanged(adminClient, row, {
      status: "finished",
      result: pending ? null : isPlayerOne ? "player_two" : "player_one",
      result_reason: pending ? "cancelled" : "resign",
    });
    await postGameResult(adminClient, updated);
    return NextResponse.json({ game: await gameForActor(adminClient, updated, profile.id) });
  },
  { missingSession: "Session manquante." },
);
