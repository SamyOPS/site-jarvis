/**
 * Types metier partages. Regle : ce dossier ne doit importer AUCUN module du projet
 * (ni @/lib, ni @/features, ni @/components, ni @/app). TypeScript natif uniquement.
 */

/** Etat de validation d'un document depose. */
export type DocumentStatus = "pending" | "validated" | "rejected";

/** Etat d'une demande de document adressee a un collaborateur. */
export type DocumentRequestStatus =
  | "pending"
  | "uploaded"
  | "validated"
  | "rejected"
  | "expired"
  | "cancelled";

/** Type de document configure (table `document_types`). */
export type DocumentTypeRow = {
  id: string;
  label: string;
  requiresPeriod: boolean;
  allowedUploaderRoles: string[];
};

/** Dossier de rangement des documents d'un collaborateur. */
export type DocumentFolderRow = {
  id: string;
  ownerUserId: string;
  name: string;
  parentId: string | null;
  deletedAt?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

/**
 * Socle d'affichage d'une ligne de la liste de documents, commun a tous les roles.
 * Chaque role l'etend avec sa propre discrimination de ligne (dossier / document).
 */
export type DocumentListItem = {
  id: string;
  fileName: string;
  typeLabel: string;
  statusLabel?: string | null;
  periodLabel?: string | null;
  ownerName: string;
  createdAt: string | null;
  sizeBytes: number | null;
  subtitle?: string | null;
  details?: string | null;
  hideDetailsPanel?: boolean;
};

/** Minuscules sans accents, pour comparer des libelles saisis librement. */
export function normalizeDocumentLabel(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * Les libelles de type de document viennent de la table `document_types`, la
 * denomination exacte peut donc varier ("Fiche de paie", "Bulletin de salaire"...).
 * On reconnait la famille "paie" plutot qu'un libelle unique.
 */
export function isPayslipDocumentLabel(value: string) {
  const normalizedLabel = normalizeDocumentLabel(value);
  return (
    normalizedLabel.includes("paie") ||
    normalizedLabel.includes("paye") ||
    normalizedLabel.includes("bulletin") ||
    normalizedLabel.includes("salaire")
  );
}

/** Un point de la serie mensuelle : cle stable, libelle d'axe, compte. */
export type MonthlyCount = {
  /** Format AAAA-MM. */
  key: string;
  /** Libelle court de l'axe : « mars », « avr. »… */
  label: string;
  value: number;
};

/**
 * Nombre de documents deposes par mois, sur une fenetre glissante.
 *
 * Les mois sans depot sont CONSERVES a zero : les omettre donnerait un axe irregulier et
 * ferait mentir la lecture des ecarts entre barres.
 *
 * `reference` est injectable pour que la fonction reste pure et testable — sans quoi son
 * resultat dependrait de l'horloge et ne pourrait pas etre compare d'une execution a
 * l'autre.
 */
export function buildMonthlyDocumentCounts(
  documents: { createdAt: string | null }[],
  options?: { months?: number; reference?: Date },
): MonthlyCount[] {
  const months = options?.months ?? 6;
  const reference = options?.reference ?? new Date();
  const buckets = new Map<string, MonthlyCount>();

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(reference.getFullYear(), reference.getMonth() - offset, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, {
      key,
      label: date.toLocaleDateString("fr-FR", { month: "short" }),
      value: 0,
    });
  }

  for (const document of documents) {
    if (!document.createdAt) continue;
    const createdAt = new Date(document.createdAt);
    if (Number.isNaN(createdAt.getTime())) continue;
    const key = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.value += 1;
  }

  return Array.from(buckets.values());
}
