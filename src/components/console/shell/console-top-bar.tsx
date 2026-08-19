"use client";

import { Menu, Send } from "lucide-react";

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
};

export function ConsoleTopBar({
  config,
  breadcrumb,
  displayName,
  email,
  onSignOut,
  onOpenMobileNav,
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

      {/*
        Droite : messages, notifications, compte.

        La barre de recherche a ete retiree a la demande. La palette de commandes reste
        atteignable au clavier par Ctrl+K — le raccourci est pose par `ConsoleShell`, pas
        par ce bouton — mais elle n'a plus de point d'entree visible.
      */}
      <div className="flex flex-1 items-center justify-end gap-1">
        <button
          type="button"
          aria-label="Messages"
          className="flex h-8 w-8 items-center justify-center rounded-app-control text-app-text-muted transition-colors hover:bg-app-surface-hover hover:text-app-text focus-visible:outline-app"
        >
          <Send className="h-4 w-4" />
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
