"use client";

import { useEffect, useRef } from "react";

type UseDismissableOptions = {
  /**
   * Arrete la propagation de la touche Echap. Desactive par defaut : sinon, ouvrir ce
   * calque a l'interieur d'un `Dialog` Radix empeche Echap de fermer le dialogue parent.
   * A n'activer que sur un calque qui doit reellement confisquer la touche.
   */
  stopPropagationOnEscape?: boolean;
};

/**
 * Ferme un calque flottant au clic exterieur et a la touche Echap, et rend la ref a
 * poser sur le conteneur du calque.
 *
 * Ecoute sur `window` et laisse Echap se propager : c'est le comportement des sept
 * implementations manuelles que ce hook remplace. La variante `document` +
 * `stopPropagation` qui vivait dans le chantier console n'a pas ete retenue, elle aurait
 * modifie le comportement des menus ouverts dans un dialogue.
 *
 * `onClose` est lu au travers d'une ref : l'effet ne depend donc que de `open`, et un
 * appelant qui passe une lambda en ligne ne provoque pas un reabonnement a chaque rendu.
 */
export function useDismissable<T extends HTMLElement>(
  open: boolean,
  onClose: () => void,
  options?: UseDismissableOptions,
) {
  const containerRef = useRef<T | null>(null);
  const onCloseRef = useRef(onClose);
  const stopPropagationOnEscape = options?.stopPropagationOnEscape ?? false;

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        onCloseRef.current();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (stopPropagationOnEscape) {
        event.stopPropagation();
      }
      onCloseRef.current();
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, stopPropagationOnEscape]);

  return containerRef;
}
