"use client";

import {
  DEFAULT_APPEARANCE,
  parseAppearance,
  type AppearanceSettings,
} from "@/domain/account-settings";
import { consoleThemeStore } from "@/lib/console-theme";
import { sidebarCollapsedPreference } from "@/lib/console-preferences";
import { createAuthorizedFetch } from "@/lib/dashboard-api";

/**
 * Preferences d'apparence, partagees par toute la console.
 *
 * POURQUOI UN STORE ET PAS UN HOOK PAR COMPOSANT : ces reglages sont lus loin les uns des
 * autres — le theme par la barre superieure, le repli par la barre laterale, la taille de
 * page par chaque liste de documents, qui peut etre instanciee plusieurs fois sur un
 * meme ecran. Un hook qui interrogerait le serveur ferait autant de requetes que de
 * lecteurs. Ici, le shell hydrate une fois, tout le monde lit la meme valeur.
 *
 * Le theme et le repli de la barre restent EN PLUS dans le navigateur : ce sont eux que
 * le script d'amorcage lit avant la premiere peinture, bien avant qu'une requete ait pu
 * aboutir. Le serveur est la source qui suit l'utilisateur d'un poste a l'autre ; le
 * stockage local est ce qui evite un clignotement au chargement.
 */

type Listener = () => void;

let current: AppearanceSettings = DEFAULT_APPEARANCE;
let listeners: Listener[] = [];
let hydration: Promise<void> | null = null;

function emit() {
  for (const listener of listeners) listener();
}

/** Applique ce qui a un effet immediat sur l'interface. */
function applyLocally(settings: AppearanceSettings) {
  consoleThemeStore.set(settings.theme);
  sidebarCollapsedPreference.set(settings.sidebarCollapsed);
}

export const appearanceStore = {
  subscribe(listener: Listener) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((entry) => entry !== listener);
    };
  },
  getSnapshot: () => current,
  getServerSnapshot: () => DEFAULT_APPEARANCE,
  /** Remplace l'etat courant et l'applique, sans rien enregistrer. */
  replace(settings: AppearanceSettings) {
    current = settings;
    applyLocally(settings);
    emit();
  },
};

/**
 * Charge les preferences depuis le serveur, une seule fois par chargement de page.
 *
 * L'echec est SILENCIEUX : sans reponse, la console garde le theme du stockage local et
 * les valeurs par defaut. Afficher une erreur parce qu'une preference d'affichage n'a pas
 * pu etre lue serait hors de proportion.
 */
export function hydrateAppearance() {
  if (hydration) return hydration;

  hydration = (async () => {
    try {
      const callApi = createAuthorizedFetch("parametres");
      const payload = (await callApi("/api/account/preferences")) as {
        appearance?: unknown;
        stored?: boolean;
      } | null;

      // Aucune preference enregistree : on garde ce que le navigateur affiche deja plutot
      // que d'imposer le theme clair par defaut a quelqu'un qui avait choisi le sombre.
      if (!payload?.stored) return;

      appearanceStore.replace(parseAppearance(payload.appearance));
    } catch {
      // Session absente ou reseau coupe : rien a faire, les defauts tiennent.
    }
  })();

  return hydration;
}

/** Repart a zero, pour qu'un autre compte ne herite pas des preferences du precedent. */
export function resetAppearanceHydration() {
  hydration = null;
  current = DEFAULT_APPEARANCE;
}
