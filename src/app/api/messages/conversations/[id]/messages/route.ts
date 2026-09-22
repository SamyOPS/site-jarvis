import { NextResponse } from "next/server";

import { ApiError, unwrap, withActor } from "@/lib/api-handler";
import { MESSAGING_ROLES, MESSAGE_MAX_LENGTH, type MessageItem } from "@/domain/messaging";
import { assertConversationParticipant } from "@/lib/messaging-access";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const SESSION = { missingSession: "Session manquante." };

/** Nombre de messages rendus par page. Le fil se remonte par paquets. */
const PAGE_SIZE = 50;

async function resolveConversationId(context: RouteContext) {
  const { id } = await context.params;
  const conversationId = String(id ?? "").trim();
  if (!conversationId) {
    throw new ApiError("Conversation introuvable.", 400);
  }
  return conversationId;
}

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  body: string;
  created_at: string;
};

function toItem(row: MessageRow): MessageItem {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

/**
 * Fil d'une conversation, du plus ancien au plus recent.
 *
 * La base est interrogee dans l'ordre INVERSE — c'est ce que sait faire l'index, et c'est
 * ce qui permet de prendre les 50 DERNIERS messages. La liste n'est remise a l'endroit
 * qu'au moment de rendre la reponse.
 *
 * `before` remonte dans l'historique : passer la date du plus ancien message affiche rend
 * les 50 precedents.
 */
export const GET = withActor<RouteContext>(
  [...MESSAGING_ROLES],
  async ({ adminClient, profile, request }, context) => {
    const conversationId = await resolveConversationId(context);
    await assertConversationParticipant(adminClient, profile.id, conversationId);

    const before = new URL(request.url).searchParams.get("before");

    let query = adminClient
      .from("messages")
      .select("id,conversation_id,sender_id,body,created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (before) {
      query = query.lt("created_at", before);
    }

    const rows = (unwrap(await query) as MessageRow[] | null) ?? [];

    return NextResponse.json({
      items: rows.map(toItem).reverse(),
      hasMore: rows.length === PAGE_SIZE,
    });
  },
  SESSION,
);

/**
 * Envoie un message.
 *
 * Aucun controle d'habilitation au-dela de la participation : le droit d'ecrire a
 * quelqu'un se verifie a l'OUVERTURE du fil. Le reverifier ici rendrait une conversation
 * muette du jour ou une affectation change, en plein echange.
 */
export const POST = withActor<RouteContext>(
  [...MESSAGING_ROLES],
  async ({ adminClient, profile, request }, context) => {
    const conversationId = await resolveConversationId(context);
    await assertConversationParticipant(adminClient, profile.id, conversationId);

    const payload = (await request.json().catch(() => null)) as { body?: unknown } | null;
    const text = typeof payload?.body === "string" ? payload.body.trim() : "";
    if (!text) {
      throw new ApiError("Message vide.", 400);
    }
    if (text.length > MESSAGE_MAX_LENGTH) {
      throw new ApiError(`Message trop long (${MESSAGE_MAX_LENGTH} caracteres maximum).`, 400);
    }

    const row = unwrap(
      await adminClient
        .from("messages")
        .insert({ conversation_id: conversationId, sender_id: profile.id, body: text })
        .select("id,conversation_id,sender_id,body,created_at")
        .single(),
    ) as MessageRow;

    /*
      La marque de lecture de l'auteur n'est VOLONTAIREMENT pas avancee ici. Le decompte
      des non-lus ecarte deja les messages dont on est l'auteur (`messaging_overview`) :
      la deplacer ne servirait a rien pour soi, et marquerait au passage comme lus les
      messages recus entre-temps et jamais affiches. Seule l'ouverture du fil vaut lecture.
    */
    return NextResponse.json({ message: toItem(row) });
  },
  SESSION,
);
