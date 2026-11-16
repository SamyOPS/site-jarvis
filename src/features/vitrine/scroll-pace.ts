/**
 * Allure des sections epinglees de la vitrine (zoom des expertises, galerie, formations,
 * mosaique des offres).
 *
 * Chacune convertit le defilement en une progression de 0 a 1 sur sa course epinglee
 * (`useSectionProgress(…, "pinned")`) : raccourcir la course rejoue la meme choregraphie,
 * a l'identique, en moins de coups de molette. Un seul reglage pour toutes, pour que la
 * page garde un rythme egal d'une section a l'autre.
 *
 * Les courses de reference sont celles d'origine (zoom 200vh, galerie 300vh, formations
 * 330vh) : /decouvrir faisait ainsi traverser ~14 hauteurs d'ecran de sections animees.
 * A 0.6, chaque animation avance 1,7 fois plus vite sous la molette.
 */
export const SCROLL_PACE = 0.6;

/** Course de defilement reelle (vh) d'une section dont la course de reference etait `designScrollVh`. */
export const pinnedScrollVh = (designScrollVh: number) => designScrollVh * SCROLL_PACE;

/** Hauteur totale (vh) d'une section epinglee : l'ecran qu'elle occupe, plus sa course. */
export const pinnedSectionVh = (designScrollVh: number) => 100 + pinnedScrollVh(designScrollVh);

/*
 * Course du zoom parallaxe (200vh a l'allure d'origine).
 *
 * Declaree ICI et non dans zoom-parallax.tsx : la page /decouvrir, composant serveur, s'en
 * sert pour poser l'ancre « Expertises » a la fin du zoom. Importee d'un module
 * `"use client"`, elle lui arriverait comme une reference client, et non comme un nombre.
 */
export const ZOOM_SCROLL_VH = pinnedScrollVh(200);
