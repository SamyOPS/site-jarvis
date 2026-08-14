"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { CornerDownLeft, Search } from "lucide-react";

import {
  flattenNavDestinations,
  type ConsoleNavConfig,
} from "@/features/dashboard/shell/nav-config";

export type ConsoleCommandItem = {
  id: string;
  label: string;
  hint?: string | null;
  onSelect: () => void;
};

export type ConsoleCommandGroup = {
  heading: string;
  items: ConsoleCommandItem[];
};

type ConsoleCommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: ConsoleNavConfig;
  /**
   * Groupes additionnels (documents, collaborateurs...). Les donnees vivent
   * dans les workspaces : la palette les recoit en props plutot que de faire
   * ses propres appels. Branche a l'etape 4.
   */
  extraGroups?: ConsoleCommandGroup[];
};

/**
 * Palette de commandes (Cmd/Ctrl + K).
 *
 * Remplace la fausse barre de recherche des workspaces, qui etait un <span>
 * non focusable. Des cette etape elle est utile : elle indexe toutes les
 * destinations de navigation, sans nouvelle donnee ni nouvel appel API.
 *
 * Construite sur les primitives Radix Dialog directement (deja une
 * dependance de cmdk) plutot que sur ui/dialog.tsx, qui porte les tokens du
 * site vitrine et un bouton de fermeture positionne pour un contenu avec
 * padding.
 */
export function ConsoleCommandPalette({
  open,
  onOpenChange,
  config,
  extraGroups = [],
}: ConsoleCommandPaletteProps) {
  const router = useRouter();

  const navigationGroups = useMemo<ConsoleCommandGroup[]>(() => {
    const destinations = flattenNavDestinations(config);
    const bySection = new Map<string, ConsoleCommandItem[]>();

    for (const destination of destinations) {
      const items = bySection.get(destination.section) ?? [];
      items.push({
        id: destination.href,
        label: destination.label,
        onSelect: () => {
          onOpenChange(false);
          router.push(destination.href);
        },
      });
      bySection.set(destination.section, items);
    }

    return [...bySection.entries()].map(([heading, items]) => ({
      heading,
      items,
    }));
  }, [config, onOpenChange, router]);

  const groups = [...extraGroups, ...navigationGroups];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-app-overlay data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-app-card border border-app-line bg-app-raised shadow-app-raised data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <DialogPrimitive.Title className="sr-only">
            Recherche globale
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Rechercher une page de {config.roleLabel} et s&apos;y rendre.
          </DialogPrimitive.Description>

          <Command
            label="Recherche globale"
            className="flex w-full flex-col overflow-hidden"
          >
            <div className="flex items-center gap-2 border-b border-app-line px-4">
              <Search
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-app-text-muted"
              />
              <Command.Input
                placeholder="Rechercher une page..."
                className="h-12 w-full bg-transparent text-app-sm text-app-text outline-none placeholder:text-app-text-muted"
              />
            </div>

            <Command.List className="max-h-80 overflow-y-auto p-2">
              <Command.Empty className="px-3 py-8 text-center text-app-sm text-app-text-muted">
                Aucun resultat.
              </Command.Empty>

              {groups.map((group) => (
                <Command.Group
                  key={group.heading}
                  heading={group.heading}
                  className="mb-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-app-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-app-text-muted [&_[cmdk-group-heading]]:uppercase"
                >
                  {group.items.map((item) => (
                    <Command.Item
                      key={item.id}
                      value={`${group.heading} ${item.label}`}
                      onSelect={item.onSelect}
                      className="flex h-8 cursor-pointer select-none items-center gap-2 rounded-app-control px-2 text-app-sm text-app-text-secondary data-[selected=true]:bg-app-accent-soft data-[selected=true]:text-app-text"
                    >
                      <span className="truncate">{item.label}</span>
                      {item.hint && (
                        <span className="ml-auto truncate text-app-xs text-app-text-muted">
                          {item.hint}
                        </span>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>
              ))}
            </Command.List>

            <div className="flex items-center gap-2 border-t border-app-line px-4 py-2 text-app-xs text-app-text-muted">
              <CornerDownLeft aria-hidden="true" className="h-4 w-4" />
              <span>pour ouvrir</span>
              <span className="ml-auto">Echap pour fermer</span>
            </div>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
