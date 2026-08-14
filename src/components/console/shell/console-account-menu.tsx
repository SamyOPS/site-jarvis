"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ChevronsUpDown, LogOut, Settings } from "lucide-react";

import { cn } from "@/lib/utils";
import { ConsoleThemeSwitch } from "@/components/console/shell/console-theme-switch";
import { useDismissable } from "@/components/console/shell/use-dismissable";
import type { ConsoleNavConfig } from "@/features/dashboard/shell/nav-config";

type ConsoleAccountMenuProps = {
  config: ConsoleNavConfig;
  displayName: string;
  email: string;
  onSignOut: () => void | Promise<void>;
  onNavigate?: () => void;
  /** `block` = bloc profil de la sidebar, `avatar` = pastille seule. */
  variant: "block" | "avatar";
  /** Ouverture vers le haut (pied de sidebar) ou vers le bas (top bar). */
  align: "top" | "bottom";
  /**
   * Bord d'ancrage horizontal. Depuis la sidebar repliee (64px), un menu
   * ancre a droite sortirait de l'ecran : il s'ancre donc a gauche.
   */
  side: "left" | "right";
};

function getInitials(displayName: string, email: string) {
  const source = displayName.trim() || email.trim();
  if (!source) return "?";

  const words = source.split(/[\s._-]+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function ConsoleAccountMenu({
  config,
  displayName,
  email,
  onSignOut,
  onNavigate,
  variant,
  align,
  side,
}: ConsoleAccountMenuProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const containerRef = useDismissable<HTMLDivElement>(open, close);

  const initials = getInitials(displayName, email);

  const avatar = (
    <span
      aria-hidden="true"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-app-xs font-semibold text-app-accent-fg"
    >
      {initials}
    </span>
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={variant === "avatar" ? `Mon compte — ${displayName}` : undefined}
        className={cn(
          "flex items-center rounded-app-control transition-colors focus-visible:outline-app",
          variant === "block"
            ? "w-full gap-2 p-2 text-left hover:bg-app-surface-hover"
            : "h-8 w-8 justify-center hover:bg-app-surface-hover",
          open && "bg-app-surface-hover",
        )}
      >
        {avatar}
        {variant === "block" && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-app-sm font-medium text-app-text">
                {displayName}
              </span>
              <span className="block truncate text-app-xs text-app-text-muted">
                {config.roleLabel}
              </span>
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-app-text-muted" />
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-50 w-64 rounded-app-card border border-app-line bg-app-raised p-2 shadow-app-raised",
            align === "top" ? "bottom-full mb-2" : "top-full mt-2",
            side === "right" ? "right-0" : "left-0",
          )}
        >
          <div className="flex items-center gap-2 px-2 py-2">
            {avatar}
            <div className="min-w-0">
              <p className="truncate text-app-sm font-medium text-app-text">
                {displayName}
              </p>
              <p className="truncate text-app-xs text-app-text-muted">{email}</p>
            </div>
          </div>

          <div className="my-2 h-px bg-app-line" />

          <Link
            href={config.settingsHref}
            role="menuitem"
            onClick={() => {
              close();
              onNavigate?.();
            }}
            className="flex h-8 items-center gap-2 rounded-app-control px-2 text-app-sm text-app-text-secondary transition-colors hover:bg-app-surface-hover hover:text-app-text focus-visible:outline-app"
          >
            <Settings className="h-4 w-4 text-app-text-muted" />
            Gerer mon compte
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close();
              void onSignOut();
            }}
            className="flex h-8 w-full items-center gap-2 rounded-app-control px-2 text-app-sm text-app-text-secondary transition-colors hover:bg-app-surface-hover hover:text-app-text focus-visible:outline-app"
          >
            <LogOut className="h-4 w-4 text-app-text-muted" />
            Se deconnecter
          </button>

          <div className="my-2 h-px bg-app-line" />

          <div className="px-1 pb-1">
            <p className="mb-2 px-1 text-app-xs text-app-text-muted">Apparence</p>
            <ConsoleThemeSwitch />
          </div>
        </div>
      )}
    </div>
  );
}
