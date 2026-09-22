"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  CreditCard,
  Palette,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { cn } from "@/lib/utils";
import { ConsoleShell } from "@/components/console/shell/console-shell";
import { ConsoleLoadingSkeleton } from "@/components/console/feedback/loading-skeleton";
import { StatusNotice } from "@/components/dashboard/status-notice";
import { AppearanceTab } from "@/components/account/appearance-tab";
import { BillingTab } from "@/components/account/billing-tab";
import { NotificationsTab } from "@/components/account/notifications-tab";
import { ProfileTab } from "@/components/account/profile-tab";
import { SecurityTab } from "@/components/account/security-tab";
import { useAccountSettings } from "@/features/account/use-account-settings";
import { resetAppearanceHydration } from "@/features/account/appearance-store";
import { displayNameFromMetadata } from "@/domain/profiles";
import { forceClientSignOut, safeGetClientSession } from "@/lib/client-auth";
import { browserSupabase as supabase } from "@/lib/supabase-browser";
import type { ConsoleRole } from "@/features/dashboard/shell/nav-config";

type SettingsWorkspaceProps = {
  role: ConsoleRole;
};

type TabId = "profil" | "apparence" | "notifications" | "securite" | "facturation";

type TabDefinition = {
  id: TabId;
  label: string;
  icon: LucideIcon;
  /** Reserve a un role. Absent = visible par tous. */
  role?: ConsoleRole;
};

/**
 * Onglets, dans l'ordre d'importance decroissante : ce qu'on vient regler le plus souvent
 * en premier. La facturation ferme la marche et n'existe que pour un consultant.
 */
const TABS: TabDefinition[] = [
  { id: "profil", label: "Profil", icon: UserRound },
  { id: "apparence", label: "Apparence", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "securite", label: "Sécurité", icon: ShieldCheck },
  { id: "facturation", label: "Facturation", icon: CreditCard, role: "salarie" },
];

function isTabId(value: string | null): value is TabId {
  return TABS.some((tab) => tab.id === value);
}

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  professional_status: string | null;
};

/**
 * Page de parametres.
 *
 * Comme la messagerie, elle ne passe PAS par les workspaces : afficher ses reglages n'a
 * aucune raison de charger collaborateurs, documents, demandes et offres. C'est ce que
 * faisait l'ancienne page, qui n'etait qu'une section de plus dans un composant de 1500
 * lignes.
 *
 * L'onglet courant vit dans l'URL (`?section=`) : un lien vers « Sécurité » est donc
 * partageable, et le bouton Retour du navigateur fait ce qu'on attend.
 */
export function SettingsWorkspace({ role }: SettingsWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<User | null>(null);
  const [sessionProfile, setSessionProfile] = useState<ProfileRow | null>(null);
  const [loadingSession, setLoadingSession] = useState(Boolean(supabase));
  const [billingMessage, setBillingMessage] = useState<string | null>(null);

  const settings = useAccountSettings();

  const tabs = useMemo(() => TABS.filter((tab) => !tab.role || tab.role === role), [role]);
  const requested = searchParams.get("section");
  const activeTab: TabId = isTabId(requested) && tabs.some((tab) => tab.id === requested)
    ? requested
    : "profil";

  const selectTab = useCallback(
    (tab: TabId) => {
      // `replace` et non `push` : parcourir cinq onglets ne doit pas remplir l'historique
      // de cinq entrees a remonter une par une.
      router.replace(`/dashboard/${role}/parametres?section=${tab}`, { scroll: false });
    },
    [role, router],
  );

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let cancelled = false;

    void (async () => {
      const { session } = await safeGetClientSession(client);
      if (cancelled) return;

      if (!session?.user) {
        router.push("/auth");
        return;
      }

      const { data, error } = await client
        .from("profiles")
        .select("id,email,full_name,role,professional_status")
        .eq("id", session.user.id)
        .single();

      if (cancelled) return;

      if (error || !data || data.role !== role || data.professional_status !== "verified") {
        router.push("/auth");
        return;
      }

      setUser(session.user);
      setSessionProfile(data as ProfileRow);
      setLoadingSession(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [role, router]);

  const handleSignOut = useCallback(async () => {
    if (!supabase) return;
    resetAppearanceHydration();
    await forceClientSignOut(supabase);
    router.push("/auth?logged_out=1");
  }, [router]);

  const displayName =
    displayNameFromMetadata(user?.user_metadata) ??
    settings.profile?.fullName ??
    sessionProfile?.full_name ??
    sessionProfile?.email ??
    "utilisateur";

  const ready = !loadingSession && !settings.loading && settings.profile;

  return (
    <ConsoleShell
      role={role}
      displayName={displayName}
      email={settings.profile?.email ?? sessionProfile?.email ?? "-"}
      onSignOut={handleSignOut}
      pageDescription="Votre compte, l'apparence de la console et vos notifications."
    >
      {!ready ? (
        <ConsoleLoadingSkeleton label="Chargement des paramètres..." showStats={false} />
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row">
          {/*
            Onglets : colonne a gauche sur grand ecran, rangee defilante au-dessus du
            contenu sur mobile — une colonne de 180px y mangerait la moitie de la largeur.
          */}
          <nav
            aria-label="Sections des paramètres"
            className="lg:w-52 lg:shrink-0"
          >
            <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = tab.id === activeTab;
                return (
                  <li key={tab.id} className="shrink-0 lg:shrink">
                    <button
                      type="button"
                      onClick={() => selectTab(tab.id)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-app-control px-3 py-2 text-app-sm transition-colors focus-visible:outline-app",
                        active
                          ? "bg-app-surface-hover font-medium text-app-text"
                          : "text-app-text-secondary hover:bg-app-surface-hover hover:text-app-text",
                      )}
                    >
                      <Icon
                        aria-hidden="true"
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active ? "text-app-text" : "text-app-text-muted",
                        )}
                      />
                      {tab.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="min-w-0 flex-1 space-y-2">
            {settings.feedback && (
              <StatusNotice
                tone={settings.feedback.tone === "error" ? "error" : undefined}
                title={settings.feedback.tone === "error" ? "Paramètres" : undefined}
                message={settings.feedback.text}
              />
            )}
            {billingMessage && <StatusNotice message={billingMessage} />}

            {activeTab === "profil" && settings.profile && (
              <ProfileTab
                profile={settings.profile}
                savingProfile={settings.savingProfile}
                savingAvatar={settings.savingAvatar}
                onSave={settings.saveProfile}
                onChangeEmail={settings.changeEmail}
                onUploadAvatar={settings.uploadAvatar}
                onRemoveAvatar={settings.removeAvatar}
              />
            )}

            {activeTab === "apparence" && (
              <AppearanceTab
                appearance={settings.appearance}
                onChange={settings.updateAppearance}
              />
            )}

            {activeTab === "notifications" && (
              <NotificationsTab
                notifications={settings.notifications}
                onChange={settings.updateNotifications}
              />
            )}

            {activeTab === "securite" && (
              <SecurityTab
                email={settings.profile?.email ?? null}
                lastSignInAt={settings.lastSignInAt}
                onSignOutEverywhere={handleSignOut}
              />
            )}

            {activeTab === "facturation" && role === "salarie" && (
              <BillingTab
                email={settings.profile?.email ?? null}
                onMessage={setBillingMessage}
              />
            )}
          </div>
        </div>
      )}
    </ConsoleShell>
  );
}
