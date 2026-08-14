"use client";

import { useEffect } from "react";

/**
 * Active les tokens de la console sur <body>.
 *
 * Le scope est pose sur <body> et non sur le shell : les portails Radix
 * (Dialog, Select, cmdk) sont montes en enfants directs de <body> et
 * sortiraient donc du scope s'il vivait plus bas dans l'arbre.
 *
 * Le script inline du layout racine (CONSOLE_BOOTSTRAP_SCRIPT) pose deja
 * l'attribut au premier rendu pour eviter le flash. Ce composant couvre le
 * cas de la navigation cote client depuis une page vitrine, et retire
 * l'attribut en sortie pour ne pas repeindre le site public.
 */
export function ConsoleScope() {
  useEffect(() => {
    const { body } = document;
    const previous = body.getAttribute("data-app");
    body.setAttribute("data-app", "console");

    return () => {
      if (previous === null) {
        body.removeAttribute("data-app");
      } else {
        body.setAttribute("data-app", previous);
      }
    };
  }, []);

  return null;
}
