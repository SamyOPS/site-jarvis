"use client";

import { useMemo, useState } from "react";
import { PenSquare, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDismissable } from "@/hooks/use-dismissable";
import { messagingRoleLabel, type MessagingContact } from "@/domain/messaging";
import { AvatarBubble } from "@/components/console/avatar-bubble";

type ContactPickerProps = {
  contacts: MessagingContact[];
  onSelect: (contactId: string) => void;
  /** Rendu compact, pour le panneau de la barre superieure. */
  compact?: boolean;
};

/**
 * Choix d'un destinataire pour ouvrir une conversation.
 *
 * L'annuaire vient du serveur et ne contient QUE les personnes autorisees : il n'y a donc
 * rien a filtrer ici, et aucun risque de proposer quelqu'un que l'envoi refusera ensuite.
 */
export function ContactPicker({ contacts, onSelect, compact = false }: ContactPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useDismissable<HTMLDivElement>(open, () => setOpen(false));

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return contacts;
    return contacts.filter((contact) =>
      `${contact.name} ${contact.email}`.toLowerCase().includes(query),
    );
  }, [contacts, search]);

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Nouvelle conversation"
      >
        <PenSquare className="h-4 w-4" />
        {!compact && <span className="ml-2">Nouvelle conversation</span>}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-app-card border border-app-line bg-app-raised shadow-app-raised">
          <div className="flex items-center justify-between border-b border-app-line px-3 py-2">
            <p className="text-app-sm font-medium text-app-text">Nouvelle conversation</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="rounded-app-control p-1 text-app-text-muted transition-colors hover:text-app-text focus-visible:outline-app"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="border-b border-app-line p-2">
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-muted"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nom ou e-mail..."
                aria-label="Rechercher un destinataire"
                className="h-8 w-full rounded-app-control border border-app-line bg-app-field pl-8 pr-2 text-app-sm text-app-text placeholder:text-app-text-muted focus-visible:outline-app"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-app-xs text-app-text-muted">
              {contacts.length === 0
                ? "Aucun interlocuteur disponible."
                : "Aucun résultat."}
            </p>
          ) : (
            <ul className="max-h-72 overflow-y-auto py-1">
              {filtered.map((contact) => (
                <li key={contact.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setSearch("");
                      onSelect(contact.id);
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-app-surface-hover focus-visible:outline-app"
                  >
                    <AvatarBubble
                      avatarUrl={contact.avatarUrl}
                      name={contact.name}
                      email={contact.email}
                      size={28}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-app-sm text-app-text">
                        {contact.name}
                      </span>
                      <span className="block truncate text-app-xs text-app-text-muted">
                        {messagingRoleLabel(contact.role)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
