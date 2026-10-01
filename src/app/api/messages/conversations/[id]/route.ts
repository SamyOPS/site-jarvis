import { NextResponse } from "next/server";

import { ApiError, unwrap, withActor } from "@/lib/api-handler";
import { MESSAGING_ROLES, displayContactName } from "@/domain/messaging";
import { assertConversationParticipant } from "@/lib/messaging-access";
import {
  assertCanAddMembers,
  assertGroupSize,
  joinNames,
  loadGroupForActor,
  normalizeGroupTitle,
  normalizeIds,
  postSystemMessage,
} from "@/lib/messaging-groups";

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

/**
 * Modifie un groupe : nom, membres ajoutes, membres retires. Reserve a son createur.
 *
 * Les trois changements sont independants et facultatifs ; chacun laisse sa trace dans le
 * fil, pour que les membres sachent qui a fait quoi.
 */
export const PATCH = withActor<RouteContext>(
  [...MESSAGING_ROLES],
  async ({ adminClient, profile, request }, context) => {
    const { id } = await context.params;
    const conversationId = String(id ?? "").trim();
    if (!conversationId) throw new ApiError("Groupe introuvable.", 400);

    const group = await loadGroupForActor(adminClient, profile.id, conversationId);
    if (group.created_by !== profile.id) {
      throw new ApiError("Seul le créateur du groupe peut le modifier.", 403);
    }

    const body = (await request.json().catch(() => null)) as
      | { title?: unknown; addMemberIds?: unknown; removeMemberIds?: unknown }
      | null;
    const actorName = displayContactName(profile);

    const title = body?.title === undefined ? null : normalizeGroupTitle(body.title);
    const toAdd = normalizeIds(body?.addMemberIds).filter((memberId) => !group.memberIds.includes(memberId));
    // Le createur ne se retire pas : il quitte le groupe, ce qui transmet la gestion.
    const toRemove = normalizeIds(body?.removeMemberIds).filter(
      (memberId) => memberId !== profile.id && group.memberIds.includes(memberId),
    );

    assertGroupSize(group.memberIds.length + toAdd.length - toRemove.length);
    const added = await assertCanAddMembers(adminClient, profile, toAdd);

    if (title && title !== group.title) {
      unwrap(await adminClient.from("conversations").update({ title }).eq("id", conversationId));
      await postSystemMessage(adminClient, conversationId, `${actorName} a renommé le groupe en « ${title} »`);
    }

    if (added.length) {
      unwrap(
        await adminClient.from("conversation_participants").insert(
          added.map((contact) => ({ conversation_id: conversationId, profile_id: contact.id })),
        ),
      );
      await postSystemMessage(
        adminClient,
        conversationId,
        `${actorName} a ajouté ${joinNames(added.map((contact) => contact.name))}`,
      );
    }

    if (toRemove.length) {
      const removed = unwrap(
        await adminClient.from("profiles").select("id,full_name,email").in("id", toRemove),
      ) as { id: string; full_name: string | null; email: string }[] | null;
      unwrap(
        await adminClient
          .from("conversation_participants")
          .delete()
          .eq("conversation_id", conversationId)
          .in("profile_id", toRemove),
      );
      await postSystemMessage(
        adminClient,
        conversationId,
        `${actorName} a retiré ${joinNames((removed ?? []).map((row) => displayContactName(row)))}`,
      );
    }

    return NextResponse.json({ success: true });
  },
  { missingSession: "Session manquante." },
);
