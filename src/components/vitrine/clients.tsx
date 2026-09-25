"use client";

import {
  AnimatePresence,
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

// Logos clients (public/Image/logo_client).
// invert=true  : logo blanc sur fond transparent -> `brightness-0` = noir.
// invert=false : logo en couleur sur fond blanc opaque (ou .webp non vérifié)
//                -> `mix-blend-multiply` fait disparaître le fond blanc et
//                affiche le logo dans sa couleur d'origine (pas de carré noir).
/*
 * `w` / `h` : dimensions INTRINSEQUES du fichier, relevees dans les PNG eux-memes.
 *
 * Elles ne decrivent pas l'affichage — la CSS impose la hauteur, et `max-w-[190px]` la
 * largeur — mais `next/image` en a besoin pour tenir le bon rapport et surtout pour
 * generer les variantes. Sans elles, ces logos partaient BRUTS : 708 Ko, et surtout 50
 * millions de pixels a decoder, soit ~192 Mo de bitmaps en memoire pour 0,3 Mo reellement
 * utiles a 40 px de haut. `inli.png` fait a lui seul 8664x4104 pour une vignette de 84 px
 * de large : c'est le genre de decodage qui fait tousser un telephone d'entree de gamme.
 */
const logos: {
  src: string;
  alt: string;
  invert: boolean;
  w: number;
  h: number;
  big?: boolean;
}[] = [
  { src: "/Image/logo_client/3M.png", alt: "3M", invert: true, w: 257, h: 135 },
  { src: "/Image/logo_client/barriere.png", alt: "Barrière", invert: true, w: 1226, h: 890 },
  { src: "/Image/logo_client/bnp-paribas.png", alt: "BNP Paribas", invert: true, w: 1280, h: 510 },
  { src: "/Image/logo_client/groupe-bpce.png", alt: "BPCE", invert: true, w: 1247, h: 208 },
  { src: "/Image/logo_client/burberry.png", alt: "Burberry", invert: true, w: 1182, h: 284 },
  { src: "/Image/logo_client/cgi.png", alt: "CGI", invert: true, w: 300, h: 140 },
  { src: "/Image/logo_client/bureau_veritas.png", alt: "Bureau Veritas", invert: true, w: 1282, h: 1593 },
  { src: "/Image/logo_client/engie.png", alt: "Engie", invert: true, w: 1552, h: 552 },
  { src: "/Image/logo_client/ethypharm.png", alt: "Ethypharm", invert: true, w: 520, h: 102 },
  { src: "/Image/logo_client/foncia.png", alt: "Foncia", invert: true, w: 1171, h: 456 },
  { src: "/Image/logo_client/hp.png", alt: "HP", invert: false, w: 2400, h: 2400 },
  { src: "/Image/logo_client/inli.png", alt: "In'li", invert: true, w: 8664, h: 4104 },
  { src: "/Image/logo_client/les_mousquetaires.png", alt: "Les Mousquetaires", invert: true, w: 526, h: 387 },
  { src: "/Image/logo_client/riccobono.png", alt: "Riccobono", invert: true, w: 300, h: 91 },
  { src: "/Image/logo_client/lvmh.png", alt: "LVMH", invert: true, w: 1518, h: 354 },
  { src: "/Image/logo_client/sisley.png", alt: "Sisley", invert: true, w: 878, h: 257 },
  { src: "/Image/logo_client/sncf.png", alt: "SNCF", invert: true, w: 150, h: 150 },
  { src: "/Image/logo_client/stihl.png", alt: "Stihl", invert: false, w: 746, h: 161 },
  { src: "/Image/logo_client/tpicap.png", alt: "TP ICAP", invert: true, w: 604, h: 174 },
  { src: "/Image/logo_client/uniqlo.png", alt: "Uniqlo", invert: false, w: 1280, h: 1276 },
  { src: "/Image/logo_client/apprentis-auteuil.png", alt: "Apprentis d'Auteuil", invert: true, w: 400, h: 400, big: true },
  { src: "/Image/logo_client/jacquemus.png", alt: "Jacquemus", invert: true, w: 320, h: 320, big: true },
];

/**
 * Hauteur d'affichage la PLUS GRANDE de l'echelle responsive : `2xl:h-12`, soit 48 px.
 * C'est elle qui borne la largeur a servir — a hauteur egale, un logo large en demande
 * plus qu'un logo carre. Elle doit suivre si l'echelle des hauteurs bouge.
 */
const MAX_LOGO_HEIGHT_PX = 48;

/*
 * DEUX rangees, et non trois.
 *
 * La coupure est CALCULEE et non ecrite en dur : a 22 logos, les bornes 7 / 14 laissaient
 * deja une derniere rangee plus fournie que les deux autres. Ajouter ou retirer un client
 * rééquilibre desormais les rangees tout seul.
 */
const middle = Math.ceil(logos.length / 2);
const row1 = logos.slice(0, middle);
const row2 = logos.slice(middle);

// Ouvre le cercle : (id du logo cliqué, nom, centre X, centre Y en px écran).
type OpenFn = (id: string, name: string, cx: number, cy: number) => void;

function Logo({
  id,
  src,
  alt,
  invert,
  big,
  w,
  h,
  onOpen,
  activeId,
}: {
  id: string;
  src: string;
  alt: string;
  invert: boolean;
  big?: boolean;
  w: number;
  h: number;
  onOpen: OpenFn;
  activeId: string | null;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const open = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) onOpen(id, alt, r.left + r.width / 2, r.top + r.height / 2);
  };
  // Le logo cliqué disparaît (laisse place au cercle), sans décaler la ligne.
  const hidden = activeId === id;
  return (
    <span className="flex shrink-0 items-center justify-center px-8 sm:px-14">
      <button
        ref={btnRef}
        type="button"
        onClick={open}
        aria-label={`Afficher le nom : ${alt}`}
        className={`cursor-pointer transition-opacity duration-200 ${
          hidden ? "opacity-0" : "hover:opacity-50"
        }`}
      >
        {/*
          `next/image` et non `<img>` : les fichiers sources font jusqu'a 8664 px de large
          pour un affichage de 40 px de haut. Servis bruts, ils coutaient 708 Ko de reseau
          et surtout ~192 Mo de bitmaps decodes — la part qui fait reellement souffrir un
          telephone. Next sert desormais une variante a la taille utile, en WebP/AVIF.

          `sizes` est calcule et non fixe a 190 px : la largeur occupee depend du RAPPORT
          de chaque logo, un carre n'en prend que 48. Annoncer 190 px partout ferait
          telecharger jusqu'a quatre fois trop pour les logos les plus ramasses.
        */}
        <Image
          src={src}
          alt={alt}
          width={w}
          height={h}
          sizes={`${Math.min(190, Math.ceil((w / h) * MAX_LOGO_HEIGHT_PX))}px`}
          draggable={false}
          /*
            Taille de base portee a 40 px — 56 px pour les deux logos larges — soit ce qui
            ne s'appliquait qu'a partir de `lg`. Le mobile part donc de 24 px a l'origine
            pour arriver ici a 40.

            Les paliers `sm` ont ete RETIRES plutot que recopies : ils valaient desormais
            moins que la base, et un logo qui retrecit en passant a 640 px de large n'a
            pas de sens. Une classe absente herite simplement du palier precedent.

            `lg` et `2xl` sont inchanges : c'est le petit ecran qui manquait de presence,
            pas le grand.

            Rappel : `max-w-[190px]` n'est PAS responsive. Un logo tres allonge (au-dela
            de 190/40, soit un rapport de 4,75:1) est borne par sa largeur et ne profite
            donc pas de cet agrandissement.
          */
          className={`w-auto max-w-[190px] object-contain ${
            big ? "h-14 lg:h-16 2xl:h-20" : "h-10 2xl:h-12"
          } ${invert ? "brightness-0" : "mix-blend-multiply"}`}
        />
      </button>
    </span>
  );
}

// Une ligne : couche pilotée par le scroll (translation auto) + couche
// draggable par-dessus (glisser à la main). Les deux transforms se cumulent.
function Row({
  x,
  items,
  last,
  onOpen,
  activeId,
  rowId,
}: {
  x: MotionValue<string>;
  items: typeof logos;
  last?: boolean;
  onOpen: OpenFn;
  activeId: string | null;
  rowId: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={wrapRef}
      className={`overflow-hidden border-zinc-900 ${last ? "border-y" : "border-t"}`}
    >
      <motion.div style={{ x }}>
        <motion.div
          drag="x"
          dragConstraints={wrapRef}
          dragElastic={0.08}
          // 160 px de bande sur mobile, contre 80 a l'origine. Le palier `sm` a disparu :
          // ses 144 px valaient MOINS que la base une fois celle-ci relevee, et une bande
          // qui retrecit quand l'ecran s'elargit n'a pas de sens.
          className="flex h-40 w-max cursor-grab items-center active:cursor-grabbing lg:h-44 2xl:h-72"
        >
          {[...items, ...items].map((logo, i) => (
            <Logo
              key={i}
              id={`${rowId}-${i}`}
              src={logo.src}
              alt={logo.alt}
              invert={logo.invert}
              big={logo.big}
              w={logo.w}
              h={logo.h}
              onOpen={onOpen}
              activeId={activeId}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function Clients() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Ligne 1 vers la gauche, ligne 2 vers la droite : le sens oppose est ce qui donne
  // l'impression de defilement (rangees doublees pour rester pleines sur les bords).
  const x1 = useTransform(scrollYProgress, [0, 1], ["0vw", "-16vw"]);
  const x2 = useTransform(scrollYProgress, [0, 1], ["-16vw", "0vw"]);

  // Cercle du nom du client (au clic sur un logo).
  const [active, setActive] = useState<{
    id: string;
    name: string;
    cx: number;
    cy: number;
  } | null>(null);
  const open: OpenFn = (id, name, cx, cy) => setActive({ id, name, cx, cy });
  const activeId = active?.id ?? null;

  // Fermeture : au scroll (le logo glisserait sous le cercle) et à Échap.
  useEffect(() => {
    if (!active) return;
    const close = () => setActive(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [active]);

  return (
    <section
      ref={ref}
      id="clients"
      /*
        `relative` n'est PAS decoratif ici : `useScroll({ target })` mesure la position de
        cette section pour en deduire la progression, et ce calcul est faux tant que
        l'element reste en `position: static` — c'est l'avertissement « ensure that the
        container has a non-static position ». Le defilement des logos etait donc pilote
        par une progression approximative.
      */
      className="relative bg-white pb-8 sm:pb-16 lg:pb-20 2xl:pb-32"
    >
      {/*
        `pt-2` sur mobile au lieu de `pt-6` : les bandes ayant double de hauteur, le
        blanc du haut n'a plus a en rajouter pour donner de la respiration a la section.
        Les paliers `sm` et au-dela gardent leur aeration d'origine.
      */}
      <div className="px-6 pt-2 sm:px-12 sm:pt-10 lg:pt-12 2xl:pt-16">
        <p className="font-quote text-2xl text-zinc-900 sm:text-3xl lg:text-4xl 2xl:text-5xl">
          Ils nous font confiance
        </p>
      </div>

      {/* Meme resserrement entre le titre et la premiere bande, mobile uniquement. */}
      <div className="mt-3 sm:mt-10 lg:mt-12">
        {/* Défilement auto (scroll) + glisser à la main + clic = nom */}
        <Row x={x1} items={row1} onOpen={open} activeId={activeId} rowId="r1" />
        <Row
          x={x2}
          items={row2}
          last
          onOpen={open}
          activeId={activeId}
          rowId="r2"
        />
      </div>

      {/* Capteur de clic plein écran pour fermer (transparent) */}
      {active && (
        <button
          type="button"
          aria-label="Fermer"
          onClick={() => setActive(null)}
          className="fixed inset-0 z-[70] cursor-default"
        />
      )}

      {/* Cercle VIDE qui se forme depuis le centre du logo, nom au milieu.
          Le logo cliqué a disparu → l'intérieur du cercle laisse voir le fond. */}
      <AnimatePresence>
        {active && (
          <motion.div
            key={active.id}
            aria-hidden
            className="pointer-events-none fixed z-[71] flex h-44 w-44 select-none items-center justify-center rounded-full border-[5px] border-zinc-900 bg-transparent text-zinc-900 sm:h-52 sm:w-52 lg:h-60 lg:w-60"
            style={{ left: active.cx, top: active.cy }}
            initial={{ scale: 0, x: "-50%", y: "-50%" }}
            animate={{ scale: 1, x: "-50%", y: "-50%" }}
            exit={{ scale: 0, x: "-50%", y: "-50%" }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="px-6 text-center text-base font-semibold leading-tight tracking-tight sm:text-lg">
              {active.name}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
