"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";
import { consoleThemeStore, type ConsoleTheme } from "@/lib/console-theme";

const OPTIONS: { value: ConsoleTheme; label: string; icon: typeof Sun }[] = [
  { value: "dark", label: "Sombre", icon: Moon },
  { value: "light", label: "Clair", icon: Sun },
];

/**
 * Bascule de theme, en controle segmente plutot qu'en interrupteur : l'etat
 * courant reste lisible sans avoir a deduire ce que fait l'icone.
 *
 * useSyncExternalStore plutot que useState + useEffect : le script inline
 * pose deja data-theme avant l'hydratation, et getServerSnapshot garantit
 * qu'aucun mismatch n'est signale.
 */
export function ConsoleThemeSwitch() {
  const theme = useSyncExternalStore(
    consoleThemeStore.subscribe,
    consoleThemeStore.getSnapshot,
    consoleThemeStore.getServerSnapshot,
  );

  return (
    <div
      role="radiogroup"
      aria-label="Theme de l'interface"
      className="flex items-center gap-1 rounded-app-control bg-app-surface-hover p-1"
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const selected = theme === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => consoleThemeStore.set(option.value)}
            className={cn(
              "flex h-7 flex-1 items-center justify-center gap-2 rounded-app-control text-app-xs transition-colors focus-visible:outline-app",
              selected
                ? "bg-app-surface font-medium text-app-text"
                : "text-app-text-muted hover:text-app-text-secondary",
            )}
          >
            <Icon className="h-4 w-4" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
