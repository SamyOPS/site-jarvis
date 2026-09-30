import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiError, unwrap } from "@/lib/api-handler";
import { assertConversationParticipant } from "@/lib/messaging-access";
import {
  gameCatalogEntry,
  gameResultBody,
  type GameItem,
  type GameResultMeta,
  type GamePrivate,
  type GameResult,
  type GameSeat,
  type GameState,
  type GameStatus,
  type GameType,
} from "@/domain/games";
import { GAME_ENGINES } from "@/lib/game-engines";

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
  return GAME_ENGINES[type].initial();
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

export function profileAtSeat(row: GameRow, seat: GameSeat) {
  return seat === "player_one" ? row.player_one_id : row.player_two_id;
}

/** Donnees cachees d'un joueur, ou null s'il n'en a pas encore. */
export async function loadSecret<T>(
  adminClient: SupabaseClient,
  gameId: string,
  profileId: string | null,
): Promise<T | null> {
  if (!profileId) return null;
  const row = unwrap(
    await adminClient
      .from("game_secrets")
      .select("data")
      .eq("game_id", gameId)
      .eq("profile_id", profileId)
      .maybeSingle(),
  ) as { data: T } | null;
  return row?.data ?? null;
}

export async function saveSecret(
  adminClient: SupabaseClient,
  gameId: string,
  profileId: string | null,
  data: unknown,
) {
  if (!profileId) throw new ApiError("Joueur introuvable.", 409);
  unwrap(await adminClient.from("game_secrets").upsert({ game_id: gameId, profile_id: profileId, data }));
}

/**
 * La partie telle que l'appelant a le droit de la voir : la ligne publique, plus ses
 * propres donnees cachees. Celles de l'adversaire seulement une fois la partie terminee.
 */
export async function gameForActor(adminClient: SupabaseClient, row: GameRow, actorId: string) {
  if (!GAME_ENGINES[row.game_type].hasSecrets) return toGameItem(row);
  if (row.status !== "finished") {
    return toGameItem(row, { secret: await loadSecret(adminClient, row.id, actorId) });
  }

  // Les deux lectures sont independantes : en parallele, un aller-retour de moins.
  const opponentId = row.player_one_id === actorId ? row.player_two_id : row.player_one_id;
  const [secret, opponentSecret] = await Promise.all([
    loadSecret(adminClient, row.id, actorId),
    loadSecret(adminClient, row.id, opponentId),
  ]);
  return toGameItem(row, { secret, opponentSecret });
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

function winnerOf(row: Pick<GameRow, "result" | "player_one_id" | "player_two_id">) {
  if (row.result === "player_one") return row.player_one_id;
  if (row.result === "player_two") return row.player_two_id;
  return null;
}

/**
 * Poste le résultat d'une partie qui vient de se terminer, avec le score cumulé des deux
 * participants à ce jeu dans cette conversation.
 *
 * Le score est RECALCULÉ depuis l'historique des parties plutôt que tenu dans un
 * compteur : aucune valeur à maintenir, donc rien qui puisse diverger des parties
 * réellement jouées.
 *
 * Le message n'a pas d'auteur et naît marqué comme notifié : ce n'est pas un message à
 * lire, il ne doit ni compter comme non lu ni déclencher de rappel par e-mail.
 *
 * Un échec est journalisé sans remonter : la partie est déjà close, refuser la réponse au
 * joueur pour un message de fil manquant serait pire que le message manquant.
 */
export async function postGameResult(adminClient: SupabaseClient, row: GameRow) {
  if (row.status !== "finished") return;
  const entry = gameCatalogEntry(row.game_type);
  if (!entry) return;

  try {
    const history = unwrap(
      await adminClient
        .from("games")
        .select("result,player_one_id,player_two_id")
        .eq("conversation_id", row.conversation_id)
        .eq("game_type", row.game_type)
        .eq("status", "finished")
        .not("result", "is", null),
    ) as Pick<GameRow, "result" | "player_one_id" | "player_two_id">[] | null;

    const wins: Record<string, number> = {};
    let draws = 0;
    for (const game of history ?? []) {
      if (game.result === "draw") {
        draws += 1;
        continue;
      }
      const winner = winnerOf(game);
      if (winner) wins[winner] = (wins[winner] ?? 0) + 1;
    }

    const cancelled = row.result === null;
    const meta: GameResultMeta = {
      gameType: row.game_type,
      outcome: cancelled ? "cancelled" : row.result === "draw" ? "draw" : "win",
      winnerId: winnerOf(row),
      reason: row.result_reason,
      players: [row.player_one_id, row.player_two_id],
      wins,
      draws,
    };

    unwrap(
      await adminClient.from("messages").insert({
        conversation_id: row.conversation_id,
        sender_id: null,
        body: gameResultBody(entry, cancelled),
        game_id: row.id,
        kind: "game_result",
        meta,
        email_notified_at: new Date().toISOString(),
      }),
    );
  } catch (error) {
    console.error("[jeux] resultat non poste", row.id, error);
  }
}
