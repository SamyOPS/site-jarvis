import { NextResponse } from "next/server";

import { ApiError, unwrap, withActor } from "@/lib/api-handler";
import { MESSAGING_ROLES, displayContactName } from "@/domain/messaging";
import {
  assertCanAddMembers,
  assertGroupSize,
  normalizeGroupTitle,
  normalizeIds,
  postSystemMessage,
} from "@/lib/messaging-groups";

export const runtime = "nodejs";

/**
 * Cree un groupe de discussion.
 *
 * Membres pris dans l'annuaire du createur (voir `assertCanAddMembers`). Au moins un
 * autre que lui : un groupe a soi seul n'est pas une discussion.
 */
export const POST = withActor(
  [...MESSAGING_ROLES],
  async ({ adminClient, profile, request }) => {
    const body = (await request.json().catch(() => null)) as
      | { title?: unknown; memberIds?: unknown }
      | null;

    const title = normalizeGroupTitle(body?.title);
    const memberIds = normalizeIds(body?.memberIds).filter((id) => id !== profile.id);
    if (!memberIds.length) throw new ApiError("Ajoutez au moins un membre.", 400);
    assertGroupSize(memberIds.length + 1);

    await assertCanAddMembers(adminClient, profile, memberIds);

    const conversation = unwrap(
      await adminClient
        .from("conversations")
        .insert({ is_group: true, title, created_by: profile.id })
        .select("id")
        .single(),
    ) as { id: string };

    const participants = await adminClient.from("conversation_participants").insert(
      [profile.id, ...memberIds].map((id) => ({
        conversation_id: conversation.id,
        profile_id: id,
      })),
    );
    if (participants.error) {
      // Un groupe sans membres n'est atteignable par personne : on le retire.
      await adminClient.from("conversations").delete().eq("id", conversation.id);
      throw new ApiError(participants.error.message, 400);
    }

    await postSystemMessage(
      adminClient,
      conversation.id,
      `${displayContactName(profile)} a créé le groupe « ${title} »`,
    );

    return NextResponse.json({ conversation: { id: conversation.id } });
  },
  { missingSession: "Session manquante." },
);
