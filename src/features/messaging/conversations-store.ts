"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";

import { createAuthorizedFetch } from "@/lib/dashboard-api";
import { browserSupabase } from "@/lib/supabase-browser";
import { safeGetClientSession } from "@/lib/client-auth";
import type { ConversationSummary, MessageItem } from "@/domain/messaging";

/**
 * Liste des conversations, PARTAGÉE par tout l'onglet.
 *
 * POURQUOI UN STORE. Le panneau Messages de la barre supérieure et la page Messagerie
 * affichent la même liste. Chacun avait son abonnement Realtime et son minuteur : deux
 * appels pour chaque rafraîchissement, et deux appels par message reçu. Ici, un seul
 * abonnement et un seul minuteur, quel que soit le nombre de composants qui lisent la liste.
 *
 * FRAÎCHEUR : Realtime pousse les nouveaux messages, et un rafraîchissement périodique
 * prend le relais s'il n'est pas disponible. Les deux coexistent à dessein — l'abonnement
 * peut échouer silencieusement (publication absente, réseau coupé, onglet réveillé après
 * une mise en veille), et une messagerie qui se fige sans le dire est pire qu'une
 * messagerie lente.
 *
 * Les rafraîchissements demandés pendant qu'un autre est en vol sont FUSIONNÉS : un seul
 * appel de plus, à la fin, quel que soit le nombre de demandes.
 */

/** Rythme du repli quand Realtime n'a pas pris la main. */
const POLL_INTERVAL_MS = 5_000;
/** Rythme de secours une fois Realtime établi : filet, pas mécanisme principal. */
const POLL_INTERVAL_REALTIME_MS = 60_000;

export type ConversationsSnapshot = {
  conversations: ConversationSummary[];
  unreadTotal: number;
  /** Faux tant que le premier chargement n'est pas revenu. */
  loaded: boolean;
  /** Erreur du dernier chargement de la liste, effacée au suivant qui réussit. */
  error: string | null;
  realtimeReady: boolean;
};

const EMPTY: ConversationsSnapshot = {
  conversations: [],
  unreadTotal: 0,
  loaded: false,
  error: null,
  realtimeReady: false,
};

type Listener = () => void;
type MessageListener = (message: MessageItem) => void;

const callApi = createAuthorizedFetch("messagerie");

let snapshot: ConversationsSnapshot = EMPTY;
let listeners: Listener[] = [];
let messageListeners: MessageListener[] = [];

/** Composants montés qui lisent la liste. La synchronisation vit tant qu'il y en a un. */
let users = 0;
/** Incrémenté à chaque arrêt : une réponse ou un abonnement d'avant l'arrêt est ignoré. */
let generation = 0;
let channel: RealtimeChannel | null = null;
let timer: number | null = null;

let inflight: Promise<void> | null = null;
let inflightGeneration = -1;
let again = false;

function update(patch: Partial<ConversationsSnapshot>) {
  snapshot = { ...snapshot, ...patch };
  for (const listener of listeners) listener();
}

export const conversationsStore = {
  subscribe(listener: Listener) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((entry) => entry !== listener);
    };
  },
  getSnapshot: () => snapshot,
  getServerSnapshot: () => EMPTY,
};

async function fetchOnce() {
  const startedAt = generation;
  try {
    const payload = (await callApi("/api/messages/conversations")) as {
      items?: ConversationSummary[];
      unreadTotal?: number;
    } | null;
    if (startedAt !== generation) return;
    update({
      conversations: payload?.items ?? [],
      unreadTotal: payload?.unreadTotal ?? 0,
      loaded: true,
      error: null,
    });
  } catch (caught) {
    if (startedAt !== generation) return;
    update({
      loaded: true,
      error: caught instanceof Error ? caught.message : "Chargement des conversations impossible.",
    });
  }
}

/**
 * Relit la liste. Une demande faite pendant un chargement en cours n'en lance pas un
 * second en parallèle : elle en programme UN de plus, à la fin du premier. La promesse
 * rendue se résout quand la liste est à jour de toutes les demandes.
 */
export function refreshConversations(): Promise<void> {
  // Un chargement d'avant un arrêt ne compte pas : son résultat sera ignoré.
  if (inflight && inflightGeneration === generation) {
    again = true;
    return inflight;
  }
  const startedAt = generation;
  inflightGeneration = startedAt;
  const run = (async () => {
    do {
      again = false;
      await fetchOnce();
    } while (again && startedAt === generation);
  })().finally(() => {
    if (inflight === run) inflight = null;
  });
  inflight = run;
  return run;
}

/** Retire une conversation de la liste sans attendre le serveur (suppression, départ). */
export function dropConversation(conversationId: string) {
  update({ conversations: snapshot.conversations.filter((item) => item.id !== conversationId) });
}

/**
 * Nouveaux messages reçus par Realtime, pour le fil ouvert. La page s'y abonne pour
 * compléter son fil en place ; la liste, elle, se rafraîchit d'elle-même.
 */
export function onMessageInserted(listener: MessageListener) {
  messageListeners.push(listener);
  return () => {
    messageListeners = messageListeners.filter((entry) => entry !== listener);
  };
}

/** (Re)pose le minuteur au rythme qui convient à l'état de Realtime. */
function schedule() {
  if (timer !== null) window.clearInterval(timer);
  timer = window.setInterval(
    () => void refreshConversations(),
    snapshot.realtimeReady ? POLL_INTERVAL_REALTIME_MS : POLL_INTERVAL_MS,
  );
}

async function openChannel(startedAt: number) {
  const client = browserSupabase;
  if (!client) return;

  /*
    Realtime évalue les policies de SELECT avec le jeton de l'utilisateur. Sans `setAuth`,
    le canal parle en anonyme et la policy `messages_select_participant` ne laisse rien
    passer : l'abonnement réussit et ne reçoit jamais rien.
  */
  const { session } = await safeGetClientSession(client);
  if (startedAt !== generation || !session?.access_token) return;
  await client.realtime.setAuth(session.access_token);
  if (startedAt !== generation) return;

  const next = client
    .channel("messagerie")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
      const row = payload.new as {
        id: string;
        conversation_id: string;
        sender_id: string | null;
        body: string;
        created_at: string;
        game_id: string | null;
        kind?: MessageItem["kind"];
        meta?: MessageItem["meta"];
      };
      const message: MessageItem = {
        id: row.id,
        conversationId: row.conversation_id,
        senderId: row.sender_id,
        body: row.body,
        createdAt: row.created_at,
        gameId: row.game_id ?? null,
        kind: row.kind ?? "message",
        meta: row.meta ?? null,
      };
      for (const listener of messageListeners) listener(message);
      void refreshConversations();
    })
    .subscribe((status) => {
      if (startedAt !== generation) return;
      const ready = status === "SUBSCRIBED";
      if (ready === snapshot.realtimeReady) return;
      update({ realtimeReady: ready });
      schedule();
    });

  channel = next;
}

/**
 * Démarre la synchronisation de la liste (premier chargement, Realtime, minuteur) pour un
 * composant de plus. Rend la fonction d'arrêt, à appeler au démontage. Au dernier arrêt,
 * tout s'éteint et la liste est vidée : le compte suivant, dans le même onglet, ne doit
 * pas voir les conversations du précédent.
 */
export function startConversationsSync() {
  users += 1;
  if (users === 1) {
    const startedAt = generation;
    void refreshConversations();
    schedule();
    void openChannel(startedAt);
  }

  return () => {
    users -= 1;
    if (users > 0) return;
    generation += 1;
    if (timer !== null) window.clearInterval(timer);
    timer = null;
    const current = channel;
    channel = null;
    if (current && browserSupabase) void browserSupabase.removeChannel(current);
    again = false;
    snapshot = EMPTY;
    for (const listener of listeners) listener();
  };
}
