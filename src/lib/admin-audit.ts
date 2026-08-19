import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Journalisation des actions d'administration sensibles.
 *
 * REGLE ABSOLUE : aucun secret n'entre ici. Ni mot de passe, ni jeton, ni empreinte. Le
 * journal atteste QU'UNE action a eu lieu, jamais de son contenu confidentiel.
 *
 * L'ecriture ne doit JAMAIS faire echouer l'action metier : un journal indisponible est un
 * probleme d'observabilite, pas une raison de refuser une reinitialisation de mot de passe
 * a un administrateur legitime. Les erreurs sont donc avalees et tracees en console.
 */
export async function recordAdminAction(
  adminClient: SupabaseClient,
  entry: {
    actorId: string;
    actorEmail: string | null;
    targetId: string;
    targetEmail: string | null;
    action: string;
    details?: Record<string, unknown>;
  },
) {
  const { error } = await adminClient.from("admin_audit_log").insert({
    actor_id: entry.actorId,
    actor_email: entry.actorEmail,
    target_id: entry.targetId,
    target_email: entry.targetEmail,
    action: entry.action,
    details: entry.details ?? {},
  });

  if (error) {
    // Table absente (migration non appliquee) ou indisponible : on trace et on continue.
    console.error("[admin-audit] ecriture impossible", entry.action, error.message);
  }
}

/**
 * Revoque toutes les sessions ouvertes d'un utilisateur.
 *
 * `auth.admin.signOut()` de supabase-js exige le JWT de la personne visee — que le serveur
 * n'a evidemment pas. On appelle donc directement l'endpoint admin de GoTrue, avec la cle
 * de service.
 *
 * Sans cela, changer un mot de passe ne deconnecte personne : une session deja ouverte
 * reste valide jusqu'a expiration de son jeton. Pour un compte compromis, la
 * reinitialisation seule ne sert a rien.
 *
 * Rend une erreur au lieu de lever : l'appelant decide s'il s'agit d'un echec bloquant ou
 * d'un avertissement a remonter a l'utilisateur.
 */
export async function revokeUserSessions(userId: string): Promise<{ error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return { error: "Configuration Supabase incomplete." };
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}/logout`,
      {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        // `global` revoque toutes les sessions, tous appareils confondus.
        body: JSON.stringify({ scope: "global" }),
      },
    );

    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).trim();
      return { error: detail || `Deconnexion refusee (${response.status}).` };
    }
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Deconnexion impossible." };
  }
}
