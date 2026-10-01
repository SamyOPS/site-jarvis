import { NextResponse } from "next/server";

import { ApiError, unwrap, withActor } from "@/lib/api-handler";
import { MESSAGING_ROLES, displayContactName } from "@/domain/messaging";
import { loadGroupForActor, postSystemMessage } from "@/lib/messaging-groups";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Quitte un groupe.
 *
 * Le createur peut partir lui aussi : la gestion passe alors au plus ancien membre
 * restant, sans quoi le groupe ne serait plus administrable par personne. Le dernier a
 * partir emporte le groupe avec lui — il n'y a plus personne pour le lire.
 */
export const POST = withActor<RouteContext>(
  [...MESSAGING_ROLES],
  async ({ adminClient, profile }, context) => {
    const { id } = await context.params;
    const conversationId = String(id ?? "").trim();
    if (!conversationId) throw new ApiError("Groupe introuvable.", 400);

    const group = await loadGroupForActor(adminClient, profile.id, conversationId);
    const remaining = group.memberIds.filter((memberId) => memberId !== profile.id);

    if (!remaining.length) {
      unwrap(await adminClient.from("conversations").delete().eq("id", conversationId));
      return NextResponse.json({ success: true });
    }

    unwrap(
      await adminClient
        .from("conversation_participants")
        .delete()
        .eq("conversation_id", conversationId)
        .eq("profile_id", profile.id),
    );

    if (group.created_by === profile.id) {
      // `memberIds` est trie par date d'arrivee : le premier restant est le plus ancien.
      unwrap(
        await adminClient
          .from("conversations")
          .update({ created_by: remaining[0] })
          .eq("id", conversationId),
      );
    }

    await postSystemMessage(adminClient, conversationId, `${displayContactName(profile)} a quitté le groupe`);

    return NextResponse.json({ success: true });
  },
  { missingSession: "Session manquante." },
);
