"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Formulaire de demande de document adressee a un collaborateur.
 *
 * Regroupe les sept etats qui vivaient a plat dans `rh-workspace`, la liste des types
 * reellement demandables pour le collaborateur choisi, et la garde qui efface le type quand
 * il sort du perimetre de ce collaborateur.
 *
 * Cette garde est la vraie raison d'etre du hook : elle depend a la fois du collaborateur et
 * du type, et laissee a plat elle etait separee de ses etats par plus de sept cents lignes.
 *
 * Generique sur le type de document : le hook n'a besoin que d'un `id`, et laisse passer la
 * forme exacte de l'appelant jusqu'a `requestableTypes` et `selectedType` — sans quoi il
 * faudrait redeclarer ici une structure qui existe deja ailleurs.
 */
export function useDocumentRequestForm<T extends { id: string }>(
  uploadableTypes: T[],
  /** Types autorises pour ce collaborateur. `null` = aucune restriction. */
  allowedTypeIdsForEmployee: (employeeId: string) => Set<string> | null,
) {
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [documentTypeId, setDocumentTypeId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [periodMonth, setPeriodMonth] = useState("");
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);

  const requestableTypes = useMemo(() => {
    const allowed = allowedTypeIdsForEmployee(employeeId);
    if (!allowed) return uploadableTypes;
    return uploadableTypes.filter((documentType) => allowed.has(documentType.id));
  }, [allowedTypeIdsForEmployee, employeeId, uploadableTypes]);

  const selectedType = useMemo(
    () => uploadableTypes.find((documentType) => documentType.id === documentTypeId) ?? null,
    [documentTypeId, uploadableTypes],
  );

  // Le collaborateur choisi n'autorise plus le type selectionne : on l'efface.
  useEffect(() => {
    if (documentTypeId && !requestableTypes.some((type) => type.id === documentTypeId)) {
      setDocumentTypeId("");
    }
  }, [documentTypeId, requestableTypes]);

  /** Vide les champs sans toucher a l'ouverture du dialogue. */
  const reset = useCallback(() => {
    setEmployeeId("");
    setDocumentTypeId("");
    setDueAt("");
    setPeriodMonth("");
    setNote("");
  }, []);

  /**
   * Ouvre le dialogue sur un collaborateur eventuellement impose (depuis sa fiche).
   * N'efface pas le message de la page : cela reste au workspace, a qui il appartient.
   */
  const openDialog = useCallback((presetEmployeeId?: string) => {
    setEmployeeId(presetEmployeeId ?? "");
    setDocumentTypeId("");
    setDueAt("");
    setPeriodMonth("");
    setNote("");
    setOpen(true);
  }, []);

  // Memoise : les appelants passent cet objet en dependance de leurs propres hooks. Un objet
  // litteral neuf a chaque rendu casserait leur memoisation.
  return useMemo(
    () => ({
      open,
      setOpen,
      employeeId,
      setEmployeeId,
      documentTypeId,
      setDocumentTypeId,
      dueAt,
      setDueAt,
      periodMonth,
      setPeriodMonth,
      note,
      setNote,
      creating,
      setCreating,
      requestableTypes,
      selectedType,
      reset,
      openDialog,
    }),
    [
      creating,
      documentTypeId,
      dueAt,
      employeeId,
      note,
      open,
      openDialog,
      periodMonth,
      requestableTypes,
      reset,
      selectedType,
    ],
  );
}
