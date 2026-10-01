"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { ConversationList } from "@/components/messaging/conversation-list";
import { ContactPicker } from "@/components/messaging/contact-picker";
import { MessageThread } from "@/components/messaging/message-thread";
import { GameDialog } from "@/components/messaging/game-dialog";
import { StatusNotice } from "@/components/dashboard/status-notice";
import { messagingRoleLabel } from "@/domain/messaging";
import { ContactAvatar } from "@/components/messaging/contact-avatar";
import { DeleteConversationDialog } from "@/components/messaging/delete-conversation-dialog";
import { useMessaging } from "@/features/messaging/use-messaging";
import { useIsOnline } from "@/features/messaging/presence-store";

type MessagesViewProps = {
  currentUserId: string;
  /**
   * Conversation a ouvrir au chargement, lue dans l'URL (`?c=<id>`). C'est ce qui permet
   * au panneau de la barre superieure de mener droit au bon fil.
   */
  initialConversationId?: string | null;
  /**
   * Interlocuteur avec qui ouvrir une conversation (`?to=<id>`), qu'elle existe deja ou
   * non. C'est par la que passe le bouton « Envoyer un message » d'une fiche.
   */
  initialContactId?: string | null;
  /** Phrase affichee quand aucune conversation n'existe encore. */
  emptyHint: string;
};

/**
 * Messagerie en deux volets : conversations a gauche, fil a droite.
 *
 * Sur mobile, les deux volets ne cohabitent pas — ouvrir une conversation remplace la
 * liste, et une fleche de retour y ramene. Deux colonnes de 160px cote a cote ne se
 * liraient ni l'une ni l'autre.
 */
export function MessagesView({
  currentUserId,
  initialConversationId,
  initialContactId,
  emptyHint,
}: MessagesViewProps) {
  const {
    conversations,
    contacts,
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
    closeConversation,
    deleteConversation,
  } = useMessaging({ currentUserId });

  /** Partie affichee par-dessus le fil, ouverte depuis une invitation ou a sa creation. */
  const [openGameId, setOpenGameId] = useState<string | null>(null);
  /** Discussion dont la suppression attend confirmation. */
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  /*
    Ouverture initiale, une seule fois par identifiant. Sans cette garde, revenir a la
    liste sur mobile rouvrirait aussitot le fil de l'URL : le bouton de retour paraitrait
    sans effet.
  */
  const openedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!initialConversationId || openedRef.current === initialConversationId) return;
    openedRef.current = initialConversationId;
    void openConversation(initialConversationId);
  }, [initialConversationId, openConversation]);

  /*
    Ouverture par interlocuteur. `startConversationWith` est idempotent — il rend le fil
    existant s'il y en a un, en cree un sinon —, et la garde evite qu'un retour a la liste
    le rouvre aussitot.
  */
  const startedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!initialContactId || startedRef.current === initialContactId) return;
    startedRef.current = initialContactId;
    void startConversationWith(initialContactId);
  }, [initialContactId, startConversationWith]);

  /*
    Sans fil designe par l'URL, on ouvre la conversation la plus recente des que la liste
    arrive. Une seule fois : fermer le fil ensuite (retour mobile) doit laisser la liste.
  */
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (autoOpenedRef.current || initialConversationId || initialContactId) return;
    if (activeConversationId) {
      autoOpenedRef.current = true;
      return;
    }
    if (!conversations.length) return;
    autoOpenedRef.current = true;
    const latest = conversations.reduce((best, item) =>
      item.lastMessageAt > best.lastMessageAt ? item : best,
    );
    void openConversation(latest.id);
  }, [
    activeConversationId,
    conversations,
    initialContactId,
    initialConversationId,
    openConversation,
  ]);

  const contactName = activeConversation?.contact?.name ?? "Compte supprimé";
  const contactOnline = useIsOnline(activeConversation?.contact?.id);

  return (
    <div className="space-y-2">
      {error && <StatusNotice tone="error" title="Messagerie" message={error} />}

      <div className="flex h-[calc(100dvh-13rem)] min-h-[26rem] overflow-hidden rounded-app-card border border-app-line bg-app-surface">
        {/* Volet gauche */}
        <div
          className={cn(
            "flex min-h-0 w-full flex-col border-app-line md:w-80 md:shrink-0 md:border-r",
            activeConversationId ? "hidden md:flex" : "flex",
          )}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-app-line px-4 py-3">
            <div className="min-w-0">
              <p className="text-app-sm font-medium text-app-text">Conversations</p>
              {/*
                L'etat du temps reel est dit, pas devine : quand l'abonnement n'est pas
                etabli, les messages arrivent avec quelques secondes de retard et
                l'utilisateur doit pouvoir comprendre pourquoi.
              */}
              {!realtimeReady && (
                <p className="text-app-2xs text-app-text-muted">
                  Actualisation périodique
                </p>
              )}
            </div>
            <ContactPicker contacts={contacts} onSelect={startConversationWith} compact />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <ConversationList
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelect={openConversation}
              onDelete={(conversation) =>
                setPendingDelete({
                  id: conversation.id,
                  name: conversation.contact?.name ?? "Compte supprimé",
                })
              }
              loading={loadingConversations}
              emptyHint={emptyHint}
            />
          </div>
        </div>

        {/* Volet droit */}
        <div
          className={cn(
            "min-h-0 min-w-0 flex-1 flex-col",
            activeConversationId ? "flex" : "hidden md:flex",
          )}
        >
          {activeConversationId ? (
            <>
              <div className="flex shrink-0 items-center gap-3 border-b border-app-line px-4 py-3">
                <button
                  type="button"
                  onClick={closeConversation}
                  aria-label="Retour aux conversations"
                  className="rounded-app-control p-1 text-app-text-muted transition-colors hover:text-app-text focus-visible:outline-app md:hidden"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <ContactAvatar
                  profileId={activeConversation?.contact?.id}
                  avatarUrl={activeConversation?.contact?.avatarUrl}
                  name={contactName}
                  email={activeConversation?.contact?.email}
                  size={32}
                />
                <div className="min-w-0">
                  <p className="truncate text-app-sm font-medium text-app-text">
                    {contactName}
                  </p>
                  <p className="truncate text-app-xs text-app-text-muted">
                    {contactOnline ? (
                      <span className="text-validated">En ligne</span>
                    ) : (
                      "Hors ligne"
                    )}
                    {" · "}
                    {messagingRoleLabel(activeConversation?.contact?.role)}
                  </p>
                </div>
              </div>

              <MessageThread
                messages={messages}
                currentUserId={currentUserId}
                loading={loadingMessages}
                sending={sending}
                onSend={sendMessage}
                onStartGame={async (gameType) => {
                  const gameId = await startGame(gameType);
                  if (gameId) setOpenGameId(gameId);
                }}
                onOpenGame={setOpenGameId}
              />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center">
              <p className="text-app-sm text-app-text-muted">
                Choisissez une conversation, ou démarrez-en une nouvelle.
              </p>
            </div>
          )}
        </div>
      </div>

      <GameDialog
        gameId={openGameId}
        currentUserId={currentUserId}
        opponentName={contactName}
        onClose={() => setOpenGameId(null)}
        chat={{ messages, sending, onSend: sendMessage }}
        onRematch={async (gameType) => {
          // Nouvelle invitation dans le meme fil ; la fenetre bascule sur la nouvelle partie.
          const gameId = await startGame(gameType);
          if (gameId) setOpenGameId(gameId);
        }}
      />

      <DeleteConversationDialog
        contactName={pendingDelete?.name ?? null}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() =>
          pendingDelete ? deleteConversation(pendingDelete.id) : Promise.resolve(true)
        }
      />
    </div>
  );
}
