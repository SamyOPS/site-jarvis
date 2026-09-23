"use client";

import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useRef } from "react";
import Image from "next/image";

interface Visual {
  src: string;
  alt?: string;
}

interface ZoomParallaxProps {
  /** Tableau d'images affichées dans l'effet parallaxe (7 max) */
  images: Visual[];
  /** Titre révélé lettre par lettre au fil du scroll (optionnel) */
  title?: string;
  /** Petit mot d'accroche, au-dessus à gauche du titre (ex. « nos »). */
  eyebrow?: string;
  /**
   * Sens du zoom :
   *  - `in` (défaut) : la mosaïque grandit jusqu'à ce que l'image centrale
   *    remplisse l'écran (les autres sont repoussées hors cadre) ;
   *  - `out` : l'inverse — on démarre sur l'image centrale en plein écran et le
   *    scroll dézoome jusqu'à révéler la mosaïque complète.
   */
  direction?: "in" | "out";
}

// Une lettre qui monte depuis sa ligne (comme les textes du menu), mais pilotée
// par la progression du scroll plutôt que par le temps.
function RevealLetter({
  char,
  progress,
  start,
  end,
}: {
  char: string;
  progress: MotionValue<number>;
  start: number;
  end: number;
}) {
  const y = useTransform(progress, [start, end], ["120%", "0%"]);
  return (
    <span aria-hidden className="reveal-mask">
      <motion.span className="inline-block" style={{ y }}>
        {char}
      </motion.span>
    </span>
  );
}

type Tile = {
  /** Décalage du centre de la tuile par rapport au centre de l'écran, en vh / vw. */
  top: number;
  left: number;
  /** Taille de la tuile au repos, en vh / vw. */
  height: number;
  width: number;
  /** Échelle atteinte en fin de zoom. */
  peakScale: number;
};

// Composition de la mosaïque : décalage, taille ET échelle de chaque tuile. Ces
// valeurs dessinent l'agencement, elles sont indépendantes du format des images
// (qui sont recadrées en `object-cover`). Index 0 = cadre central, celui qui
// remplit l'écran en fin de zoom.
//
// Des NOMBRES et non des classes Tailwind : cette géométrie sert DEUX fois — à
// poser la tuile, et à calculer le `sizes` de son image (cf. `maxVisibleWidthVw`).
// Tailwind ne générant pas de classe depuis une valeur d'exécution, elle passe
// par `style`, ce qui supprime au passage les surcharges `!important` visant un
// sélecteur enfant.
const TILES: Tile[] = [
  { top: 0, left: 0, height: 25, width: 25, peakScale: 4 },
  { top: -30, left: 5, height: 30, width: 35, peakScale: 5 },
  { top: -10, left: -25, height: 45, width: 20, peakScale: 6 },
  { top: 0, left: 27.5, height: 25, width: 25, peakScale: 5 },
  { top: 27.5, left: 5, height: 25, width: 20, peakScale: 6 },
  { top: 27.5, left: -22.5, height: 25, width: 30, peakScale: 8 },
  { top: 22.5, left: 25, height: 15, width: 15, peakScale: 9 },
];

/**
 * Échelle à laquelle une tuile sort du cadre, sur un axe.
 *
 * Le zoom agrandit les tuiles mais ÉCARTE aussi leurs centres : à l'échelle `s`, la
 * tuile occupe `[s·(c − d/2), s·(c + d/2)]` quand l'écran occupe `[−50, +50]`. Elle
 * reste donc visible tant que son bord le plus proche du centre n'a pas franchi le
 * bord de l'écran. Une tuile qui chevauche le centre, elle, ne sort jamais.
 */
function exitScale(center: number, size: number) {
  const innerEdge = Math.abs(center) - size / 2;
  return innerEdge > 0 ? 50 / innerEdge : Number.POSITIVE_INFINITY;
}

/**
 * Largeur maximale, en vw, à laquelle la tuile est RÉELLEMENT affichée à l'écran.
 *
 * C'est ce que `sizes` doit porter. Cet attribut décide quelle variante du `srcset`
 * le navigateur télécharge, UNE SEULE FOIS au chargement : il ne reviendra jamais sur
 * son choix quand le zoom aura grandi la tuile. Décrire la taille au repos servirait
 * donc une image trop pauvre pour tout le reste de l'animation.
 *
 * Deux bornes se combinent :
 *   - la SORTIE D'ÉCRAN — hormis la tuile centrale, toutes quittent le cadre bien
 *     avant leur échelle maximale ; les dimensionner sur ce pic ferait télécharger
 *     des pixels que personne ne voit jamais ;
 *   - la LARGEUR DU VIEWPORT — au-delà, la tuile déborde de l'écran, et affiner ce
 *     débordement n'apporte rien pendant un zoom aussi rapide, pour des sources qui
 *     passeraient alors de 1920 à 3840 px.
 */
function maxVisibleWidthVw(tile: Tile) {
  const visibleScale = Math.min(
    tile.peakScale,
    exitScale(tile.left, tile.width),
    exitScale(tile.top, tile.height),
  );
  return Math.min(100, Math.ceil(tile.width * visibleScale));
}

/** Échelle d'une tuile : 1 → son pic au fil du scroll, ou l'inverse en mode `out`. */
function useTileScale(progress: MotionValue<number>, peak: number, out: boolean) {
  return useTransform(progress, [0, 1], out ? [peak, 1] : [1, peak]);
}

export function ZoomParallax({
  images,
  title,
  eyebrow,
  direction = "in",
}: ZoomParallaxProps) {
  const container = useRef(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start start", "end end"],
  });
  // En mode `out`, les mêmes échelles sont simplement parcourues à l'envers :
  // on part de l'agrandissement maximal pour revenir à la mosaïque (scale 1).
  const out = direction === "out";

  // Petit mot au-dessus du titre : monte depuis sa ligne (effet « volet »,
  // comme le titre) juste avant que les lettres du titre se dévoilent.
  const eyebrowY = useTransform(scrollYProgress, [0.45, 0.6], ["120%", "0%"]);

  // Une valeur animée par tuile, tirée de `TILES[i].peakScale`. Sept déclarations
  // explicites plutôt qu'une boucle : un hook ne se déclare pas dans un `map`. Les
  // échelles ne vivent plus dans un second tableau, qui pouvait se désaligner de la
  // géométrie qu'il accompagne.
  const scale0 = useTileScale(scrollYProgress, TILES[0].peakScale, out);
  const scale1 = useTileScale(scrollYProgress, TILES[1].peakScale, out);
  const scale2 = useTileScale(scrollYProgress, TILES[2].peakScale, out);
  const scale3 = useTileScale(scrollYProgress, TILES[3].peakScale, out);
  const scale4 = useTileScale(scrollYProgress, TILES[4].peakScale, out);
  const scale5 = useTileScale(scrollYProgress, TILES[5].peakScale, out);
  const scale6 = useTileScale(scrollYProgress, TILES[6].peakScale, out);

  const scales = [scale0, scale1, scale2, scale3, scale4, scale5, scale6];

  const letters = title ? [...title] : [];

  return (
    <div ref={container} className="relative h-[300vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        {images.map(({ src, alt }, index) => {
          const tile = TILES[index % TILES.length];
          const scale = scales[index % scales.length];

          return (
            <motion.div
              key={index}
              style={{ scale }}
              className="absolute top-0 flex h-full w-full items-center justify-center"
            >
              <div
                className="relative"
                style={{
                  top: `${tile.top}vh`,
                  left: `${tile.left}vw`,
                  height: `${tile.height}vh`,
                  width: `${tile.width}vw`,
                }}
              >
                {/* `sizes` décrit la taille ANIMÉE, pas celle au repos : le
                    navigateur choisit sa variante au chargement et n'y revient
                    jamais. Next, lui, mesure la tuile à cet instant précis — donc
                    avant que le zoom l'ait agrandie — et peut avertir que `sizes`
                    est trop généreux. C'est un faux positif : la tuile atteint
                    bien cette largeur, un peu plus tard. */}
                <Image
                  src={src}
                  alt={alt || `Image parallaxe ${index + 1}`}
                  fill
                  sizes={`${maxVisibleWidthVw(tile)}vw`}
                  className="object-cover"
                />
              </div>
            </motion.div>
          );
        })}

        {/* Titre révélé progressivement pendant le zoom (transition vers la
            section expertises) */}
        {title && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4">
            <div className="flex flex-col items-start">
              {eyebrow && (
                <span
                  aria-hidden
                  className="reveal-mask mb-1 ml-[0.1em] px-[0.12em] font-quote text-[clamp(1.5rem,4.5vw,3.25rem)] italic leading-none text-white"
                >
                  <motion.span className="inline-block" style={{ y: eyebrowY }}>
                    {eyebrow}
                  </motion.span>
                </span>
              )}
              <h2 className="font-sans text-[clamp(2.5rem,12vw,11rem)] font-bold uppercase leading-none tracking-tight text-white">
                <span aria-label={`${eyebrow ? eyebrow + " " : ""}${title}`}>
                  {letters.map((char, i) => {
                    const start = 0.55 + (i / letters.length) * 0.3;
                    const end = start + 0.15;
                    return (
                      <RevealLetter
                        key={i}
                        char={char}
                        progress={scrollYProgress}
                        start={start}
                        end={end}
                      />
                    );
                  })}
                </span>
              </h2>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
