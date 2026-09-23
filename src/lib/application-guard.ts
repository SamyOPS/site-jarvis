import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Garde-fous du formulaire de candidature publique.
 *
 * `/api/applications` est la seule route d'ecriture ouverte a tous : chaque appel uploade
 * un fichier de 5 Mo, insere une ligne et declenche un e-mail. Sans plafond, une boucle
 * suffit a saturer la boite de reception et le Storage.
 *
 * Quatre filtres, du moins cher au plus cher, AUCUN visible du candidat :
 *   1. le champ piege, qu'aucun humain ne voit donc ne remplit ;
 *   2. le temps passe sur le formulaire, qu'aucun humain ne bat ;
 *   3. les plafonds par IP et global, comptes en base ;
 *   4. le doublon, meme candidat sur la meme offre.
 *
 * Les deux premiers ne sont PAS des barrieres : un robot qui les connait les contourne.
 * Ils ecartent le bruit de fond pour un cout nul. La barriere, c'est le plafond par IP —
 * compte cote serveur, il ne se contourne qu'en changeant d'adresse.
 */
export const APPLICATION_GUARD = {
  /** Nom du champ piege. Anodin a dessein : un robot le remplit d'autant plus volontiers. */
  honeypotField: "companyWebsite",
  /** Champ portant le temps passe sur le formulaire, en millisecondes. */
  elapsedField: "elapsedMs",
  /** Personne ne remplit cinq champs et ne choisit un fichier en moins de trois secondes. */
  minSecondsOnForm: 3,
  /** Plafond par IP. Trois offres differentes dans l'heure reste un usage plausible. */
  maxPerIpPerHour: 3,
  /** Coupe-circuit toutes offres confondues, contre un envoi reparti sur plusieurs IP. */
  maxPerHourGlobal: 20,
  /** Fenetre au-dela de laquelle re-postuler a la meme offre redevient legitime. */
  duplicateWindowHours: 24,
} as const;

const APPLICATIONS_TABLE = "job_applications";
const HOUR_MS = 60 * 60 * 1000;

export type ApplicationRejection = { status: number; error: string };

/**
 * IP de l'appelant telle que la voit le reverse proxy.
 *
 * `x-forwarded-for` est une LISTE : chaque proxy y ajoute l'adresse vue en amont, la
 * premiere entree est donc le client. Le client peut envoyer l'en-tete lui-meme, mais
 * l'hebergeur la reecrit ; c'est la meilleure information disponible depuis une route
 * Next, et le plafond global couvre le cas ou elle ment.
 */
export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;
  return request.headers.get("x-real-ip")?.trim() || null;
}

/**
 * Empreinte de l'IP, jamais l'IP.
 *
 * Le plafond n'a besoin que de reconnaitre deux envois venant du meme endroit : conserver
 * l'adresse en clair ajouterait une donnee personnelle au dossier d'un candidat sans rien
 * apporter. Le sel est indispensable — sans lui, l'espace IPv4 tenant sur 32 bits, le
 * hachage se renverse par force brute en quelques secondes.
 */
export function hashClientIp(ip: string | null) {
  if (!ip) return null;
  const salt = process.env.APPLICATION_IP_SALT || process.env.SUPABASE_CV_SERVICE_ROLE_KEY;
  if (!salt) return null;
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/** Le champ piege n'existe que dans le DOM : rempli, l'envoi ne vient pas d'un humain. */
export function isHoneypotFilled(formData: FormData) {
  return String(formData.get(APPLICATION_GUARD.honeypotField) ?? "").trim().length > 0;
}

/**
 * Temps passe sur le formulaire.
 *
 * Le client envoie une DUREE, pas un horodatage : une duree se mesure avec la meme horloge
 * aux deux bouts, elle est donc insensible au decalage de l'horloge du visiteur — un
 * horodatage en avance de quelques minutes aurait fait refuser des candidats reels.
 *
 * Valeur absente ou illisible : on laisse passer. Un navigateur dont le JavaScript a
 * partiellement echoue n'est pas un robot, et ce filtre n'est de toute facon pas la
 * barriere.
 */
export function isSubmittedTooFast(rawElapsedMs: unknown) {
  const raw = String(rawElapsedMs ?? "").trim();
  // Champ ABSENT : `Number("")` vaut 0, qui serait lu comme un envoi instantane et ferait
  // refuser un visiteur dont le JavaScript n'a pas tourne. Le vide se traite donc avant
  // toute conversion, et signifie « aucune information », pas « zero milliseconde ».
  if (!raw) return false;
  const elapsedMs = Number(raw);
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return false;
  return elapsedMs < APPLICATION_GUARD.minSecondsOnForm * 1000;
}

/**
 * Compte les candidatures recentes. `null` quand le comptage echoue.
 *
 * `head: true` : seul le nombre est demande, aucune ligne ne transite — ces requetes
 * s'executent a CHAQUE candidature, y compris les legitimes.
 */
async function countApplications(
  client: SupabaseClient,
  build: (
    query: ReturnType<ReturnType<SupabaseClient["from"]>["select"]>,
  ) => PromiseLike<{ count: number | null; error: { message: string } | null }>,
  label: string,
) {
  const { count, error } = await build(
    client.from(APPLICATIONS_TABLE).select("id", { count: "exact", head: true }),
  );
  if (error) {
    console.error(`[applications] comptage anti-spam « ${label} » impossible`, error.message);
    return null;
  }
  return count ?? 0;
}

/**
 * Plafonds anti-spam, evalues du moins couteux au plus large.
 *
 * ECHEC OUVERT, volontairement : si un comptage ne repond pas, la candidature PASSE. Une
 * panne de base ne doit pas faire perdre un candidat reel — c'est deja la regle du reste
 * de la route, ou l'enregistrement et l'e-mail sont « best-effort ». Le spam coute une
 * boite pleine ; un refus a tort coute un recrutement.
 */
export async function checkApplicationLimits(
  client: SupabaseClient,
  { ipHash, email, jobId }: { ipHash: string | null; email: string; jobId: string },
): Promise<ApplicationRejection | null> {
  const now = Date.now();
  const lastHour = new Date(now - HOUR_MS).toISOString();

  const duplicates = await countApplications(
    client,
    (query) =>
      query
        .eq("email", email)
        .eq("job_id", jobId)
        .gte(
          "created_at",
          new Date(now - APPLICATION_GUARD.duplicateWindowHours * HOUR_MS).toISOString(),
        ),
    "doublon",
  );
  if (duplicates !== null && duplicates > 0) {
    return {
      status: 409,
      error:
        "Vous avez déjà postulé à cette offre. Notre équipe étudie votre dossier et revient vers vous.",
    };
  }

  if (ipHash) {
    const fromSameIp = await countApplications(
      client,
      (query) => query.eq("ip_hash", ipHash).gte("created_at", lastHour),
      "plafond par IP",
    );
    if (fromSameIp !== null && fromSameIp >= APPLICATION_GUARD.maxPerIpPerHour) {
      return {
        status: 429,
        error:
          "Trop de candidatures envoyées depuis cette connexion. Merci de réessayer dans une heure.",
      };
    }
  }

  const total = await countApplications(
    client,
    (query) => query.gte("created_at", lastHour),
    "plafond global",
  );
  if (total !== null && total >= APPLICATION_GUARD.maxPerHourGlobal) {
    return {
      status: 429,
      error: "Le service reçoit trop de candidatures en ce moment. Merci de réessayer plus tard.",
    };
  }

  return null;
}
