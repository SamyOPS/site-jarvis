import { NextResponse } from "next/server";

import { ApiError, unwrap, withActor } from "@/lib/api-handler";
import {
  MESSAGING_ROLES,
  buildPairKey,
  displayContactName,
  messagePreview,
  type ConversationSummary,
  type MessagingContact,
} from "@/domain/messaging";
import { assertCanStartConversation } from "@/lib/messaging-access";

export const runtime = "nodejs";

const SESSION = { missingSession: "Session manquante." };

type OverviewRow = {
  conversation_id: string;
  other_profile_id: string | null;
  last_message_body: string | null;
  last_message_at: string;
  last_message_sender_id: string | null;
  unread_count: number | string;
};

/**
 * Liste des conversations de l'utilisateur, la plus recente en tete.
 *
 * Le gros du travail est fait par la fonction `messaging_overview` : autre participant,
 * dernier message et non-lus en une seule requete. Il ne reste ici qu'a resoudre les
 * noms.
 */
export const GET = withActor(
  [...MESSAGING_ROLES],
  async ({ adminClient, profile }) => {
    const rows = unwrap(
      await adminClient.rpc("messaging_overview", { p_profile_id: profile.id }),
    ) as OverviewRow[] | null;

    const overview = rows ?? [];
    const contactIds = Array.from(
      new Set(
        overview
          .map((row) => row.other_profile_id)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    const contactsById = new Map<string, MessagingContact>();
    if (contactIds.length) {
      const profiles = unwrap(
        await adminClient
          .from("profiles")
          .select("id,full_name,email,role")
          .in("id", contactIds),
      ) as { id: string; full_name: string | null; email: string; role: string | null }[] | null;

      for (const row of profiles ?? []) {
        contactsById.set(row.id, {
          id: row.id,
          name: displayContactName(row),
          email: row.email,
          role: row.role,
        });
      }
    }

    const items: ConversationSummary[] = overview.map((row) => ({
      id: row.conversation_id,
      contact: row.other_profile_id ? (contactsById.get(row.other_profile_id) ?? null) : null,
      lastMessageAt: row.last_message_at,
      lastMessagePreview: row.last_message_body ? messagePreview(row.last_message_body) : null,
      lastMessageFromMe: row.last_message_sender_id === profile.id,
      unreadCount: Number(row.unread_count) || 0,
    }));

    return NextResponse.json({
      items,
      unreadTotal: items.reduce((total, item) => total + item.unreadCount, 0),
    });
  },
  SESSION,
);

/**
 * Ouvre la conversation avec un destinataire, ou rend celle qui existe deja.
 *
 * Idempotent par construction : la cle de binome est unique en base. Deux appels
 * simultanes ne creent donc jamais deux fils — le second insert echoue sur la contrainte,
 * et l'on relit la ligne gagnante.
 */
export const POST = withActor(
  [...MESSAGING_ROLES],
  async ({ adminClient, profile, request }) => {
    const body = (await request.json().catch(() => null)) as { targetId?: unknown } | null;
    const targetId = typeof body?.targetId === "string" ? body.targetId.trim() : "";
    if (!targetId) {
      throw new ApiError("Destinataire manquant.", 400);
    }

    const contact = await assertCanStartConversation(adminClient, profile, targetId);
    const pairKey = buildPairKey(profile.id, targetId);

    const existing = unwrap(
      await adminClient
        .from("conversations")
        .select("id")
        .eq("pair_key", pairKey)
        .maybeSingle(),
    ) as { id: string } | null;

    if (existing) {
      return NextResponse.json({ conversation: { id: existing.id, contact } });
    }

    const created = await adminClient
      .from("conversations")
      .insert({ pair_key: pairKey, created_by: profile.id })
      .select("id")
      .single();

    if (created.error) {
      // 23505 = violation d'unicite : quelqu'un a ouvert le meme fil entre-temps. Ce
      // n'est pas une erreur du point de vue de l'appelant, la conversation existe.
      if (created.error.code === "23505") {
        const raced = unwrap(
          await adminClient
            .from("conversations")
            .select("id")
            .eq("pair_key", pairKey)
            .single(),
        ) as { id: string };
        return NextResponse.json({ conversation: { id: raced.id, contact } });
      }
      throw new ApiError(created.error.message, 400);
    }

    const conversationId = created.data.id;

    const participants = await adminClient.from("conversation_participants").insert([
      { conversation_id: conversationId, profile_id: profile.id },
      { conversation_id: conversationId, profile_id: targetId },
    ]);

    if (participants.error) {
      // Une conversation sans participants n'est atteignable par personne et fausserait
      // la cle de binome pour les tentatives suivantes : on la retire.
      await adminClient.from("conversations").delete().eq("id", conversationId);
      throw new ApiError(participants.error.message, 400);
    }

    return NextResponse.json({ conversation: { id: conversationId, contact } });
  },
  SESSION,
);
