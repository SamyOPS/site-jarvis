import { NextResponse } from "next/server";

import { ApiError, unwrap, withActor } from "@/lib/api-handler";
import { MESSAGING_ROLES } from "@/domain/messaging";
import { assertConversationParticipant } from "@/lib/messaging-access";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Supprime la discussion POUR L'APPELANT seulement.
 *
 * Rien n'est efface : l'autre participant garde le fil entier. L'appelant ne voit plus
 * rien d'anterieur a maintenant, et la discussion quitte sa liste jusqu'au prochain
 * message (voir supabase/migrations/20261001000000_messaging_clear_conversation.sql).
 *
 * La marque de lecture avance en meme temps : un message non lu efface ne doit ni rester
 * compte, ni declencher de rappel par e-mail.
 */
export const DELETE = withActor<RouteContext>(
  [...MESSAGING_ROLES],
  async ({ adminClient, profile }, context) => {
    const { id } = await context.params;
    const conversationId = String(id ?? "").trim();
    if (!conversationId) {
      throw new ApiError("Conversation introuvable.", 400);
    }

    await assertConversationParticipant(adminClient, profile.id, conversationId);

    const now = new Date().toISOString();
    unwrap(
      await adminClient
        .from("conversation_participants")
        .update({ cleared_at: now, last_read_at: now })
        .eq("conversation_id", conversationId)
        .eq("profile_id", profile.id),
    );

    return NextResponse.json({ success: true });
  },
  { missingSession: "Session manquante." },
);
