import { NextResponse } from "next/server";

import { ApiError, unwrap, withActor } from "@/lib/api-handler";
import { MESSAGING_ROLES } from "@/domain/messaging";
import { assertConversationParticipant } from "@/lib/messaging-access";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/** Marque la conversation comme lue jusqu'a maintenant. */
export const POST = withActor<RouteContext>(
  [...MESSAGING_ROLES],
  async ({ adminClient, profile }, context) => {
    const { id } = await context.params;
    const conversationId = String(id ?? "").trim();
    if (!conversationId) {
      throw new ApiError("Conversation introuvable.", 400);
    }

    await assertConversationParticipant(adminClient, profile.id, conversationId);

    unwrap(
      await adminClient
        .from("conversation_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("profile_id", profile.id),
    );

    return NextResponse.json({ success: true });
  },
  { missingSession: "Session manquante." },
);
