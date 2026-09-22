import { NextResponse } from "next/server";

import { getServerSupabaseClients } from "@/lib/server-supabase";
import { displayContactName } from "@/domain/messaging";
import { notifyUnreadMessages } from "@/lib/email";

export const runtime = "nodejs";

/**
 * Rappel par e-mail des messages non lus.
 *
 * DECLENCHEMENT : cette route n'est pas appelee par l'application. Elle attend un
 * planificateur externe (cron Vercel, GitHub Actions, planificateur de l'hebergeur) qui
 * la frappe toutes les quinze minutes environ avec le secret partage.
 *
 * ELLE N'EST PAS AUTHENTIFIEE PAR UNE SESSION : il n'y a pas d'utilisateur derriere un
 * cron. Le secret `MESSAGING_CRON_SECRET` tient lieu d'autorisation. Sans lui en
 * environnement, la route refuse de s'executer plutot que de s'ouvrir — une tache qui
 * envoie des e-mails ne doit jamais etre joignable par defaut.
 */

/**
 * Delai de grace avant le rappel.
 *
 * Un message lu dans la minute n'a pas a declencher un e-mail. Ce delai laisse le temps a
 * une conversation en cours de se derouler sans remplir les boites aux lettres.
 */
const GRACE_MINUTES = 15;

/** Plafond par passage. Borne le travail d'une execution, et donc sa duree. */
const BATCH_SIZE = 500;

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  created_at: string;
};

type ParticipantRow = {
  conversation_id: string;
  profile_id: string;
  last_read_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string;
  role: string | null;
};

function isAuthorized(request: Request) {
  const secret = process.env.MESSAGING_CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  return bearer === secret || request.headers.get("x-cron-secret") === secret;
}

export async function POST(request: Request) {
  if (!process.env.MESSAGING_CRON_SECRET) {
    return NextResponse.json(
      { error: "MESSAGING_CRON_SECRET absent : tache desactivee." },
      { status: 503 },
    );
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  const { adminClient } = getServerSupabaseClients();
  const cutoff = new Date(Date.now() - GRACE_MINUTES * 60_000).toISOString();

  const { data: messageRows, error: messagesError } = await adminClient
    .from("messages")
    .select("id,conversation_id,sender_id,created_at")
    .is("email_notified_at", null)
    .lt("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (messagesError) {
    return NextResponse.json({ error: messagesError.message }, { status: 400 });
  }

  const messages = (messageRows ?? []) as MessageRow[];
  if (!messages.length) {
    return NextResponse.json({ scanned: 0, notified: 0, recipients: 0 });
  }

  const conversationIds = Array.from(new Set(messages.map((row) => row.conversation_id)));
  const { data: participantRows, error: participantsError } = await adminClient
    .from("conversation_participants")
    .select("conversation_id,profile_id,last_read_at")
    .in("conversation_id", conversationIds);

  if (participantsError) {
    return NextResponse.json({ error: participantsError.message }, { status: 400 });
  }

  const participantsByConversation = new Map<string, ParticipantRow[]>();
  for (const row of (participantRows ?? []) as ParticipantRow[]) {
    participantsByConversation.set(row.conversation_id, [
      ...(participantsByConversation.get(row.conversation_id) ?? []),
      row,
    ]);
  }

  /*
    Un message ne donne lieu a un rappel que s'il est ENCORE non lu au moment du passage.
    Les autres sont simplement marques comme traites : sans cela, chaque execution les
    reexaminerait indefiniment.
  */
  type Pending = { senderId: string | null; messageIds: string[] };
  const pendingByRecipient = new Map<string, Pending[]>();
  const alreadyReadIds: string[] = [];

  for (const message of messages) {
    const participants = participantsByConversation.get(message.conversation_id) ?? [];
    let stillUnreadForSomeone = false;

    for (const participant of participants) {
      if (participant.profile_id === message.sender_id) continue;
      if (new Date(participant.last_read_at) >= new Date(message.created_at)) continue;

      stillUnreadForSomeone = true;
      const entries = pendingByRecipient.get(participant.profile_id) ?? [];
      const existing = entries.find((entry) => entry.senderId === message.sender_id);
      if (existing) {
        existing.messageIds.push(message.id);
      } else {
        entries.push({ senderId: message.sender_id, messageIds: [message.id] });
      }
      pendingByRecipient.set(participant.profile_id, entries);
    }

    if (!stillUnreadForSomeone) {
      alreadyReadIds.push(message.id);
    }
  }

  const profileIds = Array.from(
    new Set([
      ...pendingByRecipient.keys(),
      ...messages
        .map((row) => row.sender_id)
        .filter((value): value is string => Boolean(value)),
    ]),
  );

  const profilesById = new Map<string, ProfileRow>();
  if (profileIds.length) {
    const { data: profileRows, error: profilesError } = await adminClient
      .from("profiles")
      .select("id,full_name,email,role")
      .in("id", profileIds);
    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 400 });
    }
    for (const row of (profileRows ?? []) as ProfileRow[]) {
      profilesById.set(row.id, row);
    }
  }

  const notifiedIds: string[] = [...alreadyReadIds];
  let skipped = 0;
  let recipients = 0;

  for (const [recipientId, entries] of pendingByRecipient) {
    const recipient = profilesById.get(recipientId);
    const messageIds = entries.flatMap((entry) => entry.messageIds);

    // Destinataire sans e-mail exploitable : rien a envoyer, et rien a reessayer non plus.
    if (!recipient?.email) {
      notifiedIds.push(...messageIds);
      continue;
    }

    const senders = entries
      .map((entry) => ({
        name: entry.senderId
          ? displayContactName(profilesById.get(entry.senderId))
          : "Utilisateur",
        count: entry.messageIds.length,
      }))
      .sort((left, right) => right.count - left.count);

    const result = await notifyUnreadMessages({
      recipientEmail: recipient.email,
      recipientName: recipient.full_name,
      recipientRole: recipient.role,
      senders,
      totalCount: messageIds.length,
    });

    /*
      Marque SEULEMENT ce qui est parti. Un envoi en echec — ou ignore faute de
      configuration SMTP — laisse les messages non marques : ils repasseront au prochain
      cycle. Les marquer quand meme reviendrait a perdre le rappel sans trace.
    */
    if (result.ok) {
      notifiedIds.push(...messageIds);
      recipients += 1;
    } else {
      skipped += 1;
    }
  }

  if (notifiedIds.length) {
    const { error: updateError } = await adminClient
      .from("messages")
      .update({ email_notified_at: new Date().toISOString() })
      .in("id", notifiedIds);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }
  }

  return NextResponse.json({
    scanned: messages.length,
    notified: notifiedIds.length,
    recipients,
    skipped,
  });
}
