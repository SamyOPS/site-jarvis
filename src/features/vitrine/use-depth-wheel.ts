import { useEffect, type RefObject } from "react";

/*
  Roue de liens « en profondeur » du panneau de menu.

  La liste defile dans son propre conteneur. L'entree au centre est nette et a pleine
  taille ; en s'eloignant du centre, chacune s'ecrase verticalement comme vue sur un
  tambour qui tourne, retrecit et s'estompe. Le conteneur aimante une entree au centre
  (`snap-center`), d'ou l'effet de selecteur.

  Pas de `perspective()` + `rotateX()` : la perspective elargit un bord de l'entree
  plus que l'autre, et les dernieres lettres d'un mot long penchaient comme en italique
  (encore ~3° a 1800 px d'oeil). L'ecrasement vertical seul — ce que montre une rotation
  vue de loin, hauteur multipliee par le cosinus de l'angle — garde la profondeur sans
  deformer le texte, et la transformation reste en 2D.

  Les styles sont ecrits directement sur les elements, dans une image d'animation par
  evenement de defilement au plus : aucun rendu React pendant le geste.

  Les positions sont lues par `offsetTop`, insensible aux transformations — sinon chaque
  bascule deplacerait les mesures de la suivante — et seulement au redimensionnement :
  pendant le defilement, seule `scrollTop` est relue.
*/

/** Angle de bascule a pleine profondeur : la hauteur y est multipliee par cos(50°) ≈ 0,64. */
const MAX_TILT_DEG = 50;
const MIN_SCALE = 0.7;
const MIN_OPACITY = 0.15;
/*
  Profondeur maximale atteinte a ce nombre d'entrees du centre. Mesuree en entrees et non
  en hauteur d'ecran : sur un grand ecran, les voisines du centre ne changeaient presque
  pas, la roue paraissait plate.
*/
const DEPTH_RADIUS_ITEMS = 3;

/** Attribut a poser sur chaque entree de la roue (`data-depth-wheel-item=""`). */
const DEPTH_WHEEL_ITEM = "data-depth-wheel-item";

export function useDepthWheel(
  containerRef: RefObject<HTMLElement | null>,
  open: boolean,
  /** Entree centree a l'ouverture. */
  initialIndex: number,
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !open) return;

    const items = Array.from(container.querySelectorAll<HTMLElement>(`[${DEPTH_WHEEL_ITEM}]`));
    if (!items.length) return;

    // Mouvement reduit : la profondeur ne passe plus que par l'opacite.
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let centers: number[] = [];
    let widths: number[] = [];
    let half = 1;
    let radius = 1;
    const measure = () => {
      centers = items.map((item) => item.offsetTop + item.offsetHeight / 2);
      widths = items.map((item) => item.offsetWidth);
      half = Math.max(1, container.clientHeight / 2);
      const step = items.length > 1 ? centers[1] - centers[0] : items[0].offsetHeight;
      radius = Math.max(1, Math.min(half, step * DEPTH_RADIUS_ITEMS));
    };

    let frame = 0;
    const paint = () => {
      frame = 0;
      const viewCenter = container.scrollTop + half;
      items.forEach((item, index) => {
        // -1 au-dessus du centre (a pleine profondeur), 0 au centre, 1 en dessous.
        const offset = Math.max(-1, Math.min(1, (centers[index] - viewCenter) / radius));
        const depth = Math.abs(offset);
        item.style.opacity = (1 - depth * (1 - MIN_OPACITY)).toFixed(3);
        if (reduceMotion) return;
        /*
          Reduction autour du CENTRE de l'entree (l'ecrasement vertical reste ainsi
          symetrique), puis `translateX` ramene le bord gauche sur la colonne, comme si la
          reduction partait de la gauche.
        */
        const scale = 1 - depth * (1 - MIN_SCALE);
        const squash = Math.cos((depth * MAX_TILT_DEG * Math.PI) / 180);
        const shift = (-(1 - scale) * widths[index]) / 2;
        item.style.transform = `translateX(${shift.toFixed(1)}px) scale(${scale.toFixed(3)}, ${(
          scale * squash
        ).toFixed(3)})`;
      });
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(paint);
    };

    measure();
    const start = Math.max(0, Math.min(items.length - 1, initialIndex));
    container.scrollTop = centers[start] - half;
    paint();

    items.forEach((item) => {
      item.style.willChange = reduceMotion ? "opacity" : "transform, opacity";
    });

    // Fenetre redimensionnee, police chargee apres coup : on remesure.
    const resize = new ResizeObserver(() => {
      measure();
      schedule();
    });
    resize.observe(container);
    if (container.firstElementChild) resize.observe(container.firstElementChild);
    container.addEventListener("scroll", schedule, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      resize.disconnect();
      container.removeEventListener("scroll", schedule);
      items.forEach((item) => {
        item.style.willChange = "";
      });
    };
  }, [containerRef, open, initialIndex]);
}
