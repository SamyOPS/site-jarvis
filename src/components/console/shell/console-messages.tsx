"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ChevronRight, MessageSquare, Send } from "lucide-react";

import { cn } from "@/lib/utils";
import { useDismissable } from "@/components/console/shell/use-dismissable";
import { useMessaging } from "@/features/messaging/use-messaging";
import { formatRelativeTime, initialsOf } from "@/features/messaging/format";

type ConsoleMessagesProps = {
  /** Page de messagerie de l'espace courant. */
  messagesHref: string;
};

/**
 * Cloche de messagerie de la barre superieure.
 *
 * Le panneau ne fait que DONNER A VOIR : il liste les derniers echanges et leur nombre de
 * non-lus, et chaque ligne mene a la page a deux volets, conversation ouverte. Y loger la
 * saisie reviendrait a maintenir deux fils de discussion concurrents dans l'application,
 * pour une colonne de 320 px.
 *
 * L'annuaire n'est volontairement PAS charge ici : on n'ouvre pas de nouvelle conversation
 * depuis le panneau, c'est donc une requete de moins sur chaque page de la console.
 */
export function ConsoleMessages({ messagesHref }: ConsoleMessagesProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const containerRef = useDismissable<HTMLDivElement>(open, close);

  const { conversations, unreadTotal, loadingConversations } = useMessaging({
    loadContacts: false,
  });

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={
          unreadTotal
            ? `Messages — ${unreadTotal} non lus`
            : "Messages — aucun message non lu"
        }
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-app-control text-app-text-muted transition-colors hover:bg-app-surface-hover hover:text-app-text focus-visible:outline-app",
          open && "bg-app-surface-hover text-app-text",
        )}
      >
        <Send className="h-4 w-4" />
        {unreadTotal > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 h-2 w-2 rounded-full bg-app-accent ring-2 ring-app-canvas"
          />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-app-card border border-app-line bg-app-raised shadow-app-raised">
          <div className="flex items-center justify-between border-b border-app-line px-4 py-3">
            <p className="text-app-sm font-medium text-app-text">Messages</p>
            {unreadTotal > 0 && (
              <span className="text-app-xs text-app-text-muted">{unreadTotal} non lus</span>
            )}
          </div>

          {loadingConversations && conversations.length === 0 ? (
            <p className="px-4 py-8 text-center text-app-sm text-app-text-muted">
              Chargement...
            </p>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <MessageSquare aria-hidden="true" className="h-6 w-6 text-app-text-muted" />
              <p className="text-app-sm text-app-text-secondary">Aucune conversation</p>
              <p className="text-app-xs text-app-text-muted">
                Vos échanges apparaîtront ici.
              </p>
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {conversations.slice(0, 6).map((conversation) => {
                const name = conversation.contact?.name ?? "Compte supprimé";
                const unread = conversation.unreadCount;

                return (
                  <li key={conversation.id}>
                    <Link
                      href={`${messagesHref}?c=${encodeURIComponent(conversation.id)}`}
                      onClick={close}
                      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-app-surface-hover focus-visible:outline-app"
                    >
                      <span
                        aria-hidden="true"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-app-line bg-app-surface-hover text-app-xs font-semibold text-app-text-secondary"
                      >
                        {initialsOf(name)}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span
                            className={cn(
                              "min-w-0 flex-1 truncate text-app-sm text-app-text",
                              unread > 0 && "font-semibold",
                            )}
                          >
                            {name}
                          </span>
                          <span className="shrink-0 text-app-xs text-app-text-muted">
                            {formatRelativeTime(conversation.lastMessageAt)}
                          </span>
                        </span>
                        {conversation.lastMessagePreview && (
                          <span className="mt-1 block truncate text-app-xs text-app-text-secondary">
                            {conversation.lastMessageFromMe ? "Vous : " : ""}
                            {conversation.lastMessagePreview}
                          </span>
                        )}
                      </span>

                      {unread > 0 ? (
                        <span className="mt-0.5 shrink-0 rounded-full bg-app-accent px-1.5 py-0.5 text-app-2xs font-semibold text-white">
                          {unread}
                          <span className="sr-only"> non lus</span>
                        </span>
                      ) : (
                        <ChevronRight
                          aria-hidden="true"
                          className="mt-1 h-4 w-4 shrink-0 text-app-text-muted"
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="border-t border-app-line px-4 py-2.5">
            <Link
              href={messagesHref}
              onClick={close}
              className="flex items-center justify-between rounded-app-control text-app-sm text-app-text-secondary transition-colors hover:text-app-text focus-visible:outline-app"
            >
              Ouvrir la messagerie
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
