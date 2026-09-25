"use client";

import {
  motion,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import Image from "next/image";

import { useSectionProgress } from "@/features/vitrine/use-section-progress";
import { useVitrineExit } from "@/features/vitrine/use-vitrine-exit";

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
  /**
   * Lien affiche sous le titre, qui s'efface avec lui.
   *
   * Pense pour les destinations hors vitrine (`/offres`) : la sortie passe donc par
   * `useVitrineExit`, sans quoi le voile noir sauterait au demontage du PageTransition.
   */
  cta?: { label: string; href: string };
}

// Une lettre qui monte depuis sa ligne (comme les textes du menu), mais pilotée
// par la progression du scroll plutôt que par le temps.
function RevealLetter({
  char,
  progress,
  start,
  end,
  exiting = false,
}: {
  char: string;
  progress: MotionValue<number>;
  start: number;
  end: number;
  /** Vrai : la lettre part vers le bas au lieu d'en monter. */
  exiting?: boolean;
}) {
  const y = useTransform(
    progress,
    [start, end],
    exiting ? ["0%", "120%"] : ["120%", "0%"],
  );
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
 * Échelle la plus forte à laquelle la tuile est encore visible : son pic, ou plus tôt
 * l'échelle à laquelle elle quitte le cadre.
 */
function visibleScale(tile: Tile) {
  return Math.min(
    tile.peakScale,
    exitScale(tile.left, tile.width),
    exitScale(tile.top, tile.height),
  );
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
  return Math.min(100, Math.ceil(tile.width * visibleScale(tile)));
}

/**
 * Valeur de `sizes` envoyee au navigateur pour une tuile.
 *
 * Elle reste celle de `maxVisibleWidthVw`. Quand elle vaut PILE 100vw — le cas des
 * tuiles qui finissent par remplir l'ecran — elle est ecrite sous forme de condition
 * toujours vraie : `(min-width: 0px) 100vw`. C'est STRICTEMENT la meme consigne, et le
 * navigateur telecharge exactement la meme variante.
 *
 * Le detour ne sert qu'a taire un avertissement de developpement de `next/image`, qui
 * ne se declenche que sur la chaine exacte "100vw". Il mesure la tuile AU CHARGEMENT,
 * donc avant que le zoom l'ait agrandie, et conclut a tort que `sizes` est trop
 * genereux.
 *
 * C'est un CONTOURNEMENT, pas une correction : la valeur etait deja juste. Il se
 * justifie parce que trois tuiles le declenchaient a chaque rechargement — assez de
 * bruit pour qu'un vrai avertissement, celui du conteneur de defilement statique, y
 * soit passe inapercu deux tours durant.
 */
function tileSizes(tile: Tile) {
  const vw = maxVisibleWidthVw(tile);
  return vw === 100 ? "(min-width: 0px) 100vw" : `${vw}vw`;
}

/**
 * Une tuile de la mosaïque.
 *
 * Elle est posée à la taille qu'elle atteint au plus fort de sa visibilité
 * (`visibleScale`), puis RÉDUITE par `scale` — jamais agrandie tant qu'elle est à
 * l'écran. C'est ce qui rend le zoom supportable :
 *
 *  - agrandir une couche au fil du scroll force Chrome à la re-rastériser à chaque
 *    changement d'échelle, donc à chaque image — sept photos rééchantillonnées jusqu'à
 *    ×9, deux fois par page : c'était le gel au passage des mosaïques ;
 *  - posée grande et marquée `will-change: transform`, la couche est rastérisée UNE
 *    fois, à sa taille de mise en page, et le GPU ne fait plus que la réduire. Réduire
 *    ne coûte rien et reste net.
 *
 * La mise en page s'arrête à l'échelle de sortie, pas au pic : au-delà, la tuile est
 * hors cadre, et la rastériser à ×8 coûterait des centaines de Mo de mémoire graphique
 * pour des pixels que personne ne voit.
 *
 * Le rendu est identique à l'ancien : décalages et tailles sont multipliés par
 * `layout`, l'échelle divisée d'autant, autour du même centre.
 */
function ZoomTile({
  src,
  alt,
  tile,
  progress,
  out,
}: {
  src: string;
  alt: string;
  tile: Tile;
  progress: MotionValue<number>;
  out: boolean;
}) {
  const layout = visibleScale(tile);
  // 1 → pic au fil du scroll (ou l'inverse en mode `out`), ramené au repère de la
  // tuile posée grande : l'échelle vaut 1 quand la tuile atteint sa taille de pose.
  const scale = useTransform(
    progress,
    [0, 1],
    out
      ? [tile.peakScale / layout, 1 / layout]
      : [1 / layout, tile.peakScale / layout],
  );
  /*
    Pas de `visibility: hidden` une fois la tuile sortie du cadre, bien que ce soit
    tentant : hors ecran, une couche n'est de toute facon ni rasterisee ni composee. Et en
    mode `out`, ou les tuiles ENTRENT dans le cadre, la masquer jusqu'au dernier instant
    empechait Chrome de la preparer en avance — elle surgissait avec une image de retard.
  */
  return (
    <motion.div
      style={{ scale, willChange: "transform" }}
      className="absolute top-0 flex h-full w-full items-center justify-center"
    >
      {/* `shrink-0` : posee grande, une tuile peut depasser la largeur de l'ecran
          (35vw × 3,33 pour celle du haut). Enfant d'un conteneur flex, elle y serait
          sinon retrecie a 100vw — et recadree autrement qu'a l'origine. */}
      <div
        className="relative shrink-0"
        style={{
          top: `${tile.top * layout}vh`,
          left: `${tile.left * layout}vw`,
          height: `${tile.height * layout}vh`,
          width: `${tile.width * layout}vw`,
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
          alt={alt}
          fill
          sizes={tileSizes(tile)}
          className="object-cover"
        />
      </div>
    </motion.div>
  );
}

export function ZoomParallax({
  images,
  title,
  eyebrow,
  direction = "in",
  cta,
}: ZoomParallaxProps) {
  const exitVitrine = useVitrineExit();
  const container = useRef<HTMLDivElement>(null);
  const scrollYProgress = useSectionProgress(container, "pinned");
  // En mode `out`, les mêmes échelles sont simplement parcourues à l'envers :
  // on part de l'agrandissement maximal pour revenir à la mosaïque (scale 1).
  const out = direction === "out";

  // Petit mot au-dessus du titre : monte depuis sa ligne (effet « volet »,
  // comme le titre) juste avant que les lettres du titre se dévoilent.
  /*
    Sens du titre. En mode `in`, le zoom AMENE la section suivante : le titre monte et
    reste. En mode `out`, on part d'une image plein ecran que le scroll dezoome — le titre
    est donc la des le depart et s'en va, sans quoi il apparaitrait sur la mosaique.
  */
  const titleExits = out;
  const eyebrowY = useTransform(
    scrollYProgress,
    titleExits ? [0.05, 0.22] : [0.45, 0.6],
    titleExits ? ["0%", "120%"] : ["120%", "0%"],
  );
  /*
    L'appel a l'action s'efface un peu apres les lettres. `pointerEvents` suit l'opacite :
    un lien devenu invisible ne doit plus intercepter le clic, sinon il capture des clics
    sur la mosaique qui a pris sa place.
  */
  const ctaOpacity = useTransform(scrollYProgress, [0.28, 0.44], [1, 0]);
  const ctaPointer = useTransform(ctaOpacity, (v) => (v < 0.05 ? "none" : "auto"));

  const letters = title ? [...title] : [];

  return (
    <div ref={container} className="relative h-[300vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        {images.map(({ src, alt }, index) => (
          <ZoomTile
            key={index}
            src={src}
            alt={alt || `Image parallaxe ${index + 1}`}
            tile={TILES[index % TILES.length]}
            progress={scrollYProgress}
            out={out}
          />
        ))}

        {/* Titre révélé progressivement pendant le zoom (transition vers la
            section expertises) */}
        {title && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4">
            <div className="flex flex-col items-start">
              {eyebrow && (
                <span
                  aria-hidden
                  className="reveal-mask mb-1 ml-[0.1em] px-[0.12em] font-quote text-[clamp(1.1rem,3.5vw,2.5rem)] italic leading-none text-white"
                >
                  <motion.span className="inline-block" style={{ y: eyebrowY }}>
                    {eyebrow}
                  </motion.span>
                </span>
              )}
              {/*
                Memes tailles que le titre des formations : le triptyque n'a de sens que si
                ses trois registres se retrouvent d'une section a l'autre. Ce reglage vaut
                donc AUSSI pour « nos Expertises », qui partage ce composant.
              */}
              <h2 className="font-sans text-[clamp(2.5rem,9vw,8rem)] font-bold uppercase leading-[0.95] tracking-tight text-white">
                <span aria-label={`${eyebrow ? eyebrow + " " : ""}${title}`}>
                  {letters.map((char, i) => {
                    /*
                      L'espace ne peut pas traverser `reveal-mask` : cette classe est en
                      `inline-block` avec `overflow: hidden`, ou un blanc se reduit a rien —
                      « Offres d'emploi » s'afficherait « Offresd'emploi ». On le rend donc
                      comme une chasse explicite, hors du masque. Le titre « Expertises »,
                      sans espace, n'est pas concerne.
                    */
                    if (char === " ") {
                      return (
                        <span key={i} aria-hidden className="inline-block w-[0.24em]" />
                      );
                    }
                    // Sortie : plus tot et plus serree, pour degager la mosaique.
                    const start = titleExits
                      ? 0.1 + (i / letters.length) * 0.22
                      : 0.55 + (i / letters.length) * 0.3;
                    const end = start + (titleExits ? 0.12 : 0.15);
                    return (
                      <RevealLetter
                        key={i}
                        char={char}
                        progress={scrollYProgress}
                        start={start}
                        end={end}
                        exiting={titleExits}
                      />
                    );
                  })}
                </span>
              </h2>

              {/*
                Troisieme ligne du titre, alignee a DROITE sous les capitales : c'est la
                disposition en triptyque des sections du site — accroche italique en haut a
                gauche, titre en capitales, note italique en bas a droite (cf. le titre des
                formations, « nos / FORMATIONS / n modules »).

                Une pastille bordee en petites capitales, comme la barre de navigation en
                porte, sortait de ce registre : elle se lisait comme un element d'interface
                pose sur le titre, et non comme la derniere ligne du titre lui-meme.

                Le soulignement au survol et la fleche disent qu'on peut cliquer, ce que les
                autres troisiemes lignes n'ont pas a dire — elles ne sont pas des liens. La
                fleche est dimensionnee en `em` pour suivre le `clamp` du texte.
              */}
              {cta && (
                <motion.a
                  href={cta.href}
                  onClick={(event) => exitVitrine(event, cta.href)}
                  style={{ opacity: ctaOpacity, pointerEvents: ctaPointer }}
                  className="group relative mr-[0.1em] mt-1 inline-flex items-center gap-[0.35em] self-end font-quote text-[clamp(1.1rem,3.5vw,2.5rem)] italic leading-none text-white/90 transition-colors duration-300 hover:text-white"
                >
                  {cta.label}
                  <ArrowRight
                    aria-hidden
                    className="h-[0.62em] w-[0.62em] shrink-0 transition-transform duration-300 group-hover:translate-x-[0.15em]"
                  />
                  {/*
                    Meme soulignement que « Nous contacter » dans les formations : une barre
                    qui se deploie depuis la gauche au survol, plutot qu'un `text-decoration`
                    qui apparait d'un bloc. Elle est ABSOLUE, donc hors du flux : elle ne
                    compte pas comme troisieme enfant de l'`inline-flex` et passe sous le
                    texte ET la fleche.
                  */}
                  <span
                    aria-hidden
                    className="absolute -bottom-1 left-0 h-[2px] w-full origin-left scale-x-0 bg-white transition-transform duration-500 ease-out group-hover:scale-x-100"
                  />
                </motion.a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
