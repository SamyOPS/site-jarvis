"use client";

import { createAuthorizedFetch } from "@/lib/dashboard-api";
import type { AccountProfile } from "@/domain/account-settings";

/**
 * Identite affichee de l'utilisateur courant : nom, e-mail, photo.
 *
 * POURQUOI UN STORE. Le nom et la photo se lisent dans la barre superieure, presente sur
 * TOUS les ecrans de la console, alors qu'ils se modifient depuis un seul. Sans point
 * commun, chaque ecran resoudrait l'identite a sa facon — et c'est exactement ce qui
 * produisait le defaut corrige ici : la barre lisait `user_metadata`, que la page de
 * parametres ne touche pas, et affichait donc indefiniment l'ancien nom.
 *
 * LA SOURCE DE VERITE EST LA TABLE `profiles`. C'est elle que lisent la liste des
 * collaborateurs, l'annuaire de la messagerie et les documents ; la barre superieure n'a
 * aucune raison de repondre autrement qu'eux.
 */

export type AccountIdentity = {
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
};

const EMPTY: AccountIdentity = { fullName: null, email: null, avatarUrl: null };

type Listener = () => void;

let current: AccountIdentity = EMPTY;
let listeners: Listener[] = [];
let hydration: Promise<void> | null = null;

function emit() {
  for (const listener of listeners) listener();
}

export const accountIdentityStore = {
  subscribe(listener: Listener) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((entry) => entry !== listener);
    };
  },
  getSnapshot: () => current,
  getServerSnapshot: () => EMPTY,
};

/** Publie une identite fraiche : appele par la page de parametres apres enregistrement. */
export function setAccountIdentity(profile: Pick<
  AccountProfile,
  "fullName" | "email" | "avatarUrl"
>) {
  const next: AccountIdentity = {
    fullName: profile.fullName,
    email: profile.email,
    avatarUrl: profile.avatarUrl,
  };

  // Comparaison avant emission : sans elle, chaque rechargement du profil notifierait
  // tous les abonnes pour une valeur identique.
  if (
    next.fullName === current.fullName &&
    next.email === current.email &&
    next.avatarUrl === current.avatarUrl
  ) {
    return;
  }

  current = next;
  emit();
}

/**
 * Charge l'identite une fois par chargement de page.
 *
 * L'echec est silencieux : la barre superieure retombe alors sur ce que lui passe l'ecran
 * qui la rend. Une photo qui n'a pas pu etre lue ne justifie pas un message d'erreur.
 */
export function hydrateAccountIdentity() {
  if (hydration) return hydration;

  hydration = (async () => {
    try {
      const callApi = createAuthorizedFetch("compte");
      const payload = (await callApi("/api/account/profile")) as {
        profile?: AccountProfile;
      } | null;
      if (payload?.profile) setAccountIdentity(payload.profile);
    } catch {
      // Session absente ou reseau coupe : les valeurs de l'appelant tiennent.
    }
  })();

  return hydration;
}

/** Repart a zero, pour qu'un autre compte n'herite pas de l'identite du precedent. */
export function resetAccountIdentity() {
  hydration = null;
  current = EMPTY;
  emit();
}
