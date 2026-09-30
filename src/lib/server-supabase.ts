import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export type AuthorizedProfile = {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  professional_status: string | null;
  phone: string | null;
  company_name: string | null;
  esn_partenaire: string | null;
};

export function getAccessTokenFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization");
  return authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

export function getServerSupabaseClients() {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    throw new Error("Variables Supabase serveur manquantes.");
  }

  return {
    authClient: createClient(supabaseUrl, supabaseAnonKey),
    adminClient: createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }),
  };
}

/**
 * Identite de l'appelant, lue dans son jeton verifie. Volontairement reduite a ce que
 * porte le JWT : une route qui a besoin du compte complet (derniere connexion, dates...)
 * le demande elle-meme a l'API admin.
 */
export type ActorUser = {
  id: string;
  email: string | null;
};

export async function getAuthorizedActor(accessToken: string, allowedRoles: string[]) {
  const { authClient, adminClient } = getServerSupabaseClients();
  /*
    `getClaims` et non `getUser` : avec des cles de signature asymetriques, le jeton se
    verifie localement (cles publiques mises en cache) au lieu d'un aller-retour vers le
    serveur d'authentification a CHAQUE appel d'API. Avec un secret symetrique, la
    bibliotheque retombe d'elle-meme sur `getUser`.
    Contrepartie assumee : une session fermee reste acceptee jusqu'a l'expiration de son
    jeton (une heure au plus). Le profil, lu juste apres, reste la source du role et du
    statut : un compte desactive ou retrograde est refuse immediatement.
  */
  const { data: claimsData, error: authError } = await authClient.auth.getClaims(accessToken);
  const claims = claimsData?.claims;

  if (authError || !claims?.sub) {
    return { error: authError?.message ?? "Utilisateur non authentifie.", status: 401 as const };
  }

  const user: ActorUser = {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
  };

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id,email,full_name,role,professional_status,phone,company_name,esn_partenaire")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || !allowedRoles.includes(profile.role ?? "")) {
    return { error: "Acces refuse.", status: 403 as const };
  }

  if (profile.role !== "admin" && profile.professional_status !== "verified") {
    return { error: "Compte non verifie.", status: 403 as const };
  }

  return {
    adminClient,
    user,
    profile: profile as AuthorizedProfile,
  };
}

export function isAuthorizedActorError(
  value: Awaited<ReturnType<typeof getAuthorizedActor>>,
): value is { error: string; status: 401 | 403 } {
  return "error" in value;
}

export function toIsoMonthStart(value: string) {
  const normalized = /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : value;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Periode invalide.");
  }

  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export function toDocumentDate() {
  return new Date().toISOString().slice(0, 10);
}
