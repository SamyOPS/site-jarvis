type AdminActionMessages = {
  /** Affiche quand la session a expire, avant meme d'appeler la route. */
  expiredSession: string;
  /** Repli quand la reponse est en erreur sans message exploitable. */
  failure: string;
};

export type AdminActionResult<TPayload> =
  | { ok: true; payload: TPayload | null; accessToken: string }
  | { ok: false; message: string };

/**
 * Appel authentifie d'une route d'administration.
 *
 * Les quatre actions admin (statut de compte, type de compte, suppression, affectations)
 * repetaient la meme sequence : jeton frais, garde de session expiree, `fetch`, lecture du
 * corps JSON, message d'erreur avec repli sur le code HTTP.
 *
 * `getAccessToken` est passe par l'appelant plutot que pris dans `lib/dashboard-api` :
 * la version de la page admin rafraichit aussi l'etat de session affiche a l'ecran, et
 * ce n'est pas a ce helper de decider de perdre cet effet.
 *
 * Le jeton est renvoye en cas de succes : un appelant enchaine ensuite un rechargement
 * qui en a besoin.
 */
export async function runAdminAction<TPayload extends { error?: string } = { error?: string }>(
  getAccessToken: () => Promise<string | null>,
  path: string,
  init: RequestInit,
  messages: AdminActionMessages,
): Promise<AdminActionResult<TPayload>> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { ok: false, message: messages.expiredSession };
  }

  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as TPayload | null;

  if (!response.ok) {
    // Le code HTTP est conserve : sans lui, un echec sans corps JSON exploitable ne
    // laisse aucune prise pour diagnostiquer.
    return {
      ok: false,
      message: payload?.error ?? `${messages.failure} (HTTP ${response.status}).`,
    };
  }

  return { ok: true, payload, accessToken };
}
