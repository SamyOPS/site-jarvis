/**
 * Attribution automatique d'un lot de documents RH a partir du nom de fichier.
 *
 * Convention visee : « annee mois nom.pdf » (ex. « 2026 08 Dupont.pdf »), avec tolerance
 * sur les separateurs et les accents. Module volontairement pur : aucune dependance React
 * ni reseau, pour etre testable directement.
 */

import { normalizeDocumentLabel } from "@/features/dashboard/salarie/document-filters";
import type { RhDocumentTypeRow } from "@/features/dashboard/rh/types";

/** Nombre minimum de caracteres pour qu'un jeton puisse porter une correspondance. */
const MIN_SIGNIFICANT_TOKEN_LENGTH = 3;

/**
 * Fenetre d'annees acceptees pour une periode, relative a l'annee de reference. Sans elle,
 * un matricule ou une reference de contrat comme « 2058 07 » passerait pour une periode et
 * la ligne paraitrait complete avec une date fantaisiste. `^20\d{2}$` ne suffit pas : elle
 * accepte tout le siecle.
 */
const PERIOD_YEARS_BACK = 10;
const PERIOD_YEARS_AHEAD = 1;

function isPlausiblePeriodYear(year: number, referenceYear: number) {
  return year >= referenceYear - PERIOD_YEARS_BACK && year <= referenceYear + PERIOD_YEARS_AHEAD;
}

/**
 * Decoupe en jetons alphanumeriques, tous separateurs confondus (espace, _, -, .).
 *
 * `normalizeDocumentLabel` fait deja la mise en minuscules et la suppression des
 * diacritiques (NFD) : « LEVY » et « Lévy » donnent donc le meme jeton. On la reutilise
 * plutot que de redupliquer la plage des diacritiques combinants.
 */
function tokenize(value: string) {
  return normalizeDocumentLabel(value)
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean);
}

function stripExtension(fileName: string) {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
}

export type ParsedDocumentFileName = {
  /** Format "YYYY-MM", ou null si aucune periode plausible n'a ete trouvee. */
  periodMonth: string | null;
  /** Jetons candidats a l'identification du salarie, periode retiree. */
  nameTokens: string[];
};

/**
 * Extrait la periode et les jetons de nom.
 *
 * La periode est reconnue sous trois formes : « 2026 08 », « 2026-08 » et « 202608 ». Un
 * mois hors 1-12 est rejete plutot que corrige : mieux vaut une periode vide que fausse.
 */
export function parseDocumentFileName(
  fileName: string,
  referenceYear: number = new Date().getFullYear(),
): ParsedDocumentFileName {
  const base = stripExtension(fileName);
  const tokens = tokenize(base);

  let periodMonth: string | null = null;
  const remainingTokens: string[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (periodMonth === null) {
      // « 202608 » : annee et mois colles dans un seul jeton.
      const glued = /^(\d{4})(\d{2})$/.exec(token);
      if (glued) {
        const month = Number(glued[2]);
        if (isPlausiblePeriodYear(Number(glued[1]), referenceYear) && month >= 1 && month <= 12) {
          periodMonth = `${glued[1]}-${glued[2]}`;
          continue;
        }
      }

      // « 2026 08 » / « 2026-08 » : le mois est le jeton suivant.
      if (/^\d{4}$/.test(token) && isPlausiblePeriodYear(Number(token), referenceYear)) {
        const nextToken = tokens[index + 1];
        if (nextToken && /^\d{1,2}$/.test(nextToken)) {
          const month = Number(nextToken);
          if (month >= 1 && month <= 12) {
            periodMonth = `${token}-${String(month).padStart(2, "0")}`;
            index += 1;
            continue;
          }
        }
        // Annee seule, ou mois invalide : on retire quand meme l'annee des jetons de nom,
        // elle n'identifie personne.
        continue;
      }
    }

    // Les jetons purement numeriques n'identifient pas un salarie.
    if (/^\d+$/.test(token)) continue;
    if (token.length < 2) continue;
    remainingTokens.push(token);
  }

  return { periodMonth, nameTokens: remainingTokens };
}

export type EmployeeMatchCandidate = {
  id: string;
  full_name: string | null;
  email: string;
};

export type EmployeeMatch = {
  status: "matched" | "ambiguous" | "unmatched";
  candidateIds: string[];
};

/** Jetons identifiant un salarie : son nom complet, a defaut la partie locale de l'e-mail. */
function employeeTokens(employee: EmployeeMatchCandidate) {
  const fromName = tokenize(employee.full_name ?? "");
  if (fromName.length) return fromName;
  return tokenize(employee.email.split("@")[0] ?? "");
}

/**
 * Vocabulaire documentaire courant, ignore lors du rapprochement : ces mots decrivent le
 * document, pas la personne. Un mot de cette liste qui se trouve etre aussi le nom d'un
 * salarie du lot reste pris en compte (voir plus bas), pour ne jamais perdre un vrai nom.
 */
const DOCUMENT_NOISE_TOKENS = new Set([
  "fiche", "fiches", "paie", "paies", "paye", "payes", "bulletin", "bulletins",
  "salaire", "salaires", "contrat", "contrats", "avenant", "avenants",
  "attestation", "attestations", "certificat", "certificats", "justificatif",
  "justificatifs", "document", "documents", "doc", "docs", "facture", "factures",
  "note", "notes", "frais", "scan", "scanne", "scannee", "copie", "signe", "signee",
  "mois", "annee", "final", "def", "vdef", "cra",
]);

/**
 * Cherche le salarie designe par les jetons du nom de fichier.
 *
 * Regle centrale : un candidat doit **expliquer tous les jetons identifiants** du nom de
 * fichier. Compter simplement les jetons communs ne suffit pas — « 2026 08 Jean Dupont.pdf »
 * se rapprochait alors de « Jean Martin » sur le seul prenom des que Dupont etait absent du
 * perimetre du RH, et la ligne s'affichait « Pret » comme une correspondance solide. Une
 * fiche de paie partait ainsi chez le mauvais salarie, qui en etait notifie par e-mail.
 *
 * Faute de candidat expliquant tout le nom, les correspondances partielles sont renvoyees
 * en `ambiguous` : elles sont proposees dans la liste, mais jamais pre-selectionnees.
 */
export function matchEmployee(
  nameTokens: string[],
  employees: EmployeeMatchCandidate[],
): EmployeeMatch {
  if (!nameTokens.length) {
    return { status: "unmatched", candidateIds: [] };
  }

  const candidates = employees
    .map((employee) => ({ employee, tokens: new Set(employeeTokens(employee)) }))
    .filter((candidate) => candidate.tokens.size > 0);

  const everyEmployeeToken = new Set(
    candidates.flatMap((candidate) => Array.from(candidate.tokens)),
  );

  // Jetons cense identifier la personne : assez longs, et hors vocabulaire documentaire
  // — sauf si ce mot est justement le nom d'un salarie.
  const identifyingTokens = nameTokens.filter(
    (token) =>
      token.length >= MIN_SIGNIFICANT_TOKEN_LENGTH &&
      (!DOCUMENT_NOISE_TOKENS.has(token) || everyEmployeeToken.has(token)),
  );

  if (!identifyingTokens.length) {
    // Noms entierement composes de jetons courts (« Li Wu ») : on n'accepte qu'une
    // correspondance exacte, jeton pour jeton, pour ne pas relacher la regle.
    const exactMatches = candidates.filter(
      (candidate) =>
        candidate.tokens.size === nameTokens.length &&
        nameTokens.every((token) => candidate.tokens.has(token)),
    );
    if (exactMatches.length === 1) {
      return { status: "matched", candidateIds: [exactMatches[0].employee.id] };
    }
    return {
      status: exactMatches.length ? "ambiguous" : "unmatched",
      candidateIds: exactMatches.map((candidate) => candidate.employee.id),
    };
  }

  const fullMatches = candidates.filter((candidate) =>
    identifyingTokens.every((token) => candidate.tokens.has(token)),
  );

  if (fullMatches.length === 1) {
    return { status: "matched", candidateIds: [fullMatches[0].employee.id] };
  }
  if (fullMatches.length > 1) {
    return { status: "ambiguous", candidateIds: fullMatches.map((c) => c.employee.id) };
  }

  // Aucun candidat n'explique tout le nom : on propose les meilleurs partiels, sans en
  // pre-selectionner aucun.
  let bestScore = 0;
  let partialIds: string[] = [];
  for (const candidate of candidates) {
    const score = identifyingTokens.filter((token) => candidate.tokens.has(token)).length;
    if (!score) continue;
    if (score > bestScore) {
      bestScore = score;
      partialIds = [candidate.employee.id];
    } else if (score === bestScore) {
      partialIds.push(candidate.employee.id);
    }
  }

  return {
    status: partialIds.length ? "ambiguous" : "unmatched",
    candidateIds: partialIds,
  };
}

export type BatchUploadRowStatus = "pending" | "uploading" | "done" | "error";

export type BatchUploadRow = {
  /** Identifiant local stable, les noms de fichiers pouvant se repeter. */
  key: string;
  file: File;
  employeeId: string;
  documentTypeId: string;
  periodMonth: string;
  match: EmployeeMatch;
  status: BatchUploadRowStatus;
  error: string | null;
};

/**
 * Compteur de lots. La cle d'une ligne doit etre unique dans la duree de la page : un
 * `index-nom-taille` seul se repete a l'identique d'un lot a l'autre, et un envoi encore en
 * vol pourrait alors marquer « Depose » une ligne du nouveau lot jamais envoyee.
 */
let batchSequence = 0;

/** Construit les lignes de revue a partir des fichiers choisis. */
export function buildBatchUploadRows(
  files: File[],
  employees: EmployeeMatchCandidate[],
  defaultDocumentTypeId: string,
): BatchUploadRow[] {
  batchSequence += 1;
  const batchId = batchSequence;

  return files.map((file, index) => {
    const { periodMonth, nameTokens } = parseDocumentFileName(file.name);
    const match = matchEmployee(nameTokens, employees);

    return {
      key: `b${batchId}-${index}-${file.name}-${file.size}`,
      file,
      employeeId: match.status === "matched" ? match.candidateIds[0] : "",
      documentTypeId: defaultDocumentTypeId,
      periodMonth: periodMonth ?? "",
      match,
      status: "pending",
      error: null,
    };
  });
}

export type BatchRowIssue = null | "no-employee" | "no-type" | "missing-period";

/**
 * Ce qui empeche une ligne de partir.
 *
 * Une ligne sans collaborateur ne doit surtout pas etre deposee : la route rattacherait
 * alors le document au RH lui-meme, et une fiche de paie finirait dans ses documents.
 */
export function getBatchRowIssue(
  row: BatchUploadRow,
  documentTypes: RhDocumentTypeRow[],
): BatchRowIssue {
  if (!row.employeeId) return "no-employee";
  if (!row.documentTypeId) return "no-type";
  const documentType = documentTypes.find((type) => type.id === row.documentTypeId);
  if (documentType?.requiresPeriod && !row.periodMonth) return "missing-period";
  return null;
}
