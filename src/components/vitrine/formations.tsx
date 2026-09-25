"use client";

import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import Image from "next/image";
import { useRef, useState } from "react";
import FormationsIndex, { formations } from "@/components/vitrine/formations-index";
import { DEFENSE } from "@/features/vitrine/images";

// Réglages. Le capot est épinglé sur 100vh : la section mesure SECTION_VH, donc
// il reste SCROLL_VH de scroll utile, que `scrollYProgress` mappe sur 0 → 1.
// Les réglages sont exprimés en vh de scroll (via `p`) et non en progression
// brute : la hauteur de la section peut changer sans dérégler l'escalier.
const SECTION_VH = 430;
const SCROLL_VH = SECTION_VH - 100;
const p = (vh: number) => vh / SCROLL_VH;

// Séquence : texte pleinement visible → fondu net → (texte disparu) → escalier
// → ~90vh d'index épinglé, révélé et pleinement manipulable.
const BANDS = 5; // nombre de marches
const OPEN_START = p(75); // la marche du bas s'ouvre (l'image commence à s'ouvrir)
const STAGGER = p(25); // décalage d'ouverture entre deux marches
const DURATION = p(65); // durée d'ouverture d'une marche
const BANDS_END = OPEN_START + (BANDS - 1) * STAGGER + DURATION; // escalier fini
// Titre : affiché tant que l'image est entière, masqué juste avant l'ouverture.
// Deux seuils (hystérésis) pour éviter tout clignotement « disparaît/réapparaît »
// sur un petit mouvement de scroll ou le jitter d'épinglage :
//  - on MASQUE en franchissant HIDE_AT (juste avant l'ouverture) ;
//  - on ne RÉAFFICHE qu'en repassant sous SHOW_AT (bien plus bas) ;
//  - entre les deux, l'état ne change pas.
const TITLE_HIDE_AT = OPEN_START - p(15);
const TITLE_SHOW_AT = p(25);
// La marche du HAUT (celle qui passe sous la barre de navigation) est la
// dernière à s'écarter : la barre reste en thème sombre jusqu'à ce qu'elle soit
// largement dégagée, 20vh avant la fin de l'escalier.
const NAV_DARK_UNTIL = BANDS_END - p(20);
const BLEED = 0.5; // léger chevauchement vertical entre marches (anti-liseré)
/*
 * Largeur d'une moitie, en % du capot : 100 - 49.5, le demi pour-cent de trop etant le
 * chevauchement central qui evite un lisere.
 */
const HALF = 50.5;
/*
 * Course d'ouverture, exprimee en % de la MOITIE et non du capot.
 *
 * Chaque moitie occupait auparavant tout l'ecran, masquee a ~90 % par un `clip-path` :
 * dix calques plein ecran dont un dixieme seulement etait visible. Les boites epousent
 * desormais leur bande, ce qui divise par dix la surface a peindre — mais un `-100%` n'y
 * vaut plus une largeur d'ecran. Cette conversion retablit exactement la meme course.
 */
const SLIDE = (100 / HALF) * 100;
// L'image étant opaque (assombrie via brightness), les recouvrements ne
// cumulent aucune transparence : pas de couture visible entre les morceaux.

// Le « capot » : image plein écran assombrie (sans voile semi-transparent, pour
// éviter le cumul dans les zones de recouvrement). Rendu à l'identique dans
// chaque moitié de chaque marche.
function Cover() {
  return (
    <Image
      src={DEFENSE.src}
      alt=""
      fill
      sizes="100vw"
      draggable={false}
      className="object-cover brightness-[0.8]"
    />
  );
}

// Une marche : bande horizontale du capot, coupée en deux au centre. Ses deux
// moitiés s'écartent au scroll. La marche du bas s'ouvre en premier.
function Band({
  index,
  progress,
}: {
  index: number;
  progress: MotionValue<number>;
}) {
  const fromBottom = BANDS - 1 - index; // 0 pour la marche du bas
  const start = OPEN_START + fromBottom * STAGGER;
  const end = start + DURATION;
  const leftX = useTransform(progress, [start, end], ["0%", `-${SLIDE}%`]);
  const rightX = useTransform(progress, [start, end], ["0%", `${SLIDE}%`]);

  // Découpe verticale de la bande (avec un léger débord pour éviter un liseré).
  const top = index === 0 ? 0 : (index / BANDS) * 100 - BLEED;
  const bottom =
    index === BANDS - 1 ? 0 : ((BANDS - 1 - index) / BANDS) * 100 - BLEED;

  /*
    La boite EPOUSE la bande, au lieu d'occuper l'ecran entier sous un `clip-path`.
    Le capot est alors replace a l'interieur, exprime dans le repere de cette boite :
    l'image reste calee comme si la boite faisait tout l'ecran, mais le navigateur n'a
    plus qu'un dixieme de surface a peindre et a deplacer par marche.
  */
  const height = 100 - top - bottom;
  const coverHeight = (100 / height) * 100;
  const coverTop = (-top / height) * 100;
  const coverWidth = SLIDE;
  const coverLeft = (-49.5 / HALF) * 100;

  return (
    <>
      {/* Moitié gauche (glisse vers la gauche) — recouvrement de 0,5 % au centre */}
      <motion.div
        style={{ x: leftX, top: `${top}%`, height: `${height}%`, width: `${HALF}%` }}
        className="absolute left-0 z-10 overflow-hidden"
      >
        <div
          className="absolute left-0"
          style={{
            top: `${coverTop}%`,
            width: `${coverWidth}%`,
            height: `${coverHeight}%`,
          }}
        >
          <Cover />
        </div>
      </motion.div>
      {/* Moitié droite (glisse vers la droite) */}
      <motion.div
        style={{ x: rightX, top: `${top}%`, height: `${height}%`, width: `${HALF}%` }}
        className="absolute right-0 z-10 overflow-hidden"
      >
        <div
          className="absolute"
          style={{
            top: `${coverTop}%`,
            left: `${coverLeft}%`,
            width: `${coverWidth}%`,
            height: `${coverHeight}%`,
          }}
        >
          <Cover />
        </div>
      </motion.div>
    </>
  );
}

// Thème de la barre de navigation. Le capot est sombre (barre en blanc) mais
// l'index révélé derrière est sur fond blanc (barre en noir) : le marqueur
// `data-nav-dark` ne peut donc pas être posé sur la section, il n'est rendu que
// pendant la phase « capot ». Même hystérésis que le titre, pour ne pas
// clignoter quand on s'arrête pile sur le seuil.
function NavDarkWhileCovered({ progress }: { progress: MotionValue<number> }) {
  const [dark, setDark] = useState(true);
  useMotionValueEvent(progress, "change", (v) => {
    if (v >= NAV_DARK_UNTIL) setDark(false);
    else if (v <= NAV_DARK_UNTIL - p(30)) setDark(true);
  });

  if (!dark) return null;
  return (
    <div
      data-nav-dark
      aria-hidden
      className="pointer-events-none absolute inset-0"
    />
  );
}

// Titre « nos Formations » : calque unique au-dessus du capot. Affiché/
// masqué par un état à hystérésis (voir seuils ci-dessus) ; le fondu est une
// transition CSS basée sur le TEMPS (pas sur la position exacte du scroll),
// donc il ne peut pas « repartir en arrière » au moindre soubresaut.
function TitleOverlay({ progress }: { progress: MotionValue<number> }) {
  const [hidden, setHidden] = useState(false);
  useMotionValueEvent(progress, "change", (v) => {
    if (v >= TITLE_HIDE_AT)
      setHidden(true); // seuil haut → on masque
    else if (v <= TITLE_SHOW_AT) setHidden(false); // seuil bas → on réaffiche
    // entre les deux : on ne touche à rien (hystérésis)
  });

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-4 transition-all duration-500 ease-out ${
        hidden ? "-translate-y-4 opacity-0" : "translate-y-0 opacity-100"
      }`}
    >
      <div className="flex flex-col items-start">
        <span className="mb-1 ml-[0.1em] font-quote text-[clamp(1.1rem,3.5vw,2.5rem)] italic leading-none text-white/90">
          nos
        </span>
        <h2 className="text-[clamp(2.5rem,9vw,8rem)] font-bold uppercase leading-[0.95] tracking-tight text-white">
          Formations
        </h2>
        <span className="mt-1 mr-[0.1em] self-end font-quote text-[clamp(1.1rem,3.5vw,2.5rem)] italic leading-none text-white/90">
          {formations.length} modules
        </span>
      </div>
    </div>
  );
}

export default function Formations() {
  // Section haute + capot épinglé (sticky) : le scroll efface le texte puis
  // écarte les marches.
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  return (
    <section
      ref={sectionRef}
      id="formations"
      style={{ height: `${SECTION_VH}vh` }}
      className="relative bg-black"
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Contenu révélé derrière : l'index des modules de formation */}
        <FormationsIndex
          progress={scrollYProgress}
          revealFrom={OPEN_START}
          revealTo={BANDS_END}
        />

        {/* Capot en marches (du bas vers le haut) */}
        {Array.from({ length: BANDS }, (_, i) => (
          <Band key={i} index={i} progress={scrollYProgress} />
        ))}

        {/* Titre, qui s'efface avant l'escalier */}
        <TitleOverlay progress={scrollYProgress} />

        {/* Barre de navigation en blanc, seulement tant que le capot la couvre */}
        <NavDarkWhileCovered progress={scrollYProgress} />
      </div>
    </section>
  );
}
