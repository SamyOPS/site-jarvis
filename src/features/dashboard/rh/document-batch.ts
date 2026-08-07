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
export function parseDocumentFileName(fileName: string): ParsedDocumentFileName {
  const base = stripExtension(fileName);
  const tokens = tokenize(base);

  let periodMonth: string | null = null;
  const remainingTokens: string[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (periodMonth === null) {
      // « 202608 » : annee et mois colles dans un seul jeton.
      const glued = /^(20\d{2})(\d{2})$/.exec(token);
      if (glued) {
        const month = Number(glued[2]);
        if (month >= 1 && month <= 12) {
          periodMonth = `${glued[1]}-${glued[2]}`;
          continue;
        }
      }

      // « 2026 08 » / « 2026-08 » : le mois est le jeton suivant.
      if (/^20\d{2}$/.test(token)) {
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
 * Cherche le salarie designe par les jetons du nom de fichier.
 *
 * La comparaison se fait par jeton entier, jamais par sous-chaine : « mar » ne doit pas
 * capturer « martin ». Le score est le nombre de jetons du fichier retrouves dans le nom du
 * salarie ; il faut au moins un jeton significatif pour eviter qu'une initiale suffise.
 *
 * Un seul salarie au score maximal -> `matched`. Plusieurs a egalite -> `ambiguous`, jamais
 * un choix arbitraire : une fiche de paie attribuee au mauvais homonyme est une fuite de
 * donnees salariales.
 */
export function matchEmployee(
  nameTokens: string[],
  employees: EmployeeMatchCandidate[],
): EmployeeMatch {
  if (!nameTokens.length) {
    return { status: "unmatched", candidateIds: [] };
  }

  let bestScore = 0;
  let bestIds: string[] = [];

  for (const employee of employees) {
    const candidateTokens = new Set(employeeTokens(employee));
    if (!candidateTokens.size) continue;

    const matchedTokens = nameTokens.filter((token) => candidateTokens.has(token));
    const hasSignificantToken = matchedTokens.some(
      (token) => token.length >= MIN_SIGNIFICANT_TOKEN_LENGTH,
    );
    if (!matchedTokens.length || !hasSignificantToken) continue;

    const score = matchedTokens.length;
    if (score > bestScore) {
      bestScore = score;
      bestIds = [employee.id];
    } else if (score === bestScore) {
      bestIds.push(employee.id);
    }
  }

  if (!bestIds.length) return { status: "unmatched", candidateIds: [] };
  if (bestIds.length > 1) return { status: "ambiguous", candidateIds: bestIds };
  return { status: "matched", candidateIds: bestIds };
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

/** Construit les lignes de revue a partir des fichiers choisis. */
export function buildBatchUploadRows(
  files: File[],
  employees: EmployeeMatchCandidate[],
  defaultDocumentTypeId: string,
): BatchUploadRow[] {
  return files.map((file, index) => {
    const { periodMonth, nameTokens } = parseDocumentFileName(file.name);
    const match = matchEmployee(nameTokens, employees);

    return {
      key: `${index}-${file.name}-${file.size}`,
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
