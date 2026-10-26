"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { createAuthorizedFetch } from "@/lib/dashboard-api";
import {
  conversationsStore,
  dropConversation,
  onMessageInserted,
  refreshConversations,
  startConversationsSync,
} from "@/features/messaging/conversations-store";
import type {
  ConversationSummary,
  MessageItem,
  MessagingContact,
} from "@/domain/messaging";

/**
 * Etat de la messagerie : conversations, fil ouvert, envoi.
 *
 * Un seul hook pour les deux points d'entree — le panneau de la barre superieure et la
 * page a deux volets. La LISTE des conversations, elle, n'appartient a aucun des deux :
 * elle vit dans un store partage (conversations-store), avec un seul abonnement Realtime
 * et un seul minuteur pour tout l'onglet. Ce hook n'y ajoute que ce qui est propre a la
 * page : le fil ouvert, l'envoi, les groupes.
 */

/** Rythme de rechargement du fil ouvert quand Realtime n'a pas pris la main. */
const THREAD_POLL_INTERVAL_MS = 5_000;

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

  // Liste partagee : une seule synchronisation pour tout l'onglet, quel que soit le
  // nombre de composants qui la lisent.
  useEffect(() => (enabled ? startConversationsSync() : undefined), [enabled]);
  const list = useSyncExternalStore(
    conversationsStore.subscribe,
    conversationsStore.getSnapshot,
    conversationsStore.getServerSnapshot,
  );
  const { conversations, unreadTotal, realtimeReady } = list;
  const loadingConversations = enabled && !list.loaded;

  const [contacts, setContacts] = useState<MessagingContact[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  /** Erreur d'une action (envoi, ouverture...). Celle de la liste vient du store. */
  const [actionError, setError] = useState<string | null>(null);
  const error = actionError ?? list.error;
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
    [callApi, loadMessages],
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
    [callApi, openConversation],
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
    [callApi, currentUserId],
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
    [callApi],
  );

  // Annuaire des destinataires, charge une fois (la liste, elle, vient du store).
  useEffect(() => {
    if (!enabled || !loadContacts) return;
    let cancelled = false;
    void (async () => {
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
  }, [callApi, enabled, loadContacts]);

  /*
    Messages poussés par Realtime (via le store) : le fil ouvert se complète en place.
    La liste, elle, est rafraîchie par le store lui-même.
  */
  useEffect(() => {
    if (!enabled) return;
    return onMessageInserted((incoming) => {
      if (incoming.conversationId !== activeConversationIdRef.current) return;
      setMessages((current) => {
        if (current.some((item) => item.id === incoming.id)) return current;
        // Notre propre message revenu par Realtime avant la reponse du POST : il prend la
        // place de sa version provisoire au lieu de s'afficher en double.
        const tempIndex = current.findIndex(
          (item) =>
            item.pending && item.senderId === incoming.senderId && item.body === incoming.body,
        );
        if (tempIndex === -1) return [...current, incoming];
        const next = [...current];
        next[tempIndex] = incoming;
        return next;
      });
    });
  }, [enabled]);

  /*
    Sans Realtime, le fil ouvert est rechargé périodiquement : rafraîchir la seule liste
    laissait les messages reçus hors du fil jusqu'à sa réouverture. Avec Realtime, rien à
    faire ici.
  */
  useEffect(() => {
    if (!enabled || realtimeReady) return;
    const interval = window.setInterval(() => {
      const conversationId = activeConversationIdRef.current;
      if (!conversationId) return;
      void loadMessages(conversationId)
        .then((items) => {
          // Le fil a pu changer pendant la requete : on n'ecrase pas un autre fil.
          if (activeConversationIdRef.current !== conversationId) return;
          setMessages((current) => mergeWithPending(items, current));
        })
        .catch(() => {
          // Le prochain tour reessaiera ; l'erreur de la liste suffit a signaler un souci.
        });
    }, THREAD_POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [enabled, loadMessages, realtimeReady]);

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
      group: null,
      lastMessageAt: new Date(0).toISOString(),
      lastMessagePreview: null,
      lastMessageFromMe: false,
      lastMessageSenderId: null,
      unreadCount: 0,
    };
  }, [activeConversationId, contacts, conversations, startedWith]);

  /** Cree un groupe puis l'ouvre. Rend son identifiant, ou `null` en cas d'echec. */
  const createGroup = useCallback(
    async (title: string, memberIds: string[]) => {
      try {
        const payload = (await callApi("/api/messages/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, memberIds }),
        })) as { conversation?: { id: string } } | null;
        const conversationId = payload?.conversation?.id;
        if (!conversationId) throw new Error("Groupe introuvable.");
        await refreshConversations();
        await openConversation(conversationId);
        setError(null);
        return conversationId;
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Création du groupe impossible.");
        return null;
      }
    },
    [callApi, openConversation],
  );

  /**
   * Modifie un groupe (createur seulement). L'erreur est RENDUE plutot que posee dans
   * l'etat commun : elle s'affiche dans la fenetre de gestion, ouverte par-dessus le fil.
   */
  const updateGroup = useCallback(
    async (
      conversationId: string,
      patch: { title?: string; addMemberIds?: string[]; removeMemberIds?: string[] },
    ): Promise<string | null> => {
      try {
        await callApi(`/api/messages/conversations/${encodeURIComponent(conversationId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        await refreshConversations();
        return null;
      } catch (caught) {
        return caught instanceof Error ? caught.message : "Modification impossible.";
      }
    },
    [callApi],
  );

  /** Quitte un groupe : il disparait de la liste, le fil se ferme. */
  const leaveGroup = useCallback(
    async (conversationId: string): Promise<string | null> => {
      try {
        await callApi(`/api/messages/conversations/${encodeURIComponent(conversationId)}/leave`, {
          method: "POST",
        });
        dropConversation(conversationId);
        if (activeConversationIdRef.current === conversationId) {
          setActiveConversationId(null);
          setMessages([]);
        }
        void refreshConversations();
        return null;
      } catch (caught) {
        return caught instanceof Error ? caught.message : "Impossible de quitter le groupe.";
      }
    },
    [callApi],
  );

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
        dropConversation(conversationId);
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
    [callApi],
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
    createGroup,
    updateGroup,
    leaveGroup,
    closeConversation: useCallback(() => {
      setActiveConversationId(null);
      setMessages([]);
    }, []),
  };
}
