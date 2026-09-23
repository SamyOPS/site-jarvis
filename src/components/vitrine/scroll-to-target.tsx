"use client";

import { useEffect } from "react";

// À l'arrivée sur la page, si une cible de défilement a été mémorisée (clic sur
// un lien de section depuis une autre page) ou passée en ancre d'URL, on affiche
// d'abord le haut de la page puis on défile en douceur jusqu'à la section.
// Important : pas de cleanup annulant le timeout (sinon le double montage en dev
// StrictMode annulerait le défilement).
export default function ScrollToTarget() {
  useEffect(() => {
    let target = "";
    try {
      target = sessionStorage.getItem("jc:scrollTarget") || "";
      if (target) sessionStorage.removeItem("jc:scrollTarget");
    } catch {
      /* sessionStorage indisponible : on ignore */
    }

    if (!target && window.location.hash.length > 1) {
      target = window.location.hash;
      window.history.replaceState(null, "", window.location.pathname);
    }

    if (!target) return;

    /*
      `behavior: "instant"` est explicite, et il le faut : cette feuille de
      styles pose `scroll-behavior: smooth` sur <html> pour tout le site. Sans
      cette precision, la remontee en haut de page s'animerait elle aussi, et
      entrerait en concurrence avec le defilement doux vers la cible declenche
      900 ms plus tard — deux animations pour une seule intention.
    */
    window.scrollTo({ top: 0, behavior: "instant" });
    window.setTimeout(() => {
      document.querySelector(target)?.scrollIntoView({ behavior: "smooth" });
    }, 900);
  }, []);

  return null;
}
