"use client";

import { useCallback, useState } from "react";
import { Bell, Inbox } from "lucide-react";

import { cn } from "@/lib/utils";
import { useDismissable } from "@/components/console/shell/use-dismissable";

export type ConsoleNotification = {
  id: string;
  title: string;
  description?: string | null;
  createdAtLabel?: string | null;
  href?: string | null;
};

type ConsoleNotificationsProps = {
  /**
   * Aucune table ni route de notifications n'existe aujourd'hui cote
   * Supabase (verifie a l'audit). L'emplacement et l'etat vide sont donc
   * livres, prets a recevoir une source de donnees sans retouche visuelle.
   */
  items?: ConsoleNotification[];
};

export function ConsoleNotifications({ items = [] }: ConsoleNotificationsProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const containerRef = useDismissable<HTMLDivElement>(open, close);

  const unread = items.length;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={
          unread ? `Notifications — ${unread} non lues` : "Notifications — aucune"
        }
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-app-control text-app-text-muted transition-colors hover:bg-app-surface-hover hover:text-app-text focus-visible:outline-app",
          open && "bg-app-surface-hover text-app-text",
        )}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 h-2 w-2 rounded-full bg-app-accent ring-2 ring-app-canvas"
          />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-app-card border border-app-line bg-app-raised shadow-app-raised">
          <div className="flex items-center justify-between border-b border-app-line px-4 py-3">
            <p className="text-app-sm font-medium text-app-text">Notifications</p>
            {unread > 0 && (
              <span className="text-app-xs text-app-text-muted">{unread}</span>
            )}
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <Inbox aria-hidden="true" className="h-6 w-6 text-app-text-muted" />
              <p className="text-app-sm text-app-text-secondary">
                Aucune notification
              </p>
              <p className="text-app-xs text-app-text-muted">
                Les relances et les validations apparaitront ici.
              </p>
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {items.map((item) => (
                <li key={item.id}>
                  <div className="px-4 py-3 transition-colors hover:bg-app-surface-hover">
                    <p className="text-app-sm text-app-text">{item.title}</p>
                    {item.description && (
                      <p className="mt-1 text-app-xs text-app-text-secondary">
                        {item.description}
                      </p>
                    )}
                    {item.createdAtLabel && (
                      <p className="mt-1 text-app-xs text-app-text-muted">
                        {item.createdAtLabel}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
