import type { DragEvent } from "react";

/**
 * Handlers de depot d'un document sur une cible du fil d'Ariane (la racine ou un dossier).
 *
 * Le couple etait recopie trois fois par section documentaire, et deux fois de plus entre
 * les espaces RH et salarie — six copies pour une regle tenant en deux lignes : on
 * n'accepte le depot que si le document vient d'ailleurs que la cible.
 *
 * `dropEffect = "move"` est ce qui change le curseur du navigateur ; sans `preventDefault`
 * sur `onDragOver`, `onDrop` ne se declenche jamais.
 */
export function folderDropHandlers<TDoc extends { folderId: string | null }>({
  targetFolderId,
  getDraggedDocument,
  onDrop,
}: {
  /** `null` pour la racine. */
  targetFolderId: string | null;
  getDraggedDocument: (event: DragEvent<HTMLElement>) => TDoc | null;
  onDrop: (document: TDoc) => void | Promise<void>;
}) {
  const resolveDroppable = (event: DragEvent<HTMLElement>) => {
    const document = getDraggedDocument(event);
    if (!document) return null;
    if ((document.folderId ?? null) === targetFolderId) return null;
    return document;
  };

  return {
    onDragOver: (event: DragEvent<HTMLElement>) => {
      if (!resolveDroppable(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    },
    onDrop: (event: DragEvent<HTMLElement>) => {
      const document = resolveDroppable(event);
      if (!document) return;
      event.preventDefault();
      void onDrop(document);
    },
  };
}
