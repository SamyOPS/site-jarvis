"use client";

import { useEffect, useState } from "react";

/**
 * Une section sombre (`data-nav-dark`) recouvre-t-elle une ligne donnee de l'ecran ?
 *
 * La barre de navigation et la barre de progression posent toutes deux cette question, a
 * deux hauteurs differentes. Elles y repondaient chacune de leur cote, A CHAQUE FRAME DE
 * DEFILEMENT, par un `querySelectorAll` suivi d'un `getBoundingClientRect` sur chaque
 * section. Or lire une position FORCE le navigateur a recalculer la mise en page seance
 * tenante : deux calculs complets par image, sur un document qui fait plusieurs milliers
 * de pixels de haut. C'est exactement ce qui hache un defilement.
 *
 * `IntersectionObserver` repond a la meme question sans rien demander au fil principal :
 * le navigateur suit les croisements lui-meme et ne nous reveille QUE lorsque l'etat
 * change. Entre deux croisements, le defilement ne coute plus rien.
 *
 * L'astuce tient dans `rootMargin` : des marges negatives rabotent la zone d'observation
 * au-dessus et en dessous jusqu'a n'en laisser qu'une bande d'un pixel, posee sur la ligne
 * a surveiller. « Croiser cette bande » et « recouvrir cette ligne » deviennent la meme
 * chose.
 */
export function useDarkSectionAt(
  /** Hauteur surveillee : en pixels depuis le haut, ou le milieu de l'ecran. */
  line: number | "center",
  /** Change de valeur pour re-observer — typiquement le chemin de la page. */
  resetKey: string,
) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    let observer: IntersectionObserver | null = null;
    const crossing = new Set<Element>();

    const observe = () => {
      observer?.disconnect();
      crossing.clear();

      const sections = document.querySelectorAll("[data-nav-dark]");
      if (!sections.length) {
        setDark(false);
        return;
      }

      const top = line === "center" ? Math.round(window.innerHeight / 2) : line;
      // La bande fait un pixel : ce qui reste du viewport une fois les deux marges retirees.
      const bottom = Math.max(0, window.innerHeight - top - 1);

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) crossing.add(entry.target);
            else crossing.delete(entry.target);
          }
          setDark(crossing.size > 0);
        },
        { rootMargin: `-${top}px 0px -${bottom}px 0px`, threshold: 0 },
      );

      sections.forEach((section) => observer?.observe(section));
    };

    observe();

    /*
     * Second passage a la frame suivante : l'ancien code interrogeait le DOM en continu,
     * il rattrapait donc au vol une section montee apres coup. On ne balaie plus qu'a
     * l'observation — ce rappel unique couvre le cas, sans revenir a une boucle.
     */
    const raf = window.requestAnimationFrame(observe);

    // La bande est exprimee en pixels : elle doit etre reposee si la fenetre change de taille.
    window.addEventListener("resize", observe);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", observe);
      observer?.disconnect();
    };
  }, [line, resetKey]);

  return dark;
}

/**
 * La page est-elle assez haute pour defiler ?
 *
 * Meme probleme que ci-dessus : la reponse se lisait dans `document.scrollHeight` a chaque
 * frame, et cette propriete est l'une des plus couteuses a lire — elle peut forcer la mise
 * en page du document entier. Elle ne change pourtant qu'aux changements de taille, que
 * `ResizeObserver` signale sans rien couter au defilement.
 */
export function usePageScrolls(resetKey: string, minimum = 40) {
  const [scrolls, setScrolls] = useState(false);

  useEffect(() => {
    const doc = document.documentElement;
    const measure = () => setScrolls(doc.scrollHeight - window.innerHeight > minimum);

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(doc);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [resetKey, minimum]);

  return scrolls;
}
