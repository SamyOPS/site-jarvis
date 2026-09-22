"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { ConsoleShell } from "@/components/console/shell/console-shell";
import { ConsoleLoadingSkeleton } from "@/components/console/feedback/loading-skeleton";
import { MessagesView } from "@/components/messaging/messages-view";
import { displayNameFromMetadata } from "@/domain/profiles";
import { forceClientSignOut, safeGetClientSession } from "@/lib/client-auth";
import { resetAppearanceHydration } from "@/features/account/appearance-store";
import { resetAccountIdentity } from "@/features/account/identity-store";
import { browserSupabase as supabase } from "@/lib/supabase-browser";
import type { ConsoleRole } from "@/features/dashboard/shell/nav-config";

type MessagesWorkspaceProps = {
  role: ConsoleRole;
};

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  professional_status: string | null;
};

/**
 * Page de messagerie d'un espace.
 *
 * Elle ne passe PAS par `rh-workspace` / `salarie-workspace` : ces deux composants
 * chargent l'integralite des donnees de leur espace — collaborateurs, documents,
 * demandes, offres — pour afficher une section. Ouvrir la messagerie n'a aucune raison
 * de declencher tout cela. Le prix a payer est la reprise du preambule de session
 * ci-dessous, qui reste court et sans logique metier.
 */
export function MessagesWorkspace({ role }: MessagesWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  /*
    Sans configuration Supabase il n'y a rien a charger : l'etat part directement a
    « charge ». Le poser a `true` puis le corriger dans l'effet ferait un rendu de trop,
    et c'est exactement ce que la regle `set-state-in-effect` signale.
  */
  const [loading, setLoading] = useState(Boolean(supabase));

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

      // Meme garde que les deux espaces : le bon role ET un compte verifie. La
      // messagerie n'est pas une porte derobee vers la console.
      if (error || !data || data.role !== role || data.professional_status !== "verified") {
        router.push("/auth");
        return;
      }

      setUser(session.user);
      setProfile(data as ProfileRow);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [role, router]);

  const handleSignOut = useCallback(async () => {
    if (!supabase) return;
    // Les preferences et l'identite sont propres au compte : on ne les laisse pas
    // en place pour celui qui se connectera ensuite dans le meme onglet.
    resetAppearanceHydration();
    resetAccountIdentity();
    await forceClientSignOut(supabase);
    router.push("/auth?logged_out=1");
  }, [router]);

  const displayName =
    displayNameFromMetadata(user?.user_metadata) ??
    profile?.full_name ??
    profile?.email ??
    "utilisateur";

  return (
    <ConsoleShell
      role={role}
      displayName={displayName}
      email={profile?.email ?? user?.email ?? "-"}
      onSignOut={handleSignOut}
      pageDescription={
        role === "rh"
          ? "Échanges avec vos collaborateurs et les autres gestionnaires RH."
          : "Échanges avec le service RH."
      }
    >
      {loading || !profile ? (
        <ConsoleLoadingSkeleton label="Chargement de la messagerie..." showStats={false} />
      ) : (
        <MessagesView
          currentUserId={profile.id}
          initialConversationId={searchParams.get("c")}
          initialContactId={searchParams.get("to")}
          emptyHint={
            role === "rh"
              ? "Écrivez à un collaborateur ou à un collègue."
              : "Écrivez au service RH qui vous suit."
          }
        />
      )}
    </ConsoleShell>
  );
}
