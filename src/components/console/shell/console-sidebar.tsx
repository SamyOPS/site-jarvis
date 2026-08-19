"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, PanelLeft, PanelLeftClose } from "lucide-react";

import { cn } from "@/lib/utils";
import { ConsoleMark } from "@/components/console/shell/console-mark";
import {
  CONSOLE_FOOTER,
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
  onNavigate,
  showCollapseToggle = true,
  className,
}: ConsoleSidebarProps) {
  /**
   * Sections depliees, par href. Une entree absente retombe sur « ouverte si active ».
   * Etat LOCAL au composant : la barre laterale est rendue deux fois (colonne de bureau
   * et tiroir mobile), et il n'y a aucune raison que replier une section sur l'une la
   * replie sur l'autre — elles ne sont jamais visibles en meme temps.
   */
  const [openEntries, setOpenEntries] = useState<Record<string, boolean>>({});

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
          {/* 14px, comme les entrees de navigation : sur la maquette la marque ne se
              distingue que par sa graisse et par le filet sous l'en-tete. */}
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
                <p className="mb-2 px-3 text-app-xs font-normal text-app-text-muted">
                  {group.label}
                </p>
              ))}

            <ul className="space-y-1">
              {group.items.map((entry) => {
                const active = isEntryActive(entry, pathname);
                const activeChild = getActiveChild(entry, pathname);
                const Icon = entry.icon;

                const hasChildren = Boolean(entry.children?.length);
                // Etat par defaut : la section active est ouverte, les autres fermees.
                // Des que l'utilisateur agit sur le chevron, son choix prime.
                const open = openEntries[entry.href] ?? active;

                // Un parent a sous-categories ne NAVIGUE PLUS : il ne fait que se
                // deplier. Sa destination n'est pas perdue pour autant — elle est le
                // premier de ses enfants (« Tous les collaborateurs », « Tous les
                // documents »), verifie pour les trois entrees concernees.
                // Barre repliee, il n'y a pas de place pour deplier : le lien revient.
                const toggleOnly = hasChildren && !collapsed;

                const rowClass = cn(
                  "flex h-9 w-full min-w-0 items-center rounded-app-control text-app-sm transition-colors focus-visible:outline-app",
                  collapsed ? "justify-center px-0" : "gap-3 px-3",
                  active
                    ? "bg-app-surface-hover font-medium text-app-text"
                    : "text-app-text-secondary hover:bg-app-surface-hover hover:text-app-text",
                );

                const rowContent = (
                  <>
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        active ? "text-app-text" : "text-app-text-muted",
                      )}
                    />
                    {!collapsed && <span className="truncate">{entry.label}</span>}
                    {collapsed && <span className="sr-only">{entry.label}</span>}
                    {toggleOnly && (
                      <ChevronDown
                        aria-hidden="true"
                        className={cn(
                          "ml-auto h-4 w-4 shrink-0 text-app-text-muted transition-transform duration-200",
                          open && "rotate-180",
                        )}
                      />
                    )}
                  </>
                );

                return (
                  <li key={entry.href}>
                    {toggleOnly ? (
                      <button
                        type="button"
                        onClick={() =>
                          setOpenEntries((previous) => ({
                            ...previous,
                            [entry.href]: !open,
                          }))
                        }
                        aria-expanded={open}
                        className={rowClass}
                      >
                        {rowContent}
                      </button>
                    ) : (
                      <Link
                        href={entry.href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        title={collapsed ? entry.label : undefined}
                        className={rowClass}
                      >
                        {rowContent}
                      </Link>
                    )}

                    {/* Sous-navigation : depliee a la demande, jamais quand la barre
                        laterale est repliee. */}
                    {!collapsed && open && entry.children && (
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
                                  "flex h-8 items-center rounded-app-control px-2 text-app-xs transition-colors focus-visible:outline-app",
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

      {/*
        Pied : encart d'annonce, liens d'aide, mention legale.

        Entierement masque quand la barre est repliee — a 64px de large, l'encart serait
        illisible et les liens tronques.

        Une entree sans `href` n'est PAS un lien : le centre d'aide, la documentation et le
        changelog n'ont pas tous une page. Rendre un <a> vers nulle part donnerait un lien
        qui parait actif et ne fait rien ; on affiche donc un texte grise, marque
        `aria-disabled`, qu'il suffit de pointer pour activer.
      */}
      {!collapsed && (
        <div className="shrink-0 border-t border-app-line px-3 py-4">
          {/* Filet separant l'annonce des liens d'aide : deux blocs de nature differente. */}
          {CONSOLE_FOOTER.note && (
            <div className="mb-4 border-b border-app-line pb-4">
              <p className="text-app-2xs font-medium tracking-wider text-app-text-muted uppercase">
                {CONSOLE_FOOTER.note.eyebrow}
              </p>
              <p className="mt-2 text-app-xs font-semibold text-app-text">
                {CONSOLE_FOOTER.note.title}
              </p>
              <p className="mt-1 text-app-xs text-app-text-muted">
                {CONSOLE_FOOTER.note.description}
              </p>
              {CONSOLE_FOOTER.note.href ? (
                <Link
                  href={CONSOLE_FOOTER.note.href}
                  onClick={onNavigate}
                  className="mt-2 inline-block text-app-xs text-app-text-secondary underline underline-offset-2 transition-colors hover:text-app-text focus-visible:outline-app"
                >
                  {CONSOLE_FOOTER.note.linkLabel}
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className="mt-2 inline-block text-app-xs text-app-text-muted"
                >
                  {CONSOLE_FOOTER.note.linkLabel}
                </span>
              )}
            </div>
          )}

          {/* Meme gabarit que les entrees de navigation : icone 16px, gap-3, hauteur 32px. */}
          <ul className="space-y-1">
            {CONSOLE_FOOTER.links.map((link) => {
              const Icon = link.icon;

              return (
                <li key={link.label}>
                  {link.href ? (
                    <Link
                      href={link.href}
                      onClick={onNavigate}
                      className="flex h-9 items-center gap-3 rounded-app-control px-3 text-app-sm text-app-text-secondary transition-colors hover:bg-app-surface-hover hover:text-app-text focus-visible:outline-app"
                    >
                      <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-app-text-muted" />
                      <span className="truncate">{link.label}</span>
                    </Link>
                  ) : (
                    <span
                      aria-disabled="true"
                      className="flex h-9 items-center gap-3 px-3 text-app-sm text-app-text-muted/60"
                    >
                      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                      <span className="truncate">{link.label}</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          <p className="mt-4 px-3 text-app-2xs text-app-text-muted/70">
            {CONSOLE_FOOTER.legal}
          </p>
        </div>
      )}

      {/*
        Pas de bloc de compte ici : l'avatar de la barre superieure porte deja le menu
        (parametres, deconnexion). En avoir deux ouvrait le meme menu depuis deux endroits.
      */}
    </aside>
  );
}
