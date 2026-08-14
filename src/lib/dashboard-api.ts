import { safeGetClientSession } from "@/lib/client-auth";
import { browserSupabase } from "@/lib/supabase-browser";

/**
 * Fabrique le `fetch` authentifie d'un espace du tableau de bord.
 *
 * Le jeton est redemande A CHAQUE APPEL plutot que capture au montage. C'est la
 * difference qui compte : une page de tableau de bord reste ouverte des heures, alors
 * qu'un JWT expire au bout d'une heure. La version RH lisait un jeton capture au montage
 * et repartait donc en 401 sur chaque action passe ce delai, sans rien afficher qui
 * l'explique. Supabase rafraichit le jeton de lui-meme au moment de la demande.
 *
 * `scopeLabel` n'apparait que dans les messages d'erreur ("Session RH manquante.",
 * "Requete salarie impossible (403).") : c'est le seul point ou les deux implementations
 * d'origine differaient.
 *
 * La fonction rendue est stable : elle ne capture aucun etat React. Cote composant, la
 * memoiser avec des dependances vides suffit a stabiliser tous les callbacks qui
 * l'utilisent.
 */
/**
 * Jeton d'acces frais, pour les appels qui ne passent pas par `createAuthorizedFetch`
 * — typiquement ceux qui envoient un `FormData` ou qui gerent l'erreur sur place plutot
 * que par exception. Rend `null` si la session est absente ou expiree sans refraichissement
 * possible : l'appelant decide alors quoi afficher.
 */
export async function getFreshAccessToken() {
  if (!browserSupabase) return null;
  const { session } = await safeGetClientSession(browserSupabase);
  return session?.access_token ?? null;
}

export function createAuthorizedFetch(scopeLabel: string) {
  return async (path: string, init?: RequestInit) => {
    if (!browserSupabase) {
      throw new Error("Configuration Supabase manquante.");
    }

    const { session, error } = await safeGetClientSession(browserSupabase);
    const accessToken = session?.access_token;
    if (error || !accessToken) {
      throw new Error(error?.message ?? `Session ${scopeLabel} manquante.`);
    }

    const response = await fetch(path, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? ((await response.json().catch(() => null)) as { error?: string } | null)
      : null;
    const rawMessage = !payload ? (await response.text().catch(() => "")).trim() : "";

    if (!response.ok) {
      const fallbackMessage = `Requete ${scopeLabel} impossible (${response.status}).`;
      throw new Error(
        payload?.error ?? (rawMessage ? `${fallbackMessage} ${rawMessage}` : fallbackMessage),
      );
    }

    return payload;
  };
}
