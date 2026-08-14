import type { DocumentFolderRow, DocumentListItem, DocumentStatus } from "@/domain/documents";
import { formatDocumentStatus, formatMonth } from "@/lib/dashboard-formatters";

export type FolderListItem = DocumentListItem & {
  rowType: "folder";
  folderId: string;
};

export type DocumentRowListItem<TDoc> = DocumentListItem & {
  rowType: "document";
  document: TDoc;
};

/** Le minimum qu'un document doit porter pour etre affiche dans une liste. */
export type ListableDocument = {
  id: string;
  fileName: string;
  typeLabel: string;
  status: DocumentStatus;
  periodMonth: string | null;
  sizeBytes: number | null;
  reviewComment: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  deletedAt: string | null;
};

/** Ordre d'affichage des dossiers : alphabetique, regles francaises. */
export function sortFoldersByName(folders: DocumentFolderRow[]) {
  return [...folders].sort((left, right) => left.name.localeCompare(right.name, "fr"));
}

/**
 * Ligne de liste pour un dossier.
 *
 * En corbeille, l'identifiant est prefixe (un dossier supprime et son homologue actif
 * peuvent coexister dans deux listes affichees en meme temps) et la date affichee est
 * celle de la suppression.
 */
export function folderToListItem(
  folder: DocumentFolderRow,
  options?: { trash?: boolean },
): FolderListItem {
  const trash = options?.trash ?? false;

  return {
    rowType: "folder",
    folderId: folder.id,
    id: trash ? `trash-folder:${folder.id}` : `folder:${folder.id}`,
    fileName: folder.name,
    typeLabel: "Dossier",
    ownerName: "-",
    createdAt: trash
      ? folder.deletedAt ?? folder.updatedAt ?? folder.createdAt
      : folder.createdAt,
    sizeBytes: null,
    ...(trash ? { subtitle: "Dans la corbeille" } : {}),
    hideDetailsPanel: true,
  };
}

/**
 * Ligne de liste pour un document.
 *
 * `ownerName` est fourni par l'appelant : l'espace RH affiche selon le contexte le
 * collaborateur (`employeeName`) ou le deposant (`uploadedByName`), la ou l'espace
 * salarie affiche toujours le deposant.
 */
export function documentToListItem<TDoc extends ListableDocument>(
  document: TDoc,
  options: { ownerName: string; trash?: boolean },
): DocumentRowListItem<TDoc> {
  const trash = options.trash ?? false;

  return {
    rowType: "document",
    document,
    id: trash ? `trash-document:${document.id}` : document.id,
    fileName: document.fileName,
    typeLabel: document.typeLabel,
    ownerName: options.ownerName,
    createdAt: trash
      ? document.deletedAt ?? document.updatedAt ?? document.createdAt
      : document.createdAt,
    statusLabel: formatDocumentStatus(document.status),
    periodLabel: formatMonth(document.periodMonth),
    sizeBytes: document.sizeBytes,
    details: document.reviewComment ? `Commentaire RH : ${document.reviewComment}` : null,
  };
}
