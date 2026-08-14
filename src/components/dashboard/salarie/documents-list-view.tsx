import { MessageSquareText, Pencil, Trash2 } from "lucide-react";

import {
  DocumentsExplorerList,
  DocumentViewDownloadActions,
} from "@/components/dashboard/documents/explorer-list";
import { DocumentFiltersBar } from "@/components/dashboard/document-filters-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  SalarieDocumentRow as DocumentRow,
  SalarieDocumentsListItem,
} from "@/features/dashboard/salarie/types";

type FilterOption = {
  value: string;
  label: string;
};

type SalarieDocumentsListViewProps = {
  storageScope?: string | null;
  preferencesAuthToken?: string | null;
  showFolderTrash: boolean;
  documentTypeFilter: string;
  documentPeriodFilter: string;
  documentStatusFilter: string;
  documentFilterOptions: Record<"type" | "period" | "status" | "owner", FilterOption[]>;
  onDocumentTypeFilterChange: (value: string) => void;
  onDocumentPeriodFilterChange: (value: string) => void;
  onDocumentStatusFilterChange: (value: string) => void;
  trashFolderItems: SalarieDocumentsListItem[];
  trashDocumentItems: SalarieDocumentsListItem[];
  listItems: SalarieDocumentsListItem[];
  documentsById: Map<string, DocumentRow>;
  currentFolderId: string | null;
  onNavigateFolder: (folderId: string | null) => void;
  onMoveDocumentToFolder: (document: DocumentRow, folderId: string) => void | Promise<void>;
  onRenameFolder: (folderId: string, currentName: string) => void | Promise<void>;
  onDeleteFolder: (folderId: string) => void | Promise<void>;
  onRestoreFolder: (folderId: string) => void | Promise<void>;
  onPurgeFolder: (folderId: string) => void | Promise<void>;
  onViewDocument: (document: DocumentRow) => void | Promise<void>;
  onDownloadDocument: (document: DocumentRow) => void | Promise<void>;
  onDeleteDocument: (document: DocumentRow) => void | Promise<void>;
  onRenameDocument: (document: DocumentRow) => void | Promise<void>;
  onOpenCommentDialog: (document: DocumentRow) => void;
  onRestoreDocument: (document: DocumentRow) => void | Promise<void>;
  onPurgeDocument: (document: DocumentRow) => void | Promise<void>;
  viewingDocumentId: string | null;
  downloadingDocumentId: string | null;
  deletingDocumentId: string | null;
  savingDocumentId: string | null;
  setDraggedDocumentId: (value: string | null) => void;
  /**
   * Vue consultation seule (fiches de paie deposees par les RH) : pas de
   * renommage, de suppression ni de deplacement, et pas de filtre de type
   * puisque la liste ne contient qu'une seule famille de documents.
   */
  readOnly?: boolean;
  emptyMessage?: string;
};

/**
 * Vue documentaire de l'espace salarie.
 *
 * L'explorateur vit dans `DocumentsExplorerList` ; il ne reste ici que la barre de
 * filtres et le menu d'actions propre au salarie — commentaire RH en lecture, renommage
 * et suppression tant que le document n'est pas valide.
 */
export function SalarieDocumentsListView({
  storageScope,
  preferencesAuthToken,
  showFolderTrash,
  documentTypeFilter,
  documentPeriodFilter,
  documentStatusFilter,
  documentFilterOptions,
  onDocumentTypeFilterChange,
  onDocumentPeriodFilterChange,
  onDocumentStatusFilterChange,
  trashFolderItems,
  trashDocumentItems,
  listItems,
  documentsById,
  currentFolderId,
  onNavigateFolder,
  onMoveDocumentToFolder,
  onRenameFolder,
  onDeleteFolder,
  onRestoreFolder,
  onPurgeFolder,
  onViewDocument,
  onDownloadDocument,
  onDeleteDocument,
  onRenameDocument,
  onOpenCommentDialog,
  onRestoreDocument,
  onPurgeDocument,
  viewingDocumentId,
  downloadingDocumentId,
  deletingDocumentId,
  savingDocumentId,
  setDraggedDocumentId,
  readOnly = false,
  emptyMessage = "Aucun document depose pour le moment.",
}: SalarieDocumentsListViewProps) {
  return (
    <DocumentsExplorerList<DocumentRow>
      storageScope={storageScope}
      preferencesAuthToken={preferencesAuthToken}
      header={
        <DocumentFiltersBar
          fields={
            showFolderTrash
              ? ["type", "period"]
              : readOnly
                ? ["period"]
                : ["type", "period", "status"]
          }
          values={{
            type: documentTypeFilter,
            period: documentPeriodFilter,
            status: documentStatusFilter,
            owner: "all",
          }}
          options={documentFilterOptions}
          onChange={(field, value) => {
            if (field === "type") onDocumentTypeFilterChange(value);
            if (field === "period") onDocumentPeriodFilterChange(value);
            if (field === "status") onDocumentStatusFilterChange(value);
          }}
        />
      }
      showTrash={showFolderTrash}
      trashFolderItems={trashFolderItems}
      trashDocumentItems={trashDocumentItems}
      items={listItems}
      documentsById={documentsById}
      currentFolderId={currentFolderId}
      storageKeys={{
        main: "salarie-documents-columns",
        trashFolders: "salarie-documents-trash-columns",
        trashDocuments: "salarie-documents-trash-documents-columns",
      }}
      emptyMessage={emptyMessage}
      readOnly={readOnly}
      onNavigateFolder={onNavigateFolder}
      onMoveDocumentToFolder={onMoveDocumentToFolder}
      onRenameFolder={onRenameFolder}
      onDeleteFolder={onDeleteFolder}
      onRestoreFolder={onRestoreFolder}
      onPurgeFolder={onPurgeFolder}
      onRestoreDocument={onRestoreDocument}
      onPurgeDocument={onPurgeDocument}
      purgingDocumentId={deletingDocumentId}
      onViewDocument={onViewDocument}
      setDraggedId={setDraggedDocumentId}
      renderDocumentActions={(document, closeMenu) => (
        <>
          <DocumentViewDownloadActions
            document={document}
            closeMenu={closeMenu}
            onViewDocument={onViewDocument}
            onDownloadDocument={onDownloadDocument}
            viewingDocumentId={viewingDocumentId}
            downloadingDocumentId={downloadingDocumentId}
          />
          {document.reviewComment ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                closeMenu();
                onOpenCommentDialog(document);
              }}
            >
              <MessageSquareText className="mr-2 h-4 w-4" />
              Voir commentaire RH
            </Button>
          ) : null}
          {readOnly ? null : document.status !== "validated" ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  closeMenu();
                  void onRenameDocument(document);
                }}
                disabled={
                  deletingDocumentId === document.id || savingDocumentId === document.id
                }
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
                  void onDeleteDocument(document);
                }}
                disabled={
                  deletingDocumentId === document.id || savingDocumentId === document.id
                }
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </Button>
            </>
          ) : (
            <Badge variant="outline">Verrouillé</Badge>
          )}
        </>
      )}
    />
  );
}
