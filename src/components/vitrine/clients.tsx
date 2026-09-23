"use client";

import {
  AnimatePresence,
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useEffect, useRef, useState } from "react";

// Logos clients (public/Image/logo_client).
// invert=true  : logo blanc sur fond transparent -> `brightness-0` = noir.
// invert=false : logo en couleur sur fond blanc opaque (ou .webp non vérifié)
//                -> `mix-blend-multiply` fait disparaître le fond blanc et
//                affiche le logo dans sa couleur d'origine (pas de carré noir).
const logos: { src: string; alt: string; invert: boolean; big?: boolean }[] = [
  { src: "/Image/logo_client/3M.png", alt: "3M", invert: true },
  { src: "/Image/logo_client/barriere.png", alt: "Barrière", invert: true },
  {
    src: "/Image/logo_client/bnp-paribas.png",
    alt: "BNP Paribas",
    invert: true,
  },
  { src: "/Image/logo_client/groupe-bpce.png", alt: "BPCE", invert: true },
  { src: "/Image/logo_client/burberry.png", alt: "Burberry", invert: true },
  { src: "/Image/logo_client/cgi.png", alt: "CGI", invert: true },
  {
    src: "/Image/logo_client/bureau_veritas.png",
    alt: "Bureau Veritas",
    invert: true,
  },
  { src: "/Image/logo_client/engie.png", alt: "Engie", invert: true },
  { src: "/Image/logo_client/ethypharm.png", alt: "Ethypharm", invert: true },
  { src: "/Image/logo_client/foncia.png", alt: "Foncia", invert: true },
  { src: "/Image/logo_client/hp.png", alt: "HP", invert: false },
  { src: "/Image/logo_client/inli.png", alt: "In'li", invert: true },
  {
    src: "/Image/logo_client/les_mousquetaires.png",
    alt: "Les Mousquetaires",
    invert: true,
  },
  { src: "/Image/logo_client/riccobono.png", alt: "Riccobono", invert: true },
  { src: "/Image/logo_client/lvmh.png", alt: "LVMH", invert: true },
  { src: "/Image/logo_client/sisley.png", alt: "Sisley", invert: true },
  { src: "/Image/logo_client/sncf.png", alt: "SNCF", invert: true },
  { src: "/Image/logo_client/stihl.png", alt: "Stihl", invert: false },
  { src: "/Image/logo_client/tpicap.png", alt: "TP ICAP", invert: true },
  { src: "/Image/logo_client/uniqlo.png", alt: "Uniqlo", invert: false },
  {
    src: "/Image/logo_client/apprentis-auteuil.png",
    alt: "Apprentis d'Auteuil",
    invert: true,
    big: true,
  },
  {
    src: "/Image/logo_client/jacquemus.png",
    alt: "Jacquemus",
    invert: true,
    big: true,
  },
];

const row1 = logos.slice(0, 7);
const row2 = logos.slice(7, 14);
const row3 = logos.slice(14);

// Ouvre le cercle : (id du logo cliqué, nom, centre X, centre Y en px écran).
type OpenFn = (id: string, name: string, cx: number, cy: number) => void;

function Logo({
  id,
  src,
  alt,
  invert,
  big,
  onOpen,
  activeId,
}: {
  id: string;
  src: string;
  alt: string;
  invert: boolean;
  big?: boolean;
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          className={`w-auto max-w-[190px] object-contain ${
            big
              ? "h-10 sm:h-14 lg:h-16 2xl:h-20"
              : "h-6 sm:h-9 lg:h-10 2xl:h-12"
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
          className="flex h-20 w-max cursor-grab items-center active:cursor-grabbing sm:h-36 lg:h-44 2xl:h-72"
        >
          {[...items, ...items].map((logo, i) => (
            <Logo
              key={i}
              id={`${rowId}-${i}`}
              src={logo.src}
              alt={logo.alt}
              invert={logo.invert}
              big={logo.big}
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

  // Ligne 1 vers la gauche, ligne 2 vers la droite, ligne 3 vers la gauche
  // (rangées doublées pour rester pleines sur les bords pendant le défilement).
  const x1 = useTransform(scrollYProgress, [0, 1], ["0vw", "-16vw"]);
  const x2 = useTransform(scrollYProgress, [0, 1], ["-16vw", "0vw"]);
  const x3 = useTransform(scrollYProgress, [0, 1], ["0vw", "-22vw"]);

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
      className="bg-white pb-8 sm:pb-16 lg:pb-20 2xl:pb-32"
    >
      <div className="px-6 pt-6 sm:px-12 sm:pt-10 lg:pt-12 2xl:pt-16">
        <p className="font-quote text-2xl text-zinc-900 sm:text-3xl lg:text-4xl 2xl:text-5xl">
          Ils nous font confiance
        </p>
      </div>

      <div className="mt-6 sm:mt-10 lg:mt-12">
        {/* Défilement auto (scroll) + glisser à la main + clic = nom */}
        <Row x={x1} items={row1} onOpen={open} activeId={activeId} rowId="r1" />
        <Row x={x2} items={row2} onOpen={open} activeId={activeId} rowId="r2" />
        <Row
          x={x3}
          items={row3}
          last
          onOpen={open}
          activeId={activeId}
          rowId="r3"
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
