"use client";

import { useEffect, useRef } from "react";

/**
 * Ferme un calque flottant au clic exterieur et a la touche Echap.
 *
 * Reprend le comportement deja en place dans column-visibility-menu.tsx et
 * document-filters-bar.tsx, factorise pour que tous les menus de la console
 * se comportent de la meme facon.
 */
export function useDismissable<T extends HTMLElement>(
  open: boolean,
  onClose: () => void,
) {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  return containerRef;
}
