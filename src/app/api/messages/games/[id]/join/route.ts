import { NextResponse } from "next/server";

import { ApiError, withActor } from "@/lib/api-handler";
import { MESSAGING_ROLES } from "@/domain/messaging";
import { gameCatalogEntry, isMultiplayerGame, playerRange } from "@/domain/games";
import {
  gameForActor,
  loadGameForActor,
  resolveGameId,
  saveSecret,
  startMultiplayerGame,
  updateGameIfUnchanged,
} from "@/lib/messaging-games";
import { GAME_ENGINES } from "@/lib/game-engines";

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

    /*
      Jeu à plusieurs : on s'assoit dans la salle d'attente. La partie démarre d'elle-même
      quand la table est pleine ; avant, c'est le créateur qui la lance (route `start`).
      Ouvrir une partie déjà lancée, ou pleine, la montre simplement — en spectateur.
    */
    if (isMultiplayerGame(row.game_type)) {
      const players = row.players ?? [];
      const { max } = playerRange(gameCatalogEntry(row.game_type)!);
      if (players.includes(profile.id) || row.status !== "pending" || players.length >= max) {
        return NextResponse.json({ game: await gameForActor(adminClient, row, profile.id) });
      }
      const seated = [...players, profile.id];
      const updated =
        seated.length === max
          ? await startMultiplayerGame(adminClient, row, seated)
          : await updateGameIfUnchanged(adminClient, row, { players: seated });
      return NextResponse.json({ game: await gameForActor(adminClient, updated, profile.id) });
    }

    const seated = row.player_one_id === profile.id || row.player_two_id === profile.id;
    if (seated || row.status !== "pending") {
      return NextResponse.json({ game: await gameForActor(adminClient, row, profile.id) });
    }
    if (row.player_two_id) throw new ApiError("La partie est déjà complète.", 409);

    // Secrets tires au sort (personnages de Qui est-ce ?) : distribues AVANT de lancer la
    // partie, pour qu'aucun coup ne puisse etre joue sans eux.
    const engine = GAME_ENGINES[row.game_type];
    if (engine.onStart) {
      const seats = { player_one: row.player_one_id, player_two: profile.id };
      await engine.onStart({
        saveSecret: (seat, data) => saveSecret(adminClient, row.id, seats[seat], data),
      });
    }

    const updated = await updateGameIfUnchanged(adminClient, row, {
      player_two_id: profile.id,
      status: "active",
    });
    return NextResponse.json({ game: await gameForActor(adminClient, updated, profile.id) });
  },
  { missingSession: "Session manquante." },
);
