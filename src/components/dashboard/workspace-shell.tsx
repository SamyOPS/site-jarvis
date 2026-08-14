"use client";

import type { ReactNode } from "react";

import { Search, SlidersHorizontal } from "lucide-react";

import { DashboardMobileHeader } from "@/components/dashboard/mobile-header";
import { DashboardProfileMenu } from "@/components/dashboard/profile-menu";
import { DashboardSidebarNav } from "@/components/dashboard/sidebar-nav";
import type { SidebarConfig } from "@/features/dashboard/shell/sidebar-config";

type WorkspaceShellProps = {
  nav: SidebarConfig;
  currentSection: string;
  currentSubSection: string;
  /** "Espace RH", "Espace salarie"... affiche dans le menu profil et l'en-tete mobile. */
  roleLabel: string;
  settingsHref: string;
  searchPlaceholder: string;
  email: string;
  displayName: string;
  onSignOut: () => void | Promise<void>;
  /**
   * Contenu de l'espace, puis les dialogues et la surcouche de chargement. Ces derniers
   * etaient auparavant rendus en frere du bloc de mise en page ; les placer ici ne change
   * rien a l'affichage : les dialogues Radix sont portalises vers `body`, et la surcouche
   * est en `fixed` sans ancetre creant un bloc conteneur.
   */
  children: ReactNode;
};

/**
 * Coque commune aux espaces du tableau de bord : barre laterale fixe, gouttiere droite,
 * en-tete mobile, barre de recherche et menu profil, autour d'un panneau de contenu.
 *
 * Les deux espaces en portaient chacun une copie ne differant que par quatre valeurs :
 * la configuration de navigation, le libelle de role, le lien des parametres et le texte
 * de la barre de recherche. Ce sont exactement les quatre props ci-dessus.
 *
 * La barre de recherche n'est pas fonctionnelle a ce stade — elle ne l'etait pas non plus
 * dans les deux copies d'origine, et ce lot ne change aucun comportement.
 */
export function WorkspaceShell({
  nav,
  currentSection,
  currentSubSection,
  roleLabel,
  settingsHref,
  searchPlaceholder,
  email,
  displayName,
  onSignOut,
  children,
}: WorkspaceShellProps) {
  const settingsActive = currentSection === "parametres";

  const renderNav = (onNavigate?: () => void) => (
    <DashboardSidebarNav
      config={nav}
      currentSection={currentSection}
      currentSubSection={currentSubSection}
      onSignOut={onSignOut}
      onNavigate={onNavigate}
    />
  );

  return (
    <div className="h-[100dvh] overflow-hidden bg-[#f3f6fc] text-[#0A1A2F]">
      <div className="relative h-full">
        <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:block lg:w-[232px]">
          {renderNav()}
        </aside>

        <aside className="hidden lg:fixed lg:inset-y-0 lg:right-0 lg:block lg:w-[48px]">
          <div className="flex h-full items-stretch justify-center px-2 py-5" />
        </aside>

        <main className="flex h-full flex-col overflow-hidden px-3 py-2 lg:ml-[232px] lg:mr-[48px] lg:px-3 lg:py-3">
          <DashboardMobileHeader
            brand={nav.brand}
            email={email}
            displayName={displayName}
            roleLabel={roleLabel}
            settingsHref={settingsHref}
            settingsActive={settingsActive}
            onSignOut={onSignOut}
            renderNav={() => renderNav()}
          />
          <div className="hidden lg:flex items-center rounded-[22px] px-2 py-1.5">
            <div className="flex min-w-0 flex-1 items-center">
              <div className="flex w-full max-w-lg items-center gap-3 rounded-full border border-white/70 bg-white/70 px-5 py-3 backdrop-blur">
                <Search className="h-4 w-4 text-[#0A1A2F]/55" />
                <span className="text-sm text-[#0A1A2F]/55">{searchPlaceholder}</span>
                <SlidersHorizontal className="ml-auto h-4 w-4 text-[#0A1A2F]/45" />
              </div>
            </div>
          </div>
          <DashboardProfileMenu
            onSignOut={onSignOut}
            email={email}
            displayName={displayName}
            roleLabel={roleLabel}
            settingsHref={settingsHref}
            settingsActive={settingsActive}
            routeKey={`${currentSection}|${currentSubSection}`}
          />

          <div className="mt-2 min-h-0 flex-1 overflow-y-auto rounded-[22px] border border-white/70 bg-white px-4 py-6 overscroll-contain lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
