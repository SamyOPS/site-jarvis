"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { browserSupabase } from "@/lib/supabase-browser";

/** Le minimum qu'un document doit porter pour etre ouvert ou telecharge. */
export type PreviewableDocument = {
  id: string;
  fileName: string;
  storageBucket: string;
  storagePath: string;
};

/**
 * Ouverture et telechargement d'un document via une URL signee (60 s).
 *
 * Etait recopie dans les espaces RH et salarie : les deux versions ne differaient que par
 * le nom du type de document et par le setter de message d'erreur. Ce dernier devient le
 * parametre `onMessage`, lu au travers d'une ref pour que les callbacks restent stables
 * meme si l'appelant passe une lambda en ligne.
 *
 * Les deux identifiants rendus servent aux etats desactives des boutons : ils n'etaient
 * ecrits que par ces deux handlers.
 */
export function useDocumentPreview<T extends PreviewableDocument>(
  onMessage: (message: string | null) => void,
) {
  const [viewingDocumentId, setViewingDocumentId] = useState<string | null>(null);
  const [downloadingDocumentId, setDownloadingDocumentId] = useState<string | null>(null);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  });

  const getSignedDocumentUrl = useCallback(
    async (document: T, options?: { download?: string }) => {
      if (!browserSupabase || !document.storagePath) return;
      const { data, error: downloadError } = await browserSupabase.storage
        .from(document.storageBucket)
        .createSignedUrl(
          document.storagePath,
          60,
          options?.download ? { download: options.download } : undefined,
        );
      if (downloadError || !data?.signedUrl) {
        throw new Error(
          downloadError?.message ?? "Impossible de generer le lien de telechargement.",
        );
      }

      return data.signedUrl;
    },
    [],
  );

  const handleViewDocument = useCallback(
    async (document: T) => {
      if (!document.storagePath) return;

      try {
        setViewingDocumentId(document.id);
        onMessageRef.current(null);
        const signedUrl = await getSignedDocumentUrl(document);
        if (!signedUrl) {
          return;
        }

        window.open(signedUrl, "_blank", "noopener,noreferrer");
      } catch (error) {
        onMessageRef.current(
          error instanceof Error ? error.message : "Impossible d'ouvrir le document.",
        );
      } finally {
        setViewingDocumentId(null);
      }
    },
    [getSignedDocumentUrl],
  );

  const handleDownloadDocument = useCallback(
    async (document: T) => {
      if (!document.storagePath) return;

      try {
        setDownloadingDocumentId(document.id);
        onMessageRef.current(null);
        const signedUrl = await getSignedDocumentUrl(document, {
          download: document.fileName,
        });
        if (!signedUrl) {
          return;
        }

        const link = window.document.createElement("a");
        link.href = signedUrl;
        link.rel = "noopener noreferrer";
        window.document.body.appendChild(link);
        link.click();
        link.remove();
      } catch (error) {
        onMessageRef.current(
          error instanceof Error ? error.message : "Impossible de telecharger le document.",
        );
      } finally {
        setDownloadingDocumentId(null);
      }
    },
    [getSignedDocumentUrl],
  );

  return {
    viewingDocumentId,
    downloadingDocumentId,
    getSignedDocumentUrl,
    handleViewDocument,
    handleDownloadDocument,
  };
}
