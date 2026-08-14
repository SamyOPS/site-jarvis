"use client";

import { Menu, Search } from "lucide-react";

import { ConsoleAccountMenu } from "@/components/console/shell/console-account-menu";
import { ConsoleBreadcrumb } from "@/components/console/shell/console-breadcrumb";
import { ConsoleNotifications } from "@/components/console/shell/console-notifications";
import type { ConsoleCrumb, ConsoleNavConfig } from "@/features/dashboard/shell/nav-config";

type ConsoleTopBarProps = {
  config: ConsoleNavConfig;
  breadcrumb: ConsoleCrumb[];
  displayName: string;
  email: string;
  onSignOut: () => void | Promise<void>;
  onOpenMobileNav: () => void;
  onOpenSearch: () => void;
};

export function ConsoleTopBar({
  config,
  breadcrumb,
  displayName,
  email,
  onSignOut,
  onOpenMobileNav,
  onOpenSearch,
}: ConsoleTopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-app-topbar shrink-0 items-center gap-3 border-b border-app-line bg-app-canvas px-4">
      {/* Gauche : ouverture du tiroir mobile + fil d'Ariane. */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Ouvrir la navigation"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-app-control text-app-text-muted transition-colors hover:bg-app-surface-hover hover:text-app-text focus-visible:outline-app lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>

        <ConsoleBreadcrumb items={breadcrumb} />
      </div>

      {/* Centre : recherche globale. Un vrai bouton focusable, contrairement
          au <span> decoratif des anciens workspaces. */}
      <div className="hidden w-full max-w-sm shrink-0 md:block">
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex h-8 w-full items-center gap-2 rounded-app-control border border-app-line bg-app-field px-3 text-app-sm text-app-text-muted transition-colors hover:border-app-line-strong hover:text-app-text-secondary focus-visible:outline-app"
        >
          <Search aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span className="truncate">Rechercher...</span>
          <kbd className="ml-auto shrink-0 rounded border border-app-line px-1 font-app text-app-xs text-app-text-muted">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Droite : recherche compacte, notifications, compte. */}
      <div className="flex flex-1 items-center justify-end gap-1">
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Rechercher"
          className="flex h-8 w-8 items-center justify-center rounded-app-control text-app-text-muted transition-colors hover:bg-app-surface-hover hover:text-app-text focus-visible:outline-app md:hidden"
        >
          <Search className="h-4 w-4" />
        </button>

        <ConsoleNotifications />

        <ConsoleAccountMenu
          config={config}
          displayName={displayName}
          email={email}
          onSignOut={onSignOut}
          variant="avatar"
          align="bottom"
          side="right"
        />
      </div>
    </header>
  );
}
