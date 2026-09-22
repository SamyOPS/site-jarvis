"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { createAuthorizedFetch } from "@/lib/dashboard-api";
import { browserSupabase } from "@/lib/supabase-browser";
import { safeGetClientSession } from "@/lib/client-auth";
import type {
  ConversationSummary,
  MessageItem,
  MessagingContact,
} from "@/domain/messaging";

/**
 * Etat de la messagerie : conversations, fil ouvert, envoi.
 *
 * Un seul hook pour les deux points d'entree — le panneau de la barre superieure et la
 * page a deux volets. Ils montrent la meme chose sous deux formes ; leur donner chacun
 * leur chargement ferait deux compteurs de non-lus susceptibles de diverger.
 *
 * FRAICHEUR : Realtime pousse les nouveaux messages, et un rafraichissement periodique
 * prend le relais s'il n'est pas disponible. Les deux coexistent a dessein — l'abonnement
 * peut echouer silencieusement (publication absente, reseau coupe, onglet reveille apres
 * une mise en veille), et une messagerie qui se fige sans le dire est pire qu'une
 * messagerie lente.
 */

/** Rythme du repli quand Realtime n'a pas pris la main. */
const POLL_INTERVAL_MS = 15_000;
/** Rythme de secours une fois Realtime etabli : filet, pas mecanisme principal. */
const POLL_INTERVAL_REALTIME_MS = 60_000;

type UseMessagingOptions = {
  /** Ne charge rien tant que la session n'est pas prete. */
  enabled?: boolean;
  /**
   * Charge l'annuaire des destinataires. Inutile pour le panneau de la barre superieure,
   * qui n'ouvre pas de nouvelle conversation : c'est une requete de moins sur chaque page
   * de la console.
   */
  loadContacts?: boolean;
};

export function useMessaging({
  enabled = true,
  loadContacts = true,
}: UseMessagingOptions = {}) {
  const callApi = useMemo(() => createAuthorizedFetch("messagerie"), []);
  /*
    Nom de canal propre a chaque instance du hook. Le panneau de la barre superieure et la
    page a deux volets sont montes en meme temps : deux canaux de MEME nom sur un seul
    client Supabase se marchent dessus, et le second abonnement ne recoit rien.
  */
  const channelName = `messagerie:${useId()}`;

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [contacts, setContacts] = useState<MessagingContact[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realtimeReady, setRealtimeReady] = useState(false);

  /*
    L'identifiant du fil ouvert est aussi garde dans une ref : l'abonnement Realtime est
    pose une seule fois et sa closure capturerait sinon la valeur du premier rendu, ne
    rafraichissant jamais le bon fil.
  */
  const activeConversationIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  const refreshConversations = useCallback(async () => {
    try {
      const payload = (await callApi("/api/messages/conversations")) as {
        items?: ConversationSummary[];
        unreadTotal?: number;
      } | null;
      setConversations(payload?.items ?? []);
      setUnreadTotal(payload?.unreadTotal ?? 0);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Chargement des conversations impossible.");
    }
  }, [callApi]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      const payload = (await callApi(
        `/api/messages/conversations/${encodeURIComponent(conversationId)}/messages`,
      )) as { items?: MessageItem[] } | null;
      return payload?.items ?? [];
    },
    [callApi],
  );

  /** Ouvre un fil : charge son contenu, puis le marque comme lu. */
  const openConversation = useCallback(
    async (conversationId: string) => {
      setActiveConversationId(conversationId);
      setLoadingMessages(true);
      try {
        setMessages(await loadMessages(conversationId));
        await callApi(`/api/messages/conversations/${encodeURIComponent(conversationId)}/read`, {
          method: "POST",
        });
        await refreshConversations();
        setError(null);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Ouverture de la conversation impossible.");
      } finally {
        setLoadingMessages(false);
      }
    },
    [callApi, loadMessages, refreshConversations],
  );

  /** Ouvre — ou cree — la conversation avec un contact, puis l'affiche. */
  const startConversationWith = useCallback(
    async (contactId: string) => {
      try {
        const payload = (await callApi("/api/messages/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetId: contactId }),
        })) as { conversation?: { id: string } } | null;

        const conversationId = payload?.conversation?.id;
        if (!conversationId) throw new Error("Conversation introuvable.");

        await refreshConversations();
        await openConversation(conversationId);
        return conversationId;
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Ouverture de la conversation impossible.");
        return null;
      }
    },
    [callApi, openConversation, refreshConversations],
  );

  const sendMessage = useCallback(
    async (body: string) => {
      const conversationId = activeConversationIdRef.current;
      const text = body.trim();
      if (!conversationId || !text) return false;

      setSending(true);
      try {
        const payload = (await callApi(
          `/api/messages/conversations/${encodeURIComponent(conversationId)}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body: text }),
          },
        )) as { message?: MessageItem } | null;

        // Ajout immediat plutot que rechargement du fil : le message doit apparaitre au
        // moment ou l'on relache la touche. La garde sur l'identifiant evite le doublon
        // si Realtime a devance la reponse.
        if (payload?.message) {
          const sent = payload.message;
          setMessages((current) =>
            current.some((item) => item.id === sent.id) ? current : [...current, sent],
          );
        }
        await refreshConversations();
        setError(null);
        return true;
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Envoi impossible.");
        return false;
      } finally {
        setSending(false);
      }
    },
    [callApi, refreshConversations],
  );

  // Chargement initial.
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    void (async () => {
      setLoadingConversations(true);
      await refreshConversations();
      if (!cancelled) setLoadingConversations(false);
    })();

    void (async () => {
      if (!loadContacts) return;
      try {
        const payload = (await callApi("/api/messages/contacts")) as {
          items?: MessagingContact[];
        } | null;
        if (!cancelled) setContacts(payload?.items ?? []);
      } catch {
        // L'annuaire n'est pas vital : sans lui on ne peut pas ouvrir un nouveau fil,
        // mais les conversations existantes restent utilisables. Pas de message d'erreur
        // pour ne pas masquer celui du chargement des conversations.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [callApi, enabled, loadContacts, refreshConversations]);

  // Abonnement Realtime.
  useEffect(() => {
    if (!enabled || !browserSupabase) return;
    const client = browserSupabase;
    let channel: ReturnType<typeof client.channel> | null = null;
    let cancelled = false;

    void (async () => {
      /*
        Realtime evalue les policies de SELECT avec le jeton de l'utilisateur. Sans
        `setAuth`, le canal parle en anonyme et la policy `messages_select_participant` ne
        laisse rien passer : l'abonnement reussit et ne recoit jamais rien.
      */
      const { session } = await safeGetClientSession(client);
      if (cancelled || !session?.access_token) return;
      await client.realtime.setAuth(session.access_token);
      if (cancelled) return;

      channel = client
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          (payload) => {
            const row = payload.new as {
              id: string;
              conversation_id: string;
              sender_id: string | null;
              body: string;
              created_at: string;
            };

            // Le fil ouvert se complete en place ; les autres ne touchent que la liste.
            if (row.conversation_id === activeConversationIdRef.current) {
              setMessages((current) =>
                current.some((item) => item.id === row.id)
                  ? current
                  : [
                      ...current,
                      {
                        id: row.id,
                        conversationId: row.conversation_id,
                        senderId: row.sender_id,
                        body: row.body,
                        createdAt: row.created_at,
                      },
                    ],
              );
            }
            void refreshConversations();
          },
        )
        .subscribe((status) => {
          if (!cancelled) setRealtimeReady(status === "SUBSCRIBED");
        });
    })();

    return () => {
      cancelled = true;
      setRealtimeReady(false);
      if (channel) void client.removeChannel(channel);
    };
  }, [channelName, enabled, refreshConversations]);

  // Repli periodique. L'intervalle s'allonge une fois Realtime etabli.
  useEffect(() => {
    if (!enabled) return;
    const interval = window.setInterval(
      () => void refreshConversations(),
      realtimeReady ? POLL_INTERVAL_REALTIME_MS : POLL_INTERVAL_MS,
    );
    return () => window.clearInterval(interval);
  }, [enabled, realtimeReady, refreshConversations]);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeConversationId) ?? null,
    [activeConversationId, conversations],
  );

  return {
    conversations,
    contacts,
    unreadTotal,
    activeConversationId,
    activeConversation,
    messages,
    loadingConversations,
    loadingMessages,
    sending,
    error,
    realtimeReady,
    openConversation,
    startConversationWith,
    sendMessage,
    refreshConversations,
    closeConversation: useCallback(() => {
      setActiveConversationId(null);
      setMessages([]);
    }, []),
  };
}
