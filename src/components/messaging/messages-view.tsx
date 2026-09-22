"use client";

import { useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { ConversationList } from "@/components/messaging/conversation-list";
import { ContactPicker } from "@/components/messaging/contact-picker";
import { MessageThread } from "@/components/messaging/message-thread";
import { StatusNotice } from "@/components/dashboard/status-notice";
import { messagingRoleLabel } from "@/domain/messaging";
import { initialsOf } from "@/features/messaging/format";
import { useMessaging } from "@/features/messaging/use-messaging";

type MessagesViewProps = {
  currentUserId: string;
  /**
   * Conversation a ouvrir au chargement, lue dans l'URL (`?c=<id>`). C'est ce qui permet
   * au panneau de la barre superieure de mener droit au bon fil.
   */
  initialConversationId?: string | null;
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
    closeConversation,
  } = useMessaging();

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

  const contactName = activeConversation?.contact?.name ?? "Compte supprimé";

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
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-app-line bg-app-surface-hover text-app-xs font-semibold text-app-text-secondary"
                >
                  {initialsOf(contactName)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-app-sm font-medium text-app-text">
                    {contactName}
                  </p>
                  <p className="truncate text-app-xs text-app-text-muted">
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
    </div>
  );
}
