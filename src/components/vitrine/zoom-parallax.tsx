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

// Composition de la mosaïque : décalage ET taille de chaque tuile. Ces valeurs
// dessinent l'agencement, elles sont indépendantes du format des images (qui
// sont recadrées en `object-cover`). Index 0 = cadre central, celui qui remplit
// l'écran en fin de zoom.
const OFFSETS = [
  "",
  "[&>div]:!-top-[30vh] [&>div]:!left-[5vw] [&>div]:!h-[30vh] [&>div]:!w-[35vw]",
  "[&>div]:!-top-[10vh] [&>div]:!-left-[25vw] [&>div]:!h-[45vh] [&>div]:!w-[20vw]",
  "[&>div]:!left-[27.5vw] [&>div]:!h-[25vh] [&>div]:!w-[25vw]",
  "[&>div]:!top-[27.5vh] [&>div]:!left-[5vw] [&>div]:!h-[25vh] [&>div]:!w-[20vw]",
  "[&>div]:!top-[27.5vh] [&>div]:!-left-[22.5vw] [&>div]:!h-[25vh] [&>div]:!w-[30vw]",
  "[&>div]:!top-[22.5vh] [&>div]:!left-[25vw] [&>div]:!h-[15vh] [&>div]:!w-[15vw]",
];

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

  const scale4 = useTransform(scrollYProgress, [0, 1], out ? [4, 1] : [1, 4]);
  const scale5 = useTransform(scrollYProgress, [0, 1], out ? [5, 1] : [1, 5]);
  const scale6 = useTransform(scrollYProgress, [0, 1], out ? [6, 1] : [1, 6]);
  const scale8 = useTransform(scrollYProgress, [0, 1], out ? [8, 1] : [1, 8]);
  const scale9 = useTransform(scrollYProgress, [0, 1], out ? [9, 1] : [1, 9]);

  const scales = [scale4, scale5, scale6, scale5, scale6, scale8, scale9];

  const letters = title ? [...title] : [];

  return (
    <div ref={container} className="relative h-[300vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        {images.map(({ src, alt }, index) => {
          const scale = scales[index % scales.length];

          return (
            <motion.div
              key={index}
              style={{ scale }}
              className={`absolute top-0 flex h-full w-full items-center justify-center ${OFFSETS[index] ?? ""}`}
            >
              <div className="relative h-[25vh] w-[25vw]">
                {/* Les tuiles sont agrandies jusqu'à ×9 par le zoom : `sizes`
                    est déclaré à 100vw pour qu'aucune ne soit servie en deçà de
                    la largeur d'écran, même au plus fort de l'agrandissement. */}
                <Image
                  src={src}
                  alt={alt || `Image parallaxe ${index + 1}`}
                  fill
                  sizes="100vw"
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
