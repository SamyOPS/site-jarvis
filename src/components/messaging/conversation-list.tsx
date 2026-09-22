"use client";

import { MessageSquare } from "lucide-react";

import { cn } from "@/lib/utils";
import { messagingRoleLabel, type ConversationSummary } from "@/domain/messaging";
import { formatRelativeTime, initialsOf } from "@/features/messaging/format";

type ConversationListProps = {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  onSelect: (conversationId: string) => void;
  loading: boolean;
  /** Message affiche quand la liste est vide. */
  emptyHint: string;
  className?: string;
};

/**
 * Liste des conversations.
 *
 * Le nombre de non-lus est TOUJOURS double du nom en gras : une pastille coloree seule ne
 * dit rien a qui ne la percoit pas, et c'est la regle suivie partout dans la console.
 */
export function ConversationList({
  conversations,
  activeConversationId,
  onSelect,
  loading,
  emptyHint,
  className,
}: ConversationListProps) {
  if (loading && conversations.length === 0) {
    return (
      <p className={cn("px-4 py-8 text-center text-app-sm text-app-text-muted", className)}>
        Chargement des conversations...
      </p>
    );
  }

  if (conversations.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-2 px-4 py-8 text-center",
          className,
        )}
      >
        <MessageSquare aria-hidden="true" className="h-6 w-6 text-app-text-muted" />
        <p className="text-app-sm text-app-text-secondary">Aucune conversation</p>
        <p className="text-app-xs text-app-text-muted">{emptyHint}</p>
      </div>
    );
  }

  return (
    <ul className={cn("divide-y divide-app-line", className)}>
      {conversations.map((conversation) => {
        const name = conversation.contact?.name ?? "Compte supprimé";
        const active = conversation.id === activeConversationId;
        const unread = conversation.unreadCount;

        return (
          <li key={conversation.id}>
            <button
              type="button"
              onClick={() => onSelect(conversation.id)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-app",
                active ? "bg-app-surface-hover" : "hover:bg-app-surface-hover",
              )}
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
                      "min-w-0 flex-1 truncate text-app-sm",
                      unread > 0 ? "font-semibold text-app-text" : "text-app-text",
                    )}
                  >
                    {name}
                  </span>
                  <span className="shrink-0 text-app-xs text-app-text-muted">
                    {formatRelativeTime(conversation.lastMessageAt)}
                  </span>
                </span>

                <span className="mt-0.5 flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-app-xs text-app-text-secondary">
                    {conversation.lastMessagePreview
                      ? `${conversation.lastMessageFromMe ? "Vous : " : ""}${conversation.lastMessagePreview}`
                      : messagingRoleLabel(conversation.contact?.role)}
                  </span>
                  {unread > 0 && (
                    <span className="shrink-0 rounded-full bg-app-accent px-1.5 py-0.5 text-app-2xs font-semibold text-white">
                      {unread}
                      <span className="sr-only"> message(s) non lu(s)</span>
                    </span>
                  )}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
