"use client";

import { useEffect } from "react";

/**
 * Active les regles de la vitrine sur <html>.
 *
 * Pose sur <html> et non sur le shell : ce que le scope commande vit au-dessus
 * de l'arbre React — la barre de defilement du document, que la vitrine masque
 * au profit de sa propre jauge (voir `scroll-progress.tsx`).
 *
 * Le script inline du layout racine (CONSOLE_BOOTSTRAP_SCRIPT) pose deja
 * l'attribut au premier rendu pour eviter le flash. Ce composant couvre le cas
 * de la navigation cote client depuis une page hors vitrine (offres, console),
 * et retire l'attribut en sortie pour que la barre native y revienne.
 */
export function VitrineScope() {
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.getAttribute("data-site");
    root.setAttribute("data-site", "vitrine");

    return () => {
      if (previous === null) {
        root.removeAttribute("data-site");
      } else {
        root.setAttribute("data-site", previous);
      }
    };
  }, []);

  return null;
}
