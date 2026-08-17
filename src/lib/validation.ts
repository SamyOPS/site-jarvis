/**
 * Validation des payloads de routes API.
 *
 * Ces helpers levent un `Error` simple, et non une `ApiError` : c'est le comportement
 * actuel des routes qui les portaient — l'erreur remonte au `catch` final et ressort en
 * 500 avec son message. Le passer en 400 serait plus juste, mais c'est un changement de
 * contrat HTTP : a decider explicitement, pas a glisser dans une factorisation.
 */

export function getRequiredString(value: unknown, label: string) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new Error(`Le champ "${label}" est obligatoire.`);
  }
  return normalized;
}

export function getOptionalString(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}
