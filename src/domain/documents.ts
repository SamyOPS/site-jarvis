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
