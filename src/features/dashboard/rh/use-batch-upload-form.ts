"use client";

import { useCallback, useMemo, useState } from "react";

import { buildBatchUploadRows, type BatchUploadRow } from "@/features/dashboard/rh/document-batch";

/** Ce que le hook a besoin de savoir d'un collaborateur pour attribuer les fichiers. */
type AssignableEmployee = Parameters<typeof buildBatchUploadRows>[1][number];

/**
 * Depot de documents en lot par un RH.
 *
 * Cinq etats et cinq handlers qui vivaient a plat dans `rh-workspace`, tous consacres au
 * meme dialogue. Le calcul lui-meme (attribution d'un fichier a un collaborateur d'apres son
 * nom) reste dans `document-batch.ts`, qui est pur : ce hook n'en tient que l'etat.
 *
 * L'ENVOI n'est pas ici : il appelle l'API et rafraichit le tableau de bord, il reste donc
 * au workspace, qui seul detient ces moyens.
 */
export function useBatchUploadForm(
  employees: AssignableEmployee[],
  /** Types autorises pour un collaborateur. `null` = aucune restriction. */
  allowedTypeIdsForEmployee: (employeeId: string) => Set<string> | null,
) {
  const [open, setOpen] = useState(false);
  const [defaultTypeId, setDefaultTypeId] = useState("");
  const [rows, setRows] = useState<BatchUploadRow[]>([]);
  const [uploading, setUploading] = useState(false);
  /** Collaborateur impose quand le depot est ouvert depuis une fiche. */
  const [presetEmployeeId, setPresetEmployeeId] = useState("");

  const reset = useCallback(() => {
    setRows([]);
    setUploading(false);
    setPresetEmployeeId("");
  }, []);

  /**
   * Ouvre le depot. `employeeId` impose le collaborateur quand on part de sa fiche ; sinon
   * l'attribution vient du nom de fichier.
   *
   * Ne touche pas au message de la page : il appartient au workspace.
   */
  const openDialog = useCallback(
    (employeeId?: string) => {
      reset();
      setPresetEmployeeId(employeeId ?? "");
      setOpen(true);
    },
    [reset],
  );

  /**
   * Recalcule les lignes a partir des fichiers choisis. La correspondance se fait cote
   * client : la liste des salaries avec leur nom complet est deja chargee.
   */
  const handleFilesSelected = useCallback(
    (files: File[]) => {
      setRows(buildBatchUploadRows(files, employees, defaultTypeId, presetEmployeeId));
    },
    [defaultTypeId, employees, presetEmployeeId],
  );

  const handleRowChange = useCallback(
    (key: string, patch: Partial<BatchUploadRow>) => {
      setRows((previousRows) =>
        previousRows.map((row) => {
          if (row.key !== key) return row;

          // Toute modification manuelle efface l'erreur precedente : la ligne redevient
          // deposable sans avoir a rouvrir le dialogue.
          const nextRow = {
            ...row,
            ...patch,
            status: row.status === "error" ? ("pending" as const) : row.status,
            error: null,
          };

          // Le type retenu doit rester autorise pour le collaborateur de la ligne. Sans ce
          // reset, changer de collaborateur laissait un type absent de la liste : le select
          // affichait « Choisir » alors que l'ancien type partait quand meme au serveur.
          const allowed = allowedTypeIdsForEmployee(nextRow.employeeId);
          if (nextRow.documentTypeId && allowed && !allowed.has(nextRow.documentTypeId)) {
            return { ...nextRow, documentTypeId: "" };
          }
          return nextRow;
        }),
      );
    },
    [allowedTypeIdsForEmployee],
  );

  const handleRemoveRow = useCallback((key: string) => {
    setRows((previousRows) => previousRows.filter((row) => row.key !== key));
  }, []);

  /** Un changement de type par defaut se propage aux lignes encore intouchees. */
  const handleDefaultTypeChange = useCallback(
    (documentTypeId: string) => {
      setDefaultTypeId(documentTypeId);
      setRows((previousRows) =>
        previousRows.map((row) =>
          row.status === "pending" && row.documentTypeId === defaultTypeId
            ? { ...row, documentTypeId }
            : row,
        ),
      );
    },
    [defaultTypeId],
  );

  // Memoise : les appelants passent cet objet en dependance de leurs propres hooks.
  return useMemo(
    () => ({
      open,
      setOpen,
      defaultTypeId,
      rows,
      setRows,
      uploading,
      setUploading,
      presetEmployeeId,
      reset,
      openDialog,
      handleFilesSelected,
      handleRowChange,
      handleRemoveRow,
      handleDefaultTypeChange,
    }),
    [
      defaultTypeId,
      handleDefaultTypeChange,
      handleFilesSelected,
      handleRemoveRow,
      handleRowChange,
      open,
      openDialog,
      presetEmployeeId,
      reset,
      rows,
      uploading,
    ],
  );
}
