import { Download, Eye, FolderOpen, MessageSquareText, Pencil, RotateCcw, Trash2 } from "lucide-react";

import { DashboardDocumentList } from "@/components/dashboard/document-list";
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
};

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
}: SalarieDocumentsListViewProps) {
  return (
    <div className="space-y-1">
      <DocumentFiltersBar
        fields={showFolderTrash ? ["type", "period"] : ["type", "period", "status"]}
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
      {showFolderTrash ? (
        trashFolderItems.length || trashDocumentItems.length ? (
          <div className="space-y-5">
            {trashFolderItems.length ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-[#0A1A2F]/80">Dossiers</p>
                <DashboardDocumentList
                  items={trashFolderItems}
                  storageKey="salarie-documents-trash-columns"
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
                            void onRestoreFolder(item.folderId);
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
                            void onPurgeFolder(item.folderId);
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
            {trashDocumentItems.length ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-[#0A1A2F]/80">Documents</p>
                <DashboardDocumentList
                  items={trashDocumentItems}
                  storageKey="salarie-documents-trash-documents-columns"
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
                            void onRestoreDocument(document);
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
                            void onPurgeDocument(document);
                          }}
                          disabled={deletingDocumentId === document.id}
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
        ) : (
          <p className="text-sm text-[#0A1A2F]/70">La corbeille est vide.</p>
        )
      ) : listItems.length ? (
        <DashboardDocumentList
          items={listItems}
          storageKey="salarie-documents-columns"
          storageScope={storageScope}
          preferencesAuthToken={preferencesAuthToken}
          columnControlPlacement="inline"
          onItemDoubleClick={(item) => {
            if (item.rowType === "folder") {
              onNavigateFolder(item.folderId);
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
            setDraggedDocumentId(item.document.id);
          }}
          onDragItemEnd={() => {
            setDraggedDocumentId(null);
          }}
          canDropOnItem={(targetItem, draggedId) => {
            if (targetItem.rowType !== "folder") return false;
            const draggedDocument = documentsById.get(draggedId);
            if (!draggedDocument) return false;
            return (draggedDocument.folderId ?? null) !== targetItem.folderId;
          }}
          onItemDrop={async (targetItem, draggedId) => {
            if (targetItem.rowType !== "folder") return;
            const draggedDocument = documentsById.get(draggedId);
            if (!draggedDocument) return;
            await onMoveDocumentToFolder(draggedDocument, targetItem.folderId);
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
                      onNavigateFolder(item.folderId);
                    }}
                    disabled={currentFolderId === item.folderId}
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
                      void onRenameFolder(item.folderId, item.fileName);
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
                      void onDeleteFolder(item.folderId);
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
                {document.status !== "validated" ? (
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
            );
          }}
        />
      ) : (
        <p className="text-sm text-[#0A1A2F]/70">Aucun document depose pour le moment.</p>
      )}
    </div>
  );
}
