"use client";

import { homePageHref, parseAppearance } from "@/domain/account-settings";
import { createAuthorizedFetch } from "@/lib/dashboard-api";

/**
 * Ecran ouvert juste apres la connexion.
 *
 * La preference est relue ICI, au moment de la redirection, et non conservee dans le
 * navigateur : l'utilisateur peut avoir change son choix depuis un autre poste, et c'est
 * precisement l'interet de l'avoir range cote serveur.
 *
 * Toute defaillance retombe sur `fallback`, la racine de l'espace. Une preference
 * d'affichage ne doit jamais empecher quelqu'un d'entrer chez lui.
 */
export async function resolveLandingPath(
  role: string | null | undefined,
  fallback: string,
): Promise<string> {
  if (role !== "rh" && role !== "salarie") return fallback;

  try {
    const callApi = createAuthorizedFetch("parametres");
    const payload = (await callApi("/api/account/preferences")) as {
      appearance?: unknown;
      stored?: boolean;
    } | null;

    if (!payload?.stored) return fallback;
    return homePageHref(parseAppearance(payload.appearance).homePage, role);
  } catch {
    return fallback;
  }
}
