"use client";

import Link from "next/link";
import { PanelLeft, PanelLeftClose } from "lucide-react";

import { cn } from "@/lib/utils";
import { ConsoleMark } from "@/components/console/shell/console-mark";
import { ConsoleAccountMenu } from "@/components/console/shell/console-account-menu";
import {
  getActiveChild,
  isChildActive,
  isEntryActive,
  type ConsoleNavConfig,
} from "@/features/dashboard/shell/nav-config";

type ConsoleSidebarProps = {
  config: ConsoleNavConfig;
  pathname: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  displayName: string;
  email: string;
  onSignOut: () => void | Promise<void>;
  /** Ferme le tiroir mobile apres navigation. */
  onNavigate?: () => void;
  /** Le tiroir mobile est toujours deploye : pas de bouton de repli. */
  showCollapseToggle?: boolean;
  className?: string;
};

export function ConsoleSidebar({
  config,
  pathname,
  collapsed,
  onToggleCollapsed,
  displayName,
  email,
  onSignOut,
  onNavigate,
  showCollapseToggle = true,
  className,
}: ConsoleSidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-app-line bg-app-surface",
        className,
      )}
    >
      {/* En-tete : aligne sur la hauteur de la top bar pour que la bordure
          basse des deux zones soit continue. */}
      <div
        className={cn(
          "flex h-app-topbar shrink-0 items-center border-b border-app-line",
          collapsed ? "justify-center px-2" : "gap-2 px-4",
        )}
      >
        <Link
          href="/"
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-2 rounded-app-control focus-visible:outline-app"
          aria-label="Jarvis Connect — retour au site"
        >
          <ConsoleMark />
          {!collapsed && (
            <span className="truncate text-app-sm font-semibold text-app-text">
              Jarvis Connect
            </span>
          )}
        </Link>

        {showCollapseToggle && !collapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label="Replier la navigation"
            title="Replier la navigation"
            className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-app-control text-app-text-muted transition-colors hover:bg-app-surface-hover hover:text-app-text focus-visible:outline-app"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {showCollapseToggle && collapsed && (
        <div className="flex justify-center border-b border-app-line py-2">
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label="Deplier la navigation"
            title="Deplier la navigation"
            className="flex h-8 w-8 items-center justify-center rounded-app-control text-app-text-muted transition-colors hover:bg-app-surface-hover hover:text-app-text focus-visible:outline-app"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        </div>
      )}

      <nav
        aria-label="Navigation principale"
        className={cn(
          "min-h-0 flex-1 overflow-y-auto py-4",
          collapsed ? "px-2" : "px-3",
        )}
      >
        {config.groups.map((group, groupIndex) => (
          <div
            key={group.label ?? `group-${groupIndex}`}
            className={groupIndex > 0 ? "mt-6" : undefined}
          >
            {group.label &&
              (collapsed ? (
                <div className="mx-auto mb-2 h-px w-6 bg-app-line" />
              ) : (
                <p className="mb-2 px-2 text-app-xs font-medium tracking-wider text-app-text-muted uppercase">
                  {group.label}
                </p>
              ))}

            <ul className="space-y-1">
              {group.items.map((entry) => {
                const active = isEntryActive(entry, pathname);
                const activeChild = getActiveChild(entry, pathname);
                const Icon = entry.icon;

                return (
                  <li key={entry.href}>
                    <Link
                      href={entry.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      title={collapsed ? entry.label : undefined}
                      className={cn(
                        "relative flex h-8 items-center rounded-app-control text-app-sm transition-colors focus-visible:outline-app",
                        collapsed ? "justify-center px-0" : "gap-3 px-3",
                        active
                          ? "bg-app-accent-soft font-medium text-app-text"
                          : "text-app-text-secondary hover:bg-app-surface-hover hover:text-app-text",
                      )}
                    >
                      {/* Barre d'accent de l'item actif. */}
                      {active && (
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-app-accent"
                        />
                      )}
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active ? "text-app-accent-fg" : "text-app-text-muted",
                        )}
                      />
                      {!collapsed && <span className="truncate">{entry.label}</span>}
                      {collapsed && <span className="sr-only">{entry.label}</span>}
                    </Link>

                    {/* Sous-navigation : uniquement quand la section est
                        ouverte et la sidebar deployee. */}
                    {!collapsed && active && entry.children && (
                      <ul className="mt-1 ml-4 space-y-1 border-l border-app-line pl-3">
                        {entry.children.map((child) => {
                          const childActive =
                            activeChild?.href === child.href &&
                            isChildActive(child, pathname);

                          return (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                onClick={onNavigate}
                                aria-current={childActive ? "page" : undefined}
                                className={cn(
                                  "flex h-7 items-center rounded-app-control px-2 text-app-xs transition-colors focus-visible:outline-app",
                                  childActive
                                    ? "bg-app-surface-hover font-medium text-app-text"
                                    : "text-app-text-muted hover:bg-app-surface-hover hover:text-app-text-secondary",
                                )}
                              >
                                <span className="truncate">{child.label}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div
        className={cn(
          "shrink-0 border-t border-app-line p-2",
          collapsed && "flex justify-center",
        )}
      >
        <ConsoleAccountMenu
          config={config}
          displayName={displayName}
          email={email}
          onSignOut={onSignOut}
          onNavigate={onNavigate}
          variant={collapsed ? "avatar" : "block"}
          align="top"
          side="left"
        />
      </div>
    </aside>
  );
}
