import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiError, unwrap } from "@/lib/api-handler";
import { assertConversationParticipant } from "@/lib/messaging-access";
import type { ChessState, GameItem, GameResult, GameStatus, GameType } from "@/domain/games";

/**
 * Accès aux parties de la messagerie, côté serveur.
 *
 * Voir une partie suppose de participer à sa conversation — la même règle que pour lire
 * le fil, et pour la même raison : l'invitation y a été postée.
 */

export const GAME_COLUMNS =
  "id,conversation_id,game_type,status,created_by,player_one_id,player_two_id,state,result,result_reason,updated_at";

export type GameRow = {
  id: string;
  conversation_id: string;
  game_type: GameType;
  status: GameStatus;
  created_by: string | null;
  player_one_id: string | null;
  player_two_id: string | null;
  state: ChessState;
  result: GameResult | null;
  result_reason: string | null;
  updated_at: string;
};

export function toGameItem(row: GameRow): GameItem {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    gameType: row.game_type,
    status: row.status,
    createdBy: row.created_by,
    playerOneId: row.player_one_id,
    playerTwoId: row.player_two_id,
    state: row.state,
    result: row.result,
    resultReason: row.result_reason,
    updatedAt: row.updated_at,
  };
}

/** Charge une partie et vérifie que l'appelant participe à sa conversation. */
export async function loadGameForActor(
  adminClient: SupabaseClient,
  actorId: string,
  gameId: string,
) {
  const row = unwrap(
    await adminClient.from("games").select(GAME_COLUMNS).eq("id", gameId).maybeSingle(),
  ) as GameRow | null;
  // Même réponse qu'une partie inexistante : ne pas confirmer l'existence d'une partie
  // à quelqu'un qui n'y a pas accès.
  if (!row) throw new ApiError("Partie introuvable.", 404);
  await assertConversationParticipant(adminClient, actorId, row.conversation_id).catch(() => {
    throw new ApiError("Partie introuvable.", 404);
  });
  return row;
}

/**
 * Écrit une nouvelle version de la partie, à condition qu'elle n'ait pas bougé depuis
 * sa lecture. Deux coups envoyés en même temps (double clic, deux onglets) ne doivent
 * pas s'appliquer tous les deux sur la même position : le second échoue en 409.
 */
export async function updateGameIfUnchanged(
  adminClient: SupabaseClient,
  current: GameRow,
  patch: Partial<Omit<GameRow, "id" | "conversation_id" | "updated_at">>,
) {
  const row = unwrap(
    await adminClient
      .from("games")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", current.id)
      .eq("updated_at", current.updated_at)
      .select(GAME_COLUMNS)
      .maybeSingle(),
  ) as GameRow | null;
  if (!row) throw new ApiError("La partie a changé entre-temps, réessayez.", 409);
  return row;
}

export function resolveGameId(value: unknown) {
  const gameId = String(value ?? "").trim();
  if (!gameId) throw new ApiError("Partie introuvable.", 400);
  return gameId;
}
