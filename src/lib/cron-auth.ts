import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * Autorisation des taches planifiees de la base (pg_cron -> pg_net -> route du site).
 *
 * Il n'y a pas d'utilisateur derriere un cron : un secret partage tient lieu
 * d'autorisation. Une seule valeur pour toutes les taches — `MESSAGING_CRON_SECRET` sur
 * Vercel, `messaging_cron_secret` dans le Vault de Supabase. Elle porte le nom de la
 * premiere tache (les rappels de messagerie) ; la renommer obligerait a la reposer des
 * deux cotes.
 *
 * Sans le secret en environnement, la route refuse de s'executer plutot que de s'ouvrir :
 * une tache qui envoie des e-mails ne doit jamais etre joignable par defaut.
 *
 * Retourne la reponse d'erreur a renvoyer, ou `null` si l'appel est autorise.
 */
export function cronAuthorizationError(request: Request): NextResponse | null {
  const secret = process.env.MESSAGING_CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "MESSAGING_CRON_SECRET absent : tache desactivee." },
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const provided = [bearer, request.headers.get("x-cron-secret") ?? ""];
  if (provided.some((value) => sameSecret(value, secret))) return null;

  return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
}

/** Comparaison a temps constant : la duree ne trahit pas la longueur du prefixe juste. */
function sameSecret(value: string, secret: string) {
  if (!value) return false;
  const a = Buffer.from(value);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
