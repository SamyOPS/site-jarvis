import { Download, Eye, FolderOpen, Pencil, RotateCcw, Trash2 } from "lucide-react";

import { DashboardDocumentList } from "@/components/dashboard/document-list";
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
  if (showRhFolderTrash) {
    if (!rhTrashListItems.length && !rhTrashedDocumentItems.length) {
      return <p className="text-sm text-[#0A1A2F]/70">La corbeille est vide.</p>;
    }

    return (
      <div className="space-y-5">
        {rhTrashListItems.length ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#0A1A2F]/80">Dossiers</p>
            <DashboardDocumentList
              items={rhTrashListItems}
              storageKey="rh-documents-trash-folders-columns"
              storageScope={storageScope}
              preferencesAuthToken={preferencesAuthToken}
              createdAtLabel="Date de mise a la corbeille"
              renderActionCell={(item) => {
                if (item.rowType !== "folder") return null;
                return (
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
                      onClick={() => {
                        void onRhRestoreFolder(item.folderId);
                      }}
                      aria-label={`Restaurer ${item.fileName}`}
                      title="Restaurer"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700"
                      onClick={() => {
                        void onRhPurgeFolder(item.folderId);
                      }}
                      aria-label={`Supprimer definitivement ${item.fileName}`}
                      title="Supprimer definitivement"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              }}
            />
          </div>
        ) : null}
        {rhTrashedDocumentItems.length ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#0A1A2F]/80">Documents</p>
            <DashboardDocumentList
              items={rhTrashedDocumentItems}
              storageKey="rh-documents-trash-documents-columns"
              storageScope={storageScope}
              preferencesAuthToken={preferencesAuthToken}
              createdAtLabel="Date de mise a la corbeille"
              renderActionCell={(item) => {
                if (item.rowType !== "document") return null;
                const document = item.document;
                return (
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
                      onClick={() => {
                        void onRestoreRhDocument(document);
                      }}
                      aria-label={`Restaurer ${item.fileName}`}
                      title="Restaurer"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700"
                      onClick={() => {
                        void onDeleteRhDocumentPermanently(document);
                      }}
                      disabled={deletingRhDocumentId === document.id}
                      aria-label={`Supprimer definitivement ${item.fileName}`}
                      title="Supprimer definitivement"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              }}
            />
          </div>
        ) : null}
      </div>
    );
  }

  if (!rhListItems.length) {
    return <p className="text-sm text-[#0A1A2F]/70">Aucun document RH pour le moment.</p>;
  }

  return (
    <DashboardDocumentList
      items={rhListItems}
      storageKey={RH_SHARED_COLUMNS_STORAGE_KEY}
      storageScope={storageScope}
      preferencesAuthToken={preferencesAuthToken}
      columnControlPlacement="inline"
      onItemDoubleClick={(item) => {
        if (item.rowType === "folder") {
          onRhNavigateFolder(item.folderId);
          return;
        }
        const document = item.document;
        if (
          document.fileName.toLowerCase().endsWith(".pdf") &&
          document.storagePath
        ) {
          void onViewDocument(document);
        }
      }}
      isItemDoubleClickable={(item) =>
        item.rowType === "folder" ||
        (item.document.fileName.toLowerCase().endsWith(".pdf") && !!item.document.storagePath)
      }
      getDraggableId={(item) => (item.rowType === "document" ? item.document.id : null)}
      onDragItemStart={(item) => {
        if (item.rowType !== "document") return;
        setDraggedRhDocumentId(item.document.id);
      }}
      onDragItemEnd={() => {
        setDraggedRhDocumentId(null);
      }}
      canDropOnItem={(targetItem, draggedId) => {
        if (targetItem.rowType !== "folder") return false;
        const draggedDocument = rhDocumentsById.get(draggedId);
        if (!draggedDocument) return false;
        return (draggedDocument.folderId ?? null) !== targetItem.folderId;
      }}
      onItemDrop={async (targetItem, draggedId) => {
        if (targetItem.rowType !== "folder") return;
        const draggedDocument = rhDocumentsById.get(draggedId);
        if (!draggedDocument) return;
        await onRhMoveDocumentToFolder(draggedDocument, targetItem.folderId);
      }}
      renderActions={(item, closeMenu) => {
        if (item.rowType === "folder") {
          return (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  closeMenu();
                  onRhNavigateFolder(item.folderId);
                }}
                disabled={currentRhFolderId === item.folderId}
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                Ouvrir le dossier
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  closeMenu();
                  void onRhRenameFolder(item.folderId, item.fileName);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Renommer
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start text-red-600 hover:text-red-700"
                onClick={() => {
                  closeMenu();
                  void onRhDeleteFolder(item.folderId);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </Button>
            </>
          );
        }

        const document = item.document;
        return (
          <>
            <input
              value={reviewDrafts[document.id] ?? document.reviewComment ?? ""}
              onChange={(event) =>
                onReviewDraftsChange((prev) => ({ ...prev, [document.id]: event.target.value }))
              }
              placeholder="Commentaire de validation ou de refus"
              className="h-9 w-full min-w-[240px] rounded-md border border-slate-300 px-3 text-sm"
            />
            {document.fileName.toLowerCase().endsWith(".pdf") ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  closeMenu();
                  void onViewDocument(document);
                }}
                disabled={
                  !document.storagePath ||
                  viewingDocumentId === document.id ||
                  downloadingDocumentId === document.id
                }
              >
                <Eye className="mr-2 h-4 w-4" />
                Visualiser
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                closeMenu();
                void onDownloadDocument(document);
              }}
              disabled={
                !document.storagePath ||
                downloadingDocumentId === document.id ||
                viewingDocumentId === document.id
              }
            >
              <Download className="mr-2 h-4 w-4" />
              Télécharger
            </Button>
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
        );
      }}
    />
  );
}
