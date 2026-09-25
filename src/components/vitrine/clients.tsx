"use client";

import {
  AnimatePresence,
  motion,
  useTransform,
  type MotionValue,
} from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useSectionProgress } from "@/features/vitrine/use-section-progress";

// Logos clients (public/Image/logo_client).
/*
 * L'encre est dans les FICHIERS, pas dans la CSS. Les logos monochromes sont enregistres
 * en noir sur fond transparent ; HP, Stihl et Uniqlo gardent leurs couleurs.
 *
 * Ils etaient livres blancs puis noircis par `brightness-0`, et les logos en couleur
 * portaient un `mix-blend-multiply` — sans effet visible sur ce fond blanc pur, mais qui
 * interdisait de mettre les rangees sur une couche GPU (un multiply isole dans une couche
 * sans fond n'a plus le blanc derriere lui). Resultat : les 44 logos etaient re-rasterises
 * a chaque image de defilement, et la section etait la plus lente de la page. Un logo
 * ajoute se depose donc deja a l'encre voulue.
 *
 * Le suffixe `-noir` n'est pas decoratif : il donne aux fichiers noircis une URL neuve.
 * Sous l'ancien nom, les variantes blanches restaient servies par le cache de Next et
 * par celui des navigateurs (4 h) — du blanc sur blanc, donc des logos invisibles.
 * Un fichier dont l'aspect change doit changer de nom.
 */
/*
 * `w` / `h` : dimensions INTRINSEQUES du fichier, relevees dans les PNG eux-memes.
 *
 * Elles ne decrivent pas l'affichage — la CSS impose la hauteur, et `max-w-[190px]` la
 * largeur — mais `next/image` en a besoin pour tenir le bon rapport et surtout pour
 * generer les variantes. Sans elles, ces logos partaient BRUTS : 708 Ko, et surtout 50
 * millions de pixels a decoder, soit ~192 Mo de bitmaps en memoire pour 0,3 Mo reellement
 * utiles a 40 px de haut.
 *
 * Les fichiers eux-memes sont desormais bornes a 600x240 (le double de la plus grande
 * vignette) : `inli.png` faisait 8664x4104, et l'optimiseur de Next devait le decoder
 * en entier a chaque variante — en dev, sur la machine meme qui fait tourner le navigateur.
 * Un logo remplace se redimensionne avant d'etre depose, et ses `w` / `h` suivent.
 */
const logos: {
  src: string;
  alt: string;
  w: number;
  h: number;
  big?: boolean;
}[] = [
  { src: "/Image/logo_client/3M-noir.png", alt: "3M", w: 257, h: 135 },
  { src: "/Image/logo_client/barriere-noir.png", alt: "Barrière", w: 331, h: 240 },
  { src: "/Image/logo_client/bnp-paribas-noir.png", alt: "BNP Paribas", w: 600, h: 239 },
  { src: "/Image/logo_client/groupe-bpce-noir.png", alt: "BPCE", w: 600, h: 100 },
  { src: "/Image/logo_client/burberry-noir.png", alt: "Burberry", w: 1182, h: 284 },
  { src: "/Image/logo_client/cgi-noir.png", alt: "CGI", w: 300, h: 140 },
  { src: "/Image/logo_client/bureau_veritas-noir.png", alt: "Bureau Veritas", w: 193, h: 240 },
  { src: "/Image/logo_client/engie-noir.png", alt: "Engie", w: 600, h: 213 },
  { src: "/Image/logo_client/ethypharm-noir.png", alt: "Ethypharm", w: 520, h: 102 },
  { src: "/Image/logo_client/foncia-noir.png", alt: "Foncia", w: 1171, h: 456 },
  { src: "/Image/logo_client/hp.png", alt: "HP", w: 240, h: 240 },
  { src: "/Image/logo_client/inli-noir.png", alt: "In'li", w: 507, h: 240 },
  { src: "/Image/logo_client/les_mousquetaires-noir.png", alt: "Les Mousquetaires", w: 526, h: 387 },
  { src: "/Image/logo_client/riccobono-noir.png", alt: "Riccobono", w: 300, h: 91 },
  { src: "/Image/logo_client/lvmh-noir.png", alt: "LVMH", w: 600, h: 140 },
  { src: "/Image/logo_client/sisley-noir.png", alt: "Sisley", w: 600, h: 176 },
  { src: "/Image/logo_client/sncf-noir.png", alt: "SNCF", w: 150, h: 150 },
  { src: "/Image/logo_client/stihl.png", alt: "Stihl", w: 746, h: 161 },
  { src: "/Image/logo_client/tpicap-noir.png", alt: "TP ICAP", w: 604, h: 174 },
  { src: "/Image/logo_client/uniqlo.png", alt: "Uniqlo", w: 241, h: 240 },
  { src: "/Image/logo_client/apprentis-auteuil-noir.png", alt: "Apprentis d'Auteuil", w: 240, h: 240, big: true },
  { src: "/Image/logo_client/jacquemus-noir.png", alt: "Jacquemus", w: 320, h: 320, big: true },
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
  big,
  w,
  h,
  onOpen,
  activeId,
}: {
  id: string;
  src: string;
  alt: string;
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
          `next/image` et non `<img>` : les fichiers sources font encore jusqu'a 1182 px de
          large pour un affichage de 40 px de haut. Servis bruts, ils couteraient du reseau
          et surtout des bitmaps decodes bien plus grands qu'utile — la part qui fait
          reellement souffrir un telephone. Next sert une variante a la taille utile.

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
          }`}
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
      {/* `will-change` : la rangee devient une couche que le GPU fait glisser, au lieu
          de re-rasteriser ses logos a chaque image. Possible depuis que les logos ne
          portent plus ni filtre ni mode de fusion (voir en tete de fichier). */}
      <motion.div style={{ x, willChange: "transform" }}>
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
  const ref = useRef<HTMLElement>(null);
  const scrollYProgress = useSectionProgress(ref, "crossing");

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
