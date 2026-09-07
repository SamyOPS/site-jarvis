"use client";

import type { ReactNode } from "react";
import { Download, Eye, FolderOpen, Pencil, RotateCcw, Trash2 } from "lucide-react";

import { DashboardDocumentList } from "@/components/dashboard/document-list";
import { Button } from "@/components/ui/button";
import type { DocumentListItem } from "@/domain/documents";

/** Un document affichable dans l'explorateur, quel que soit le role. */
type ExplorerDocument = {
  id: string;
  fileName: string;
  folderId: string | null;
  storagePath: string;
};

/**
 * Ligne de l'explorateur : un dossier ou un document. Les deux roles construisent la
 * meme forme via `features/dashboard/documents/list-items.ts`.
 */
type ExplorerItem<TDoc> = DocumentListItem &
  ({ rowType: "folder"; folderId: string } | { rowType: "document"; document: TDoc });

type DocumentsExplorerListProps<TDoc extends ExplorerDocument> = {
  storageScope?: string | null;
  preferencesAuthToken?: string | null;

  /** Contenu insere avant la liste — la barre de filtres cote salarie. */
  header?: ReactNode;

  showTrash: boolean;
  trashFolderItems: ExplorerItem<TDoc>[];
  trashDocumentItems: ExplorerItem<TDoc>[];
  items: ExplorerItem<TDoc>[];
  documentsById: Map<string, TDoc>;
  currentFolderId: string | null;

  /**
   * Cles de persistance des colonnes, distinctes par role et par liste : les preferences
   * d'affichage d'un RH et d'un salarie ne doivent pas se melanger.
   */
  storageKeys: { main: string; trashFolders: string; trashDocuments: string };
  emptyMessage: string;
  trashEmptyMessage?: string;

  /** Vue consultation seule : le glisser-deposer est desactive. */
  readOnly?: boolean;

  onNavigateFolder: (folderId: string | null) => void;
  onMoveDocumentToFolder: (document: TDoc, folderId: string) => void | Promise<void>;
  onRenameFolder: (folderId: string, currentName: string) => void | Promise<void>;
  onDeleteFolder: (folderId: string) => void | Promise<void>;
  onRestoreFolder: (folderId: string) => void | Promise<void>;
  onPurgeFolder: (folderId: string) => void | Promise<void>;
  onRestoreDocument: (document: TDoc) => void | Promise<void>;
  onPurgeDocument: (document: TDoc) => void | Promise<void>;
  /** Identifiant du document en cours de suppression, pour desactiver son bouton. */
  purgingDocumentId: string | null;

  onViewDocument: (document: TDoc) => void | Promise<void>;
  setDraggedId: (value: string | null) => void;

  /**
   * Actions du menu d'un document. C'est le seul endroit ou les deux roles divergent
   * reellement : le RH y met la revue (commentaire, valider, refuser), le salarie le
   * renommage et la suppression. Composer `DocumentViewDownloadActions` pour les deux
   * boutons communs, dont la position dans le menu differe selon le role.
   */
  renderDocumentActions: (document: TDoc, closeMenu: () => void) => ReactNode;
};

/** Le couple Visualiser / Telecharger, identique dans les deux menus de document. */
export function DocumentViewDownloadActions<TDoc extends ExplorerDocument>({
  document,
  closeMenu,
  onViewDocument,
  onDownloadDocument,
  viewingDocumentId,
  downloadingDocumentId,
  showView = true,
}: {
  document: TDoc;
  closeMenu: () => void;
  onViewDocument: (document: TDoc) => void | Promise<void>;
  onDownloadDocument: (document: TDoc) => void | Promise<void>;
  viewingDocumentId: string | null;
  downloadingDocumentId: string | null;
  /**
   * Affiche l'entree « Visualiser ». Le menu RH la masque : le double-clic sur la ligne
   * ouvre deja l'apercu, l'entree faisait doublon.
   */
  showView?: boolean;
}) {
  const busy =
    !document.storagePath ||
    viewingDocumentId === document.id ||
    downloadingDocumentId === document.id;

  return (
    <>
      {showView && document.fileName.toLowerCase().endsWith(".pdf") ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => {
            closeMenu();
            void onViewDocument(document);
          }}
          disabled={busy}
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
        disabled={busy}
      >
        <Download className="mr-2 h-4 w-4" />
        Télécharger
      </Button>
    </>
  );
}

/**
 * Restaurer / Supprimer definitivement, en entrees du menu « ... ».
 *
 * La corbeille posait ces deux actions en boutons-icones nus dans la colonne Actions, la
 * ou la liste classique n'affiche qu'un menu. Meme liste, meme geste : on ouvre le menu.
 */
function trashMenuActions({
  label,
  onRestore,
  onPurge,
  purgeDisabled,
  closeMenu,
}: {
  label: string;
  onRestore: () => void;
  onPurge: () => void;
  purgeDisabled?: boolean;
  closeMenu: () => void;
}) {
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full justify-start text-validated hover:text-validated"
        onClick={() => {
          closeMenu();
          onRestore();
        }}
      >
        <RotateCcw className="mr-2 h-4 w-4" />
        Restaurer
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full justify-start text-rejected hover:text-rejected"
        onClick={() => {
          closeMenu();
          onPurge();
        }}
        disabled={purgeDisabled}
        aria-label={`Supprimer définitivement ${label}`}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Supprimer définitivement
      </Button>
    </>
  );
}

/**
 * Explorateur de documents : corbeille, liste, navigation dans les dossiers et
 * glisser-deposer.
 *
 * Les espaces RH et salarie en portaient chacun une copie : bloc corbeille, configuration
 * du glisser-deposer, predicat de double-clic sur les PDF et actions de dossier etaient
 * identiques a la lettre. Seul le menu d'actions d'un document differe reellement, d'ou
 * la render-prop `renderDocumentActions` — et aucun booleen de role.
 */
export function DocumentsExplorerList<TDoc extends ExplorerDocument>({
  storageScope,
  preferencesAuthToken,
  header,
  showTrash,
  trashFolderItems,
  trashDocumentItems,
  items,
  documentsById,
  currentFolderId,
  storageKeys,
  emptyMessage,
  trashEmptyMessage = "La corbeille est vide.",
  readOnly = false,
  onNavigateFolder,
  onMoveDocumentToFolder,
  onRenameFolder,
  onDeleteFolder,
  onRestoreFolder,
  onPurgeFolder,
  onRestoreDocument,
  onPurgeDocument,
  purgingDocumentId,
  onViewDocument,
  setDraggedId,
  renderDocumentActions,
}: DocumentsExplorerListProps<TDoc>) {
  const trashView =
    !trashFolderItems.length && !trashDocumentItems.length ? (
      // Le vide entre dans le cadre, comme celui de la liste classique, au lieu d'une
      // phrase nue posee sur le fond de page.
      <div className="rounded-app-card border border-app-line bg-app-surface p-4">
        <p className="text-app-sm text-app-text-muted">{trashEmptyMessage}</p>
      </div>
    ) : (
      <div className="space-y-4">
        {trashFolderItems.length ? (
          <DashboardDocumentList
            // L'intitule entre dans la barre d'outils, a la place des controles de la liste
            // classique ; le decompte reste a droite. Il flottait au-dessus du cadre.
            // Cote documents, ce sont les filtres qui occupent cette place.
            toolbar={<span className="text-app-sm font-medium text-app-text">Dossiers</span>}
            countLabelSingular="dossier"
            countLabelPlural="dossiers"
            columnControlPlacement="inline"
            items={trashFolderItems}
            storageKey={storageKeys.trashFolders}
            storageScope={storageScope}
            preferencesAuthToken={preferencesAuthToken}
            createdAtLabel="Date de mise à la corbeille"
            renderActions={(item, closeMenu) =>
              item.rowType !== "folder"
                ? null
                : trashMenuActions({
                    label: item.fileName,
                    onRestore: () => void onRestoreFolder(item.folderId),
                    onPurge: () => void onPurgeFolder(item.folderId),
                    closeMenu,
                  })
            }
          />
        ) : null}
        {trashDocumentItems.length ? (
          <DashboardDocumentList
            // Les filtres prennent la place de l'intitule « Documents » : le decompte a
            // droite dit deja de quoi ce tableau est fait.
            toolbar={header}
            columnControlPlacement="inline"
            items={trashDocumentItems}
            storageKey={storageKeys.trashDocuments}
            storageScope={storageScope}
            preferencesAuthToken={preferencesAuthToken}
            createdAtLabel="Date de mise à la corbeille"
            renderActions={(item, closeMenu) =>
              item.rowType !== "document"
                ? null
                : trashMenuActions({
                    label: item.fileName,
                    onRestore: () => void onRestoreDocument(item.document),
                    onPurge: () => void onPurgeDocument(item.document),
                    purgeDisabled: purgingDocumentId === item.document.id,
                    closeMenu,
                  })
            }
          />
        ) : null}
      </div>
    );

  const listView = !items.length ? (
    <div className="rounded-app-card border border-app-line bg-app-surface p-4">
      {header ? <div className="mb-4">{header}</div> : null}
      <p className="text-app-sm text-app-text-muted">{emptyMessage}</p>
    </div>
  ) : (
    <DashboardDocumentList
      // Les filtres entrent dans la barre d'outils du cadre : un seul bloc, comme la liste
      // des collaborateurs, au lieu d'une barre flottant au-dessus du tableau.
      toolbar={header}
      items={items}
      storageKey={storageKeys.main}
      storageScope={storageScope}
      preferencesAuthToken={preferencesAuthToken}
      columnControlPlacement="inline"
      onItemDoubleClick={(item) => {
        if (item.rowType === "folder") {
          onNavigateFolder(item.folderId);
          return;
        }
        const document = item.document;
        if (document.fileName.toLowerCase().endsWith(".pdf") && document.storagePath) {
          void onViewDocument(document);
        }
      }}
      isItemDoubleClickable={(item) =>
        item.rowType === "folder" ||
        (item.document.fileName.toLowerCase().endsWith(".pdf") && !!item.document.storagePath)
      }
      getDraggableId={(item) =>
        !readOnly && item.rowType === "document" ? item.document.id : null
      }
      onDragItemStart={(item) => {
        if (item.rowType !== "document") return;
        setDraggedId(item.document.id);
      }}
      onDragItemEnd={() => setDraggedId(null)}
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

        return renderDocumentActions(item.document, closeMenu);
      }}
    />
  );

  return (
    <div className="space-y-4">
      {/*
        En vue normale, `header` entre dans la barre d'outils du tableau. En corbeille il
        reste au-dessus : les filtres gouvernent LES DEUX tableaux (dossiers et documents),
        les loger dans la barre d'outils de l'un laisserait croire qu'il n'agit que sur lui.
      */}
      {showTrash ? (
        <>
          {/*
            Les filtres sont loges dans la barre d'outils du tableau « Documents ». Ils
            gouvernent AUSSI celui des dossiers : quand le tableau des documents n'est pas
            rendu — filtre trop restrictif, ou corbeille sans document — ils remontent
            au-dessus, faute de quoi la barre qui a masque les lignes disparaitrait avec
            elles et le filtre deviendrait impossible a lever.
          */}
          {trashDocumentItems.length ? null : header}
          {trashView}
        </>
      ) : (
        listView
      )}
    </div>
  );
}
