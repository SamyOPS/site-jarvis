"use client";

import { useMotionValue, type MotionValue } from "motion/react";
import { useEffect, type RefObject } from "react";

/**
 * Progression du defilement a travers une section, de 0 a 1 — ce que rendait
 * `useScroll({ target, offset })` de motion, sans son cout.
 *
 * `useScroll` remesure sa cible A CHAQUE IMAGE de defilement : il remonte la chaine des
 * `offsetTop` et relit `scrollHeight` / `clientHeight`. Or chaque instance ecrit ensuite
 * des styles, et la lecture de l'instance suivante force le navigateur a recalculer la
 * mise en page sur-le-champ. Cinq sections ainsi suivies, plus la jauge de la page :
 * jusqu'a six mises en page completes par image. C'etait le premier poste JavaScript de
 * /decouvrir, y compris en production.
 *
 * Ici, la position des sections ne change qu'avec la mise en page : on la mesure au
 * montage, puis seulement quand la fenetre ou le document changent de taille. A chaque
 * image, un seul ecouteur lit `window.scrollY` — lecture qui ne force rien — et en deduit
 * la progression de toutes les sections d'un coup. Toutes les lectures precedent donc
 * toutes les ecritures.
 *
 * Les positions sont prises par `offsetTop` et non `getBoundingClientRect` : elles
 * ignorent les transformations, notamment le glissement de `PageTransition`, encore en
 * place quand la page d'arrivee monte ses sections.
 */

/**
 * Plage suivie :
 *  - `pinned`   — ["start start", "end end"] : de l'arrivee du haut de la section en haut
 *    de l'ecran a l'arrivee de son bas en bas de l'ecran. Le cas des sections epinglees.
 *  - `crossing` — ["start end", "end start"] : de l'entree de la section par le bas a sa
 *    sortie par le haut.
 *  - `page`     — le document entier.
 */
type Range = "pinned" | "crossing" | "page";

type Entry = {
  ref: RefObject<HTMLElement | null> | null;
  range: Range;
  value: MotionValue<number>;
  start: number;
  end: number;
};

const entries = new Set<Entry>();
let teardown: (() => void) | null = null;

function documentTop(el: HTMLElement) {
  let top = 0;
  let node: HTMLElement | null = el;
  while (node) {
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return top;
}

function measure(entry: Entry) {
  const viewport = window.innerHeight;
  if (entry.range === "page") {
    entry.start = 0;
    entry.end = document.documentElement.scrollHeight - viewport;
    return;
  }
  const el = entry.ref?.current;
  if (!el) return;
  const top = documentTop(el);
  const height = el.offsetHeight;
  if (entry.range === "pinned") {
    entry.start = top;
    entry.end = top + height - viewport;
  } else {
    entry.start = top - viewport;
    entry.end = top + height;
  }
}

/*
 * Appele directement depuis l'evenement `scroll`, et non reporte a une image suivante :
 * le navigateur distribue `scroll` juste avant les rappels d'animation, et motion peint
 * les valeurs modifiees dans ces memes rappels. La progression arrive donc a l'ecran dans
 * l'image meme ou le defilement a eu lieu.
 */
function update() {
  const y = window.scrollY;
  for (const entry of entries) {
    const length = entry.end - entry.start;
    const progress =
      length > 0 ? Math.min(1, Math.max(0, (y - entry.start) / length)) : 0;
    // Hors de sa plage, une section reste bloquee a 0 ou 1 : rien a ecrire, rien a peindre.
    if (entry.value.get() !== progress) entry.value.set(progress);
  }
}

function remeasure() {
  entries.forEach(measure);
  update();
}

function listen() {
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", remeasure);
  // Une section qui change de hauteur deplace toutes celles qui la suivent : la hauteur
  // du document est le signal commun.
  const observer = new ResizeObserver(remeasure);
  observer.observe(document.documentElement);
  return () => {
    window.removeEventListener("scroll", update);
    window.removeEventListener("resize", remeasure);
    observer.disconnect();
  };
}

function useProgress(
  ref: RefObject<HTMLElement | null> | null,
  range: Range,
): MotionValue<number> {
  const value = useMotionValue(0);

  useEffect(() => {
    const entry: Entry = { ref, range, value, start: 0, end: 0 };
    entries.add(entry);
    teardown ??= listen();
    measure(entry);
    update();
    return () => {
      entries.delete(entry);
      if (entries.size === 0) {
        teardown?.();
        teardown = null;
      }
    };
  }, [ref, range, value]);

  return value;
}

/** Progression a travers une section (voir `Range`). */
export function useSectionProgress(
  ref: RefObject<HTMLElement | null>,
  range: Exclude<Range, "page">,
) {
  return useProgress(ref, range);
}

/** Progression a travers le document entier. */
export function usePageProgress() {
  return useProgress(null, "page");
}
