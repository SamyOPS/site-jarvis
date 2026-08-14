"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { DocumentFolderRow } from "@/domain/documents";

type FolderApiRow = {
  id: string;
  owner_user_id: string;
  name: string;
  parent_id: string | null;
  deleted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type UseDocumentFoldersOptions<TDoc extends { id: string }> = {
  /** Proprietaire des dossiers. Tant qu'il est absent, aucune operation ne part. */
  ownerUserId: string | null | undefined;
  callApi: (path: string, init?: RequestInit) => Promise<unknown>;
  onMessage: (message: string) => void;
  /** Applique le deplacement a la liste de documents, qui reste chez l'appelant. */
  onDocumentMoved: (document: TDoc, folderId: string | null) => void;
  /** La corbeille est ouverte : on quitte alors le dossier courant. */
  showTrash: boolean;
  /**
   * Condition supplementaire avant le chargement initial. L'espace RH attendait d'avoir
   * une session avant de charger ; le laisser parametrable evite de gommer cet ecart.
   */
  ready?: boolean;
  /**
   * `true` : le nouveau dossier est cree dans le dossier courant (comportement RH).
   * `false` : toujours a la racine (comportement salarie).
   * Ce n'est pas un booleen de role — c'est bien deux comportements produit distincts.
   */
  createInCurrentFolder?: boolean;
  /**
   * Traitement supplementaire apres suppression d'un dossier. Cote RH, il rafraichit les
   * compteurs du tableau de bord ; sans lui, ils restent figes sans erreur visible.
   */
  onAfterDelete?: () => void | Promise<void>;
};

/**
 * Gestion des dossiers de documents : chargement, arborescence, corbeille et deplacement.
 *
 * Les huit operations etaient recopiees dans les espaces RH et salarie, a l'identique
 * hormis le helper d'appel, le setter de message et les deux ecarts metier ci-dessus.
 */
export function useDocumentFolders<TDoc extends { id: string }>({
  ownerUserId,
  callApi,
  onMessage,
  onDocumentMoved,
  showTrash,
  ready = true,
  createInCurrentFolder = false,
  onAfterDelete,
}: UseDocumentFoldersOptions<TDoc>) {
  const [folders, setFolders] = useState<DocumentFolderRow[]>([]);
  const [trashedFolders, setTrashedFolders] = useState<DocumentFolderRow[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Les trois rappels sont lus au travers de refs : les callbacks ci-dessous restent
  // stables meme si l'appelant passe des lambdas en ligne.
  const onMessageRef = useRef(onMessage);
  const onDocumentMovedRef = useRef(onDocumentMoved);
  const onAfterDeleteRef = useRef(onAfterDelete);
  useEffect(() => {
    onMessageRef.current = onMessage;
    onDocumentMovedRef.current = onDocumentMoved;
    onAfterDeleteRef.current = onAfterDelete;
  });

  const loadFolders = useCallback(
    async (owner: string, trash = false) => {
      const payload = (await callApi(
        `/api/documents/folders?ownerUserId=${encodeURIComponent(owner)}&all=1${trash ? "&trash=1" : ""}`,
      )) as { items?: FolderApiRow[] };

      const mapped = (payload?.items ?? []).map((row) => ({
        id: row.id,
        ownerUserId: row.owner_user_id,
        name: row.name,
        parentId: row.parent_id,
        deletedAt: row.deleted_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      if (trash) {
        setTrashedFolders(mapped);
        return;
      }
      setFolders(mapped);
    },
    [callApi],
  );

  const reloadFolders = useCallback(
    async (owner: string) => {
      await Promise.all([loadFolders(owner), loadFolders(owner, true)]);
    },
    [loadFolders],
  );

  const createFolder = useCallback(async () => {
    if (!ownerUserId) return;
    const folderName = window.prompt("Nom du dossier");
    if (!folderName?.trim()) return;

    await callApi("/api/documents/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ownerUserId,
        name: folderName.trim(),
        parentId: createInCurrentFolder ? currentFolderId : null,
      }),
    });

    await reloadFolders(ownerUserId);
    onMessageRef.current("Dossier cree.");
  }, [callApi, createInCurrentFolder, currentFolderId, ownerUserId, reloadFolders]);

  const renameFolder = useCallback(
    async (folderId: string, currentName: string) => {
      if (!ownerUserId) return;
      const nextName = window.prompt("Nouveau nom du dossier", currentName);
      if (!nextName?.trim() || nextName.trim() === currentName.trim()) return;

      await callApi(`/api/documents/folders/${encodeURIComponent(folderId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName.trim() }),
      });

      await reloadFolders(ownerUserId);
      onMessageRef.current("Dossier renomme.");
    },
    [callApi, ownerUserId, reloadFolders],
  );

  const deleteFolder = useCallback(
    async (folderId: string) => {
      if (!ownerUserId) return;
      if (!window.confirm("Supprimer ce dossier ?")) return;

      await callApi(`/api/documents/folders/${encodeURIComponent(folderId)}`, {
        method: "DELETE",
      });

      await reloadFolders(ownerUserId);
      if (currentFolderId === folderId) {
        setCurrentFolderId(null);
      }
      await onAfterDeleteRef.current?.();
      onMessageRef.current("Dossier supprime.");
    },
    [callApi, currentFolderId, ownerUserId, reloadFolders],
  );

  const restoreFolder = useCallback(
    async (folderId: string) => {
      if (!ownerUserId) return;
      await callApi(`/api/documents/folders/${encodeURIComponent(folderId)}/restore`, {
        method: "POST",
      });
      await reloadFolders(ownerUserId);
      onMessageRef.current("Dossier restaure.");
    },
    [callApi, ownerUserId, reloadFolders],
  );

  const purgeFolder = useCallback(
    async (folderId: string) => {
      if (!ownerUserId) return;
      if (!window.confirm("Supprimer definitivement ce dossier et tout son contenu ?")) return;

      await callApi(`/api/documents/folders/${encodeURIComponent(folderId)}/purge`, {
        method: "DELETE",
      });
      await reloadFolders(ownerUserId);
      onMessageRef.current("Dossier supprime definitivement.");
    },
    [callApi, ownerUserId, reloadFolders],
  );

  const moveDocument = useCallback(
    async (document: TDoc, folderId: string | null) => {
      if (!ownerUserId) return;

      await callApi(`/api/documents/items/${encodeURIComponent(document.id)}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerUserId, folderId }),
      });

      onDocumentMovedRef.current(document, folderId);
      onMessageRef.current(
        folderId ? "Document deplace dans le dossier." : "Document deplace a la racine.",
      );
    },
    [callApi, ownerUserId],
  );

  const moveDocumentToFolder = useCallback(
    (document: TDoc, folderId: string) => moveDocument(document, folderId),
    [moveDocument],
  );

  const moveDocumentToRoot = useCallback(
    (document: TDoc) => moveDocument(document, null),
    [moveDocument],
  );

  // Chargement initial, et rechargement quand le proprietaire change.
  useEffect(() => {
    if (!ownerUserId || !ready) return;
    void reloadFolders(ownerUserId).catch((loadError) => {
      onMessageRef.current(
        loadError instanceof Error ? loadError.message : "Chargement des dossiers impossible.",
      );
    });
  }, [ownerUserId, ready, reloadFolders]);

  /** Chemin de la racine jusqu'au dossier courant, pour le fil d'Ariane. */
  const folderPath = useMemo(() => {
    const byId = new Map(folders.map((folder) => [folder.id, folder]));
    const path: DocumentFolderRow[] = [];
    let cursor = currentFolderId;
    while (cursor) {
      const folder = byId.get(cursor);
      if (!folder) break;
      path.unshift(folder);
      cursor = folder.parentId ?? null;
    }
    return path;
  }, [currentFolderId, folders]);

  // Le dossier courant a disparu (supprime, ou charge d'un autre proprietaire).
  useEffect(() => {
    if (currentFolderId && !folders.some((folder) => folder.id === currentFolderId)) {
      setCurrentFolderId(null);
    }
  }, [currentFolderId, folders]);

  // La corbeille montre une autre arborescence : on en sort le dossier courant.
  useEffect(() => {
    if (showTrash && currentFolderId) {
      setCurrentFolderId(null);
    }
  }, [currentFolderId, showTrash]);

  return {
    folders,
    trashedFolders,
    currentFolderId,
    setCurrentFolderId,
    folderPath,
    loadFolders,
    reloadFolders,
    createFolder,
    renameFolder,
    deleteFolder,
    restoreFolder,
    purgeFolder,
    moveDocumentToFolder,
    moveDocumentToRoot,
  };
}
