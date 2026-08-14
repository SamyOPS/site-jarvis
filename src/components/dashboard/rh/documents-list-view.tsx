import { RotateCcw, Trash2 } from "lucide-react";

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
  onReviewDocument: (document: RhDocumentRow, status: "pending" | "validated" | "rejected") => void | Promise<void>;
  onDeleteRhDocument: (document: RhDocumentRow) => void | Promise<void>;
  onRestoreRhDocument: (document: RhDocumentRow) => void | Promise<void>;
  onDeleteRhDocumentPermanently: (document: RhDocumentRow) => void | Promise<void>;
  viewingDocumentId: string | null;
  downloadingDocumentId: string | null;
  reviewingDocumentId: string | null;
  deletingRhDocumentId: string | null;
  reviewDrafts: Record<string, string>;
  onReviewDraftsChange: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  setDraggedRhDocumentId: (value: string | null) => void;
};

/**
 * Vue documentaire de l'espace RH.
 *
 * L'explorateur (corbeille, dossiers, glisser-deposer) vit dans
 * `DocumentsExplorerList` ; il ne reste ici que le menu d'actions propre au RH : le
 * commentaire de revue et les trois transitions de statut.
 */
export function RhDocumentsListView({
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
  onReviewDocument,
  onDeleteRhDocument,
  onRestoreRhDocument,
  onDeleteRhDocumentPermanently,
  viewingDocumentId,
  downloadingDocumentId,
  reviewingDocumentId,
  deletingRhDocumentId,
  reviewDrafts,
  onReviewDraftsChange,
  setDraggedRhDocumentId,
}: RhDocumentsListViewProps) {
  return (
    <DocumentsExplorerList<RhDocumentRow>
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
          <input
            value={reviewDrafts[document.id] ?? document.reviewComment ?? ""}
            onChange={(event) =>
              onReviewDraftsChange((prev) => ({ ...prev, [document.id]: event.target.value }))
            }
            placeholder="Commentaire de validation ou de refus"
            className="h-9 w-full min-w-[240px] rounded-md border border-slate-300 px-3 text-sm"
          />
          <DocumentViewDownloadActions
            document={document}
            closeMenu={closeMenu}
            onViewDocument={onViewDocument}
            onDownloadDocument={onDownloadDocument}
            viewingDocumentId={viewingDocumentId}
            downloadingDocumentId={downloadingDocumentId}
          />
          {document.status !== "validated" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                closeMenu();
                void onReviewDocument(document, "validated");
              }}
              disabled={reviewingDocumentId === document.id}
            >
              {reviewingDocumentId === document.id ? "Traitement..." : "Valider"}
            </Button>
          ) : null}
          {document.status !== "rejected" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start text-red-600 hover:text-red-700"
              onClick={() => {
                closeMenu();
                void onReviewDocument(document, "rejected");
              }}
              disabled={reviewingDocumentId === document.id}
            >
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
                void onReviewDocument(document, "pending");
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
            className="w-full justify-start text-red-600 hover:text-red-700"
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
