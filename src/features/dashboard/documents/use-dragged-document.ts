"use client";

import { useCallback, useEffect, useState } from "react";
import type { DragEvent } from "react";

/**
 * Suit le document en cours de glisser-deposer.
 *
 * Le navigateur ne rend pas les donnees du `dataTransfer` lisibles pendant le survol :
 * on retient donc l'identifiant dans un etat, et on ne relit le `dataTransfer` qu'au
 * depot, en repli — d'ou les deux formats interroges dans l'ordre.
 *
 * Etait recopie a l'identique dans les deux sections documentaires, effet de nettoyage
 * compris : sans lui, un glisser abandonne laisse la liste en etat « en cours de
 * deplacement » jusqu'au prochain rendu.
 */
export function useDraggedDocument<TDoc>(documentsById: Map<string, TDoc>) {
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const getDraggedDocument = useCallback(
    (event: DragEvent<HTMLElement>) => {
      const id =
        draggedId ??
        event.dataTransfer.getData("text/x-dashboard-item-id") ??
        event.dataTransfer.getData("text/plain");
      if (!id) return null;
      return documentsById.get(id) ?? null;
    },
    [documentsById, draggedId],
  );

  useEffect(() => {
    if (!draggedId) return;
    const clearDraggedItem = () => setDraggedId(null);
    window.addEventListener("dragend", clearDraggedItem);
    window.addEventListener("drop", clearDraggedItem);
    return () => {
      window.removeEventListener("dragend", clearDraggedItem);
      window.removeEventListener("drop", clearDraggedItem);
    };
  }, [draggedId]);

  return { draggedId, setDraggedId, getDraggedDocument };
}
