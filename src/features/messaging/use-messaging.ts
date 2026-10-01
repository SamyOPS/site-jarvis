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
const POLL_INTERVAL_MS = 5_000;
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
  /**
   * Auteur des messages envoyes. Connu, il permet d'afficher un message des l'appui sur
   * Entree, sans attendre l'aller-retour serveur.
   */
  currentUserId?: string;
};

/**
 * Remplace le fil par la version serveur en gardant les messages encore en vol : un
 * rafraichissement ne doit pas faire disparaitre ce que l'on vient d'ecrire.
 */
function mergeWithPending(server: MessageItem[], current: MessageItem[]) {
  // Un message en vol deja present cote serveur (POST pas encore revenu) n'est pas double.
  const pending = current.filter(
    (item) =>
      item.pending &&
      !server.some((sent) => sent.senderId === item.senderId && sent.body === item.body),
  );
  return pending.length ? [...server, ...pending] : server;
}

export function useMessaging({
  enabled = true,
  loadContacts = true,
  currentUserId,
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
    Interlocuteur des fils ouverts depuis l'annuaire. Un fil sans message — tout neuf, ou
    supprime puis rouvert — n'est pas dans la liste : sans cette table, son en-tete ne
    saurait pas a qui l'on ecrit.
  */
  const [startedWith, setStartedWith] = useState<Record<string, string>>({});

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
        setStartedWith((current) => ({ ...current, [conversationId]: contactId }));

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

      /*
        Le message s'affiche AVANT la reponse du serveur : l'aller-retour (authentification,
        controle de participation, insertion) se sent a chaque envoi. Il porte un
        identifiant provisoire, remplace par le vrai a la confirmation — ou retire si
        l'envoi echoue, la saisie etant alors rendue a l'utilisateur.
      */
      const tempId = `pending:${Date.now()}:${Math.random().toString(36).slice(2)}`;
      if (currentUserId) {
        setMessages((current) => [
          ...current,
          {
            id: tempId,
            conversationId,
            senderId: currentUserId,
            body: text,
            createdAt: new Date().toISOString(),
            gameId: null,
            kind: "message",
            meta: null,
            pending: true,
          },
        ]);
      }

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

        // La garde sur l'identifiant evite le doublon si Realtime a devance la reponse.
        const sent = payload?.message;
        setMessages((current) => {
          const withoutTemp = current.filter((item) => item.id !== tempId);
          if (!sent || withoutTemp.some((item) => item.id === sent.id)) return withoutTemp;
          const index = current.findIndex((item) => item.id === tempId);
          if (index === -1) return [...withoutTemp, sent];
          const next = [...current];
          next[index] = sent;
          return next;
        });
        // La liste se met a jour en arriere-plan : l'envoi est deja termine pour
        // l'utilisateur, inutile de le faire attendre.
        void refreshConversations();
        setError(null);
        return true;
      } catch (caught) {
        setMessages((current) => current.filter((item) => item.id !== tempId));
        setError(caught instanceof Error ? caught.message : "Envoi impossible.");
        return false;
      } finally {
        setSending(false);
      }
    },
    [callApi, currentUserId, refreshConversations],
  );

  /**
   * Propose une partie dans le fil ouvert. Rend l'identifiant de la partie, pour que
   * l'appelant l'ouvre aussitot : le createur attend son adversaire devant l'echiquier.
   */
  const startGame = useCallback(
    async (gameType: string) => {
      const conversationId = activeConversationIdRef.current;
      if (!conversationId) return null;
      try {
        const payload = (await callApi(
          `/api/messages/conversations/${encodeURIComponent(conversationId)}/games`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gameType }),
          },
        )) as { message?: MessageItem; game?: { id: string } } | null;

        if (payload?.message) {
          const sent = payload.message;
          setMessages((current) =>
            current.some((item) => item.id === sent.id) ? current : [...current, sent],
          );
        }
        await refreshConversations();
        setError(null);
        return payload?.game?.id ?? null;
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Lancement de la partie impossible.");
        return null;
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
              game_id: string | null;
              kind?: MessageItem["kind"];
              meta?: MessageItem["meta"];
            };

            // Le fil ouvert se complete en place ; les autres ne touchent que la liste.
            if (row.conversation_id === activeConversationIdRef.current) {
              const incoming: MessageItem = {
                id: row.id,
                conversationId: row.conversation_id,
                senderId: row.sender_id,
                body: row.body,
                createdAt: row.created_at,
                gameId: row.game_id ?? null,
                kind: row.kind ?? "message",
                meta: row.meta ?? null,
              };
              setMessages((current) => {
                if (current.some((item) => item.id === row.id)) return current;
                // Notre propre message revenu par Realtime avant la reponse du POST : il
                // prend la place de sa version provisoire au lieu de s'afficher en double.
                const tempIndex = current.findIndex(
                  (item) =>
                    item.pending && item.senderId === row.sender_id && item.body === row.body,
                );
                if (tempIndex === -1) return [...current, incoming];
                const next = [...current];
                next[tempIndex] = incoming;
                return next;
              });
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

  /*
    Repli periodique. L'intervalle s'allonge une fois Realtime etabli. Sans Realtime, le
    fil ouvert est recharge lui aussi : rafraichir la seule liste laissait les messages
    recus hors du fil jusqu'a sa reouverture.
  */
  useEffect(() => {
    if (!enabled) return;
    const interval = window.setInterval(
      () => {
        void refreshConversations();
        const conversationId = activeConversationIdRef.current;
        if (realtimeReady || !conversationId) return;
        void loadMessages(conversationId)
          .then((items) => {
            // Le fil a pu changer pendant la requete : on n'ecrase pas un autre fil.
            if (activeConversationIdRef.current !== conversationId) return;
            setMessages((current) => mergeWithPending(items, current));
          })
          .catch(() => {
            // Le prochain tour reessaiera ; l'erreur de la liste suffit a signaler un souci.
          });
      },
      realtimeReady ? POLL_INTERVAL_REALTIME_MS : POLL_INTERVAL_MS,
    );
    return () => window.clearInterval(interval);
  }, [enabled, loadMessages, realtimeReady, refreshConversations]);

  const activeConversation = useMemo((): ConversationSummary | null => {
    if (!activeConversationId) return null;
    const listed = conversations.find((item) => item.id === activeConversationId);
    if (listed) return listed;
    const contactId = startedWith[activeConversationId];
    const contact = contacts.find((item) => item.id === contactId);
    if (!contact) return null;
    return {
      id: activeConversationId,
      contact,
      lastMessageAt: new Date(0).toISOString(),
      lastMessagePreview: null,
      lastMessageFromMe: false,
      unreadCount: 0,
    };
  }, [activeConversationId, contacts, conversations, startedWith]);

  /**
   * Supprime la discussion pour l'utilisateur seulement : l'autre la garde. Elle quitte
   * la liste tout de suite, sans attendre le rafraichissement.
   */
  const deleteConversation = useCallback(
    async (conversationId: string) => {
      try {
        await callApi(`/api/messages/conversations/${encodeURIComponent(conversationId)}`, {
          method: "DELETE",
        });
        setConversations((current) => current.filter((item) => item.id !== conversationId));
        if (activeConversationIdRef.current === conversationId) {
          setActiveConversationId(null);
          setMessages([]);
        }
        void refreshConversations();
        setError(null);
        return true;
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Suppression impossible.");
        return false;
      }
    },
    [callApi, refreshConversations],
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
    startGame,
    refreshConversations,
    deleteConversation,
    closeConversation: useCallback(() => {
      setActiveConversationId(null);
      setMessages([]);
    }, []),
  };
}
