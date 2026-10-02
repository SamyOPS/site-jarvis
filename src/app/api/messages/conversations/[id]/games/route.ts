import { NextResponse } from "next/server";

import { ApiError, unwrap, withActor } from "@/lib/api-handler";
import { MESSAGING_ROLES } from "@/domain/messaging";
import { gameCatalogEntry, gameInvitationBody, isMultiplayerGame, playerRange } from "@/domain/games";
import {
  assertConversationParticipant,
  MESSAGE_COLUMNS,
  toMessageItem,
  type MessageRow,
} from "@/lib/messaging-access";
import { GAME_COLUMNS, initialGameState, toGameItem, type GameRow } from "@/lib/messaging-games";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Propose une partie dans une conversation.
 *
 * Crée la partie PUIS le message d'invitation qui la désigne : c'est ce message qui la
 * fait apparaître chez l'autre participant, par le même flux Realtime que les messages
 * ordinaires. Le créateur prend la première place (les blancs aux échecs, le premier tir à la
 * bataille navale).
 */
export const POST = withActor<RouteContext>(
  [...MESSAGING_ROLES],
  async ({ adminClient, profile, request }, context) => {
    const { id } = await context.params;
    const conversationId = String(id ?? "").trim();
    if (!conversationId) throw new ApiError("Conversation introuvable.", 400);
    await assertConversationParticipant(adminClient, profile.id, conversationId);

    const payload = (await request.json().catch(() => null)) as { gameType?: unknown } | null;
    const entry = gameCatalogEntry(typeof payload?.gameType === "string" ? payload.gameType : null);
    if (!entry) throw new ApiError("Jeu inconnu.", 400);

    /*
      Jeu à plusieurs : la conversation doit compter assez de membres pour le jouer. Le
      créateur est le premier assis ; les autres rejoignent en ouvrant l'invitation.
    */
    const multiplayer = isMultiplayerGame(entry.type);
    if (multiplayer) {
      const { count } = await adminClient
        .from("conversation_participants")
        .select("profile_id", { count: "exact", head: true })
        .eq("conversation_id", conversationId);
      const { min } = playerRange(entry);
      if ((count ?? 0) < min) {
        throw new ApiError(`${entry.name} se joue à ${min} au moins : invitez-le dans un groupe.`, 400);
      }
    }

    const game = unwrap(
      await adminClient
        .from("games")
        .insert({
          conversation_id: conversationId,
          game_type: entry.type,
          created_by: profile.id,
          ...(multiplayer ? { players: [profile.id] } : { player_one_id: profile.id }),
          state: initialGameState(entry.type),
        })
        .select(GAME_COLUMNS)
        .single(),
    ) as GameRow;

    const message = unwrap(
      await adminClient
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: profile.id,
          body: gameInvitationBody(entry),
          game_id: game.id,
        })
        .select(MESSAGE_COLUMNS)
        .single(),
    ) as MessageRow;

    return NextResponse.json({ game: toGameItem(game), message: toMessageItem(message) });
  },
  { missingSession: "Session manquante." },
);
