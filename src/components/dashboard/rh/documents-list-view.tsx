import { Check, RotateCcw, Trash2, X } from "lucide-react";

import type { ReactNode } from "react";

import {
  DocumentsExplorerList,
  DocumentViewDownloadActions,
} from "@/components/dashboard/documents/explorer-list";
import { Button } from "@/components/ui/button";
import type {
  RhDocumentRow,
  RhDocumentsListItem,
} from "@/features/dashboard/rh/types";

const RH_SHARED_COLUMNS_STORAGE_KEY = "rh-documents-shared-columns";

type RhDocumentsListViewProps = {
  storageScope?: string | null;
  preferencesAuthToken?: string | null;
  showRhFolderTrash: boolean;
  rhTrashListItems: RhDocumentsListItem[];
  rhTrashedDocumentItems: RhDocumentsListItem[];
  rhListItems: RhDocumentsListItem[];
  rhDocumentsById: Map<string, RhDocumentRow>;
  currentRhFolderId: string | null;
  onRhNavigateFolder: (folderId: string | null) => void;
  onRhMoveDocumentToFolder: (document: RhDocumentRow, folderId: string) => void | Promise<void>;
  onRhRenameFolder: (folderId: string, currentName: string) => void | Promise<void>;
  onRhDeleteFolder: (folderId: string) => void | Promise<void>;
  onRhRestoreFolder: (folderId: string) => void | Promise<void>;
  onRhPurgeFolder: (folderId: string) => void | Promise<void>;
  onViewDocument: (document: RhDocumentRow) => void | Promise<void>;
  onDownloadDocument: (document: RhDocumentRow) => void | Promise<void>;
  onDeleteRhDocument: (document: RhDocumentRow) => void | Promise<void>;
  onRestoreRhDocument: (document: RhDocumentRow) => void | Promise<void>;
  onDeleteRhDocumentPermanently: (document: RhDocumentRow) => void | Promise<void>;
  viewingDocumentId: string | null;
  downloadingDocumentId: string | null;
  reviewingDocumentId: string | null;
  deletingRhDocumentId: string | null;
  setDraggedRhDocumentId: (value: string | null) => void;
  /** Filtres, poses dans la barre d'outils du tableau. */
  toolbar?: ReactNode;
  /**
   * Ouvre la fenetre de confirmation, ou le commentaire se saisit.
   *
   * Remplace l'appel direct a `onReviewDocument` : valider ou refuser depuis un menu, sans
   * confirmation ni possibilite de commenter, etait trop expeditif pour une action qui
   * notifie le collaborateur.
   */
  onOpenReviewDialog: (
    document: RhDocumentRow,
    status: "pending" | "validated" | "rejected",
  ) => void;
};

/**
 * Vue documentaire de l'espace RH.
 *
 * L'explorateur (corbeille, dossiers, glisser-deposer) vit dans
 * `DocumentsExplorerList` ; il ne reste ici que le menu d'actions propre au RH : le
 * commentaire de revue et les trois transitions de statut.
 */
export function RhDocumentsListView({
  toolbar,
  onOpenReviewDialog,
  storageScope,
  preferencesAuthToken,
  showRhFolderTrash,
  rhTrashListItems,
  rhTrashedDocumentItems,
  rhListItems,
  rhDocumentsById,
  currentRhFolderId,
  onRhNavigateFolder,
  onRhMoveDocumentToFolder,
  onRhRenameFolder,
  onRhDeleteFolder,
  onRhRestoreFolder,
  onRhPurgeFolder,
  onViewDocument,
  onDownloadDocument,
  onDeleteRhDocument,
  onRestoreRhDocument,
  onDeleteRhDocumentPermanently,
  viewingDocumentId,
  downloadingDocumentId,
  reviewingDocumentId,
  deletingRhDocumentId,
  setDraggedRhDocumentId,
}: RhDocumentsListViewProps) {
  return (
    <DocumentsExplorerList<RhDocumentRow>
      header={toolbar}
      storageScope={storageScope}
      preferencesAuthToken={preferencesAuthToken}
      showTrash={showRhFolderTrash}
      trashFolderItems={rhTrashListItems}
      trashDocumentItems={rhTrashedDocumentItems}
      items={rhListItems}
      documentsById={rhDocumentsById}
      currentFolderId={currentRhFolderId}
      storageKeys={{
        main: RH_SHARED_COLUMNS_STORAGE_KEY,
        trashFolders: "rh-documents-trash-folders-columns",
        trashDocuments: "rh-documents-trash-documents-columns",
      }}
      emptyMessage="Aucun document RH pour le moment."
      onNavigateFolder={onRhNavigateFolder}
      onMoveDocumentToFolder={onRhMoveDocumentToFolder}
      onRenameFolder={onRhRenameFolder}
      onDeleteFolder={onRhDeleteFolder}
      onRestoreFolder={onRhRestoreFolder}
      onPurgeFolder={onRhPurgeFolder}
      onRestoreDocument={onRestoreRhDocument}
      onPurgeDocument={onDeleteRhDocumentPermanently}
      purgingDocumentId={deletingRhDocumentId}
      onViewDocument={onViewDocument}
      setDraggedId={setDraggedRhDocumentId}
      renderDocumentActions={(document, closeMenu) => (
        <>
          {/*
            Plus de champ de commentaire ici, et plus d'entree « Visualiser » : le
            commentaire se saisit dans la fenetre de confirmation, et l'apercu s'ouvre par
            un double-clic sur la ligne.
          */}
          <DocumentViewDownloadActions
            document={document}
            closeMenu={closeMenu}
            onViewDocument={onViewDocument}
            onDownloadDocument={onDownloadDocument}
            viewingDocumentId={viewingDocumentId}
            downloadingDocumentId={downloadingDocumentId}
            showView={false}
          />
          {document.status !== "validated" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start text-validated hover:text-validated"
              onClick={() => {
                closeMenu();
                onOpenReviewDialog(document, "validated");
              }}
              disabled={reviewingDocumentId === document.id}
            >
              <Check className="mr-2 h-4 w-4" />
              {reviewingDocumentId === document.id ? "Traitement..." : "Valider"}
            </Button>
          ) : null}
          {document.status !== "rejected" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start text-rejected hover:text-rejected"
              onClick={() => {
                closeMenu();
                onOpenReviewDialog(document, "rejected");
              }}
              disabled={reviewingDocumentId === document.id}
            >
              <X className="mr-2 h-4 w-4" />
              {reviewingDocumentId === document.id ? "Traitement..." : "Refuser"}
            </Button>
          ) : null}
          {document.status !== "pending" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                closeMenu();
                onOpenReviewDialog(document, "pending");
              }}
              disabled={reviewingDocumentId === document.id}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Remettre en attente
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start text-rejected hover:text-rejected"
            onClick={() => {
              closeMenu();
              void onDeleteRhDocument(document);
            }}
            disabled={deletingRhDocumentId === document.id}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Supprimer
          </Button>
        </>
      )}
    />
  );
}
