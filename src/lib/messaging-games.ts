import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiError, unwrap } from "@/lib/api-handler";
import { assertConversationParticipant } from "@/lib/messaging-access";
import type {
  BattleshipShip,
  GameItem,
  GamePrivate,
  GameResult,
  GameState,
  GameStatus,
  GameType,
} from "@/domain/games";
import { initialChessState } from "@/lib/chess-game";
import { initialBattleshipState } from "@/lib/battleship-game";

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
  state: GameState;
  result: GameResult | null;
  result_reason: string | null;
  updated_at: string;
};

export function initialGameState(type: GameType): GameState {
  return type === "battleship" ? initialBattleshipState() : initialChessState();
}

export function toGameItem(row: GameRow, privateData?: GamePrivate): GameItem {
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
    ...(privateData ? { private: privateData } : {}),
  };
}

/** Flotte secrète d'un joueur, ou null s'il ne l'a pas encore validée. */
export async function loadShips(
  adminClient: SupabaseClient,
  gameId: string,
  profileId: string | null,
): Promise<BattleshipShip[] | null> {
  if (!profileId) return null;
  const row = unwrap(
    await adminClient
      .from("game_secrets")
      .select("data")
      .eq("game_id", gameId)
      .eq("profile_id", profileId)
      .maybeSingle(),
  ) as { data: { ships?: BattleshipShip[] } } | null;
  return row?.data?.ships ?? null;
}

/**
 * La partie telle que l'appelant a le droit de la voir : la ligne publique, plus ses
 * propres données cachées. Jamais celles de l'adversaire.
 */
export async function gameForActor(adminClient: SupabaseClient, row: GameRow, actorId: string) {
  if (row.game_type !== "battleship") return toGameItem(row);
  const ships = await loadShips(adminClient, row.id, actorId);
  if (row.status !== "finished") return toGameItem(row, { ships });

  const opponentId = row.player_one_id === actorId ? row.player_two_id : row.player_one_id;
  return toGameItem(row, { ships, opponentShips: await loadShips(adminClient, row.id, opponentId) });
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
