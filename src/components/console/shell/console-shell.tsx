"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { sidebarCollapsedPreference } from "@/lib/console-preferences";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ConsoleSidebar } from "@/components/console/shell/console-sidebar";
import { ConsoleTopBar } from "@/components/console/shell/console-top-bar";
import { ConsolePageHeader } from "@/components/console/shell/console-page-header";
import {
  ConsoleCommandPalette,
  type ConsoleCommandGroup,
} from "@/components/console/shell/console-command-palette";
import {
  CONSOLE_NAV_CONFIGS,
  getConsoleBreadcrumb,
  getConsolePageTitle,
  type ConsoleRole,
} from "@/features/dashboard/shell/nav-config";

type ConsoleShellProps = {
  role: ConsoleRole;
  displayName: string;
  email: string;
  onSignOut: () => void | Promise<void>;
  /** Par defaut, derive de la navigation pour la route courante. */
  pageTitle?: string;
  pageDescription?: ReactNode;
  pageActions?: ReactNode;
  /** A activer quand la section rend deja son propre en-tete. */
  hidePageHeader?: boolean;
  searchGroups?: ConsoleCommandGroup[];
  children: ReactNode;
};

/**
 * Shell applicatif de la console.
 *
 * Remplace le shell qui etait ecrit en dur, a l'identique, dans
 * rh-workspace.tsx et salarie-workspace.tsx. Il supprime au passage la
 * colonne fantome de 48px et la fausse barre de recherche.
 *
 * L'etat actif de la navigation vient de usePathname(), pas des props
 * currentSection / currentSubSection : celles-ci restent intactes et
 * continuent de piloter le contenu des workspaces.
 */
export function ConsoleShell({
  role,
  displayName,
  email,
  onSignOut,
  pageTitle,
  pageDescription,
  pageActions,
  hidePageHeader = false,
  searchGroups,
  children,
}: ConsoleShellProps) {
  const config = CONSOLE_NAV_CONFIGS[role];
  const pathname = usePathname() ?? config.rootHref;

  const collapsed = useSyncExternalStore(
    sidebarCollapsedPreference.subscribe,
    sidebarCollapsedPreference.getSnapshot,
    sidebarCollapsedPreference.getServerSnapshot,
  );

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const toggleCollapsed = useCallback(() => {
    sidebarCollapsedPreference.set(!sidebarCollapsedPreference.getSnapshot());
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k") return;
      if (!event.metaKey && !event.ctrlKey) return;
      event.preventDefault();
      setSearchOpen((value) => !value);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const breadcrumb = getConsoleBreadcrumb(config, pathname);
  const title = pageTitle ?? getConsolePageTitle(config, pathname);

  const sidebarProps = {
    config,
    pathname,
    displayName,
    email,
    onSignOut,
  };

  return (
    <div
      data-app="console"
      className="flex h-[100dvh] w-full overflow-hidden bg-app-canvas font-app text-app-text"
    >
      <ConsoleSidebar
        {...sidebarProps}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        className={cn(
          "hidden shrink-0 transition-[width] duration-200 ease-out lg:flex",
          collapsed ? "w-app-sidebar-collapsed" : "w-app-sidebar",
        )}
      />

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          className="w-app-sidebar max-w-[85vw] border-app-line bg-app-surface p-0"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <ConsoleSidebar
            {...sidebarProps}
            collapsed={false}
            onToggleCollapsed={toggleCollapsed}
            showCollapseToggle={false}
            onNavigate={closeMobileNav}
            className="border-r-0"
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <ConsoleTopBar
          config={config}
          breadcrumb={breadcrumb}
          displayName={displayName}
          email={email}
          onSignOut={onSignOut}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onOpenSearch={openSearch}
        />

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto w-full max-w-app-content px-4 py-6 lg:px-8 lg:py-8">
            {!hidePageHeader && (
              <ConsolePageHeader
                title={title}
                description={pageDescription}
                actions={pageActions}
              />
            )}
            {children}
          </div>
        </main>
      </div>

      <ConsoleCommandPalette
        open={searchOpen}
        onOpenChange={setSearchOpen}
        config={config}
        extraGroups={searchGroups}
      />
    </div>
  );
}
