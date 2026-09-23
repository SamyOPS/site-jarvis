"use client";

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { lockScroll, unlockScroll } from "@/features/vitrine/scroll-lock";
import { CARTE_MERE, DEVELOPPEUR, PROCESSEUR } from "@/features/vitrine/images";

// Contenu révélé derrière le capot en escalier (composant Formations) : un index
// typographique des modules, pas une liste.
//  - une ligne = un module, titre en capitales, filets pleine largeur ;
//  - au survol (souris uniquement) : balayage blanc, texte inversé, les autres
//    lignes s'estompent, et une image portrait suit le curseur ;
//  - au clic : panneau plein écran (image + typo + programme + contact).
// Images = PLACEHOLDERS.

// TODO : adresse de contact formations à confirmer.
const CONTACT_EMAIL = "contact@jarvis-connect.fr";

// Même courbe que les autres transitions du site (départ lent → sortie douce).
const EASE = [0.83, 0, 0.17, 1] as const;

type Formation = {
  index: string;
  title: string;
  format: string;
  duree: string;
  public: string;
  desc: string;
  programme: string[];
  image: string;
};

export const formations: Formation[] = [
  {
    index: "01",
    title: "Parcours support et supervision",
    format: "Atelier",
    duree: "2 jours",
    public: "Support N1/N2",
    desc: "Modules pratiques sur la gestion des incidents, l'escalade, la supervision, la communication et les standards ITIL.",
    // Découpage de la description ci-dessus, à compléter avec le vrai programme.
    programme: [
      "Gestion des incidents",
      "Escalade et coordination",
      "Supervision",
      "Communication utilisateur",
      "Standards ITIL",
    ],
    image: PROCESSEUR.src,
  },
  {
    index: "02",
    title: "Ateliers outillage",
    format: "Pratique",
    duree: "1 jour",
    public: "Équipes IT",
    desc: "Prise en main des outils de ticketing, supervision, MDM et automatisation pour gagner en efficacité.",
    programme: ["Outils de ticketing", "Supervision", "MDM", "Automatisation"],
    image: DEVELOPPEUR.src,
  },
  {
    index: "03",
    title: "Coaching gestes techniques",
    format: "Coaching",
    duree: "1/2 jour",
    public: "Techniciens",
    desc: "Bonnes pratiques de diagnostic, sécurisation poste, scripts d'intervention et relation utilisateur.",
    programme: [
      "Bonnes pratiques de diagnostic",
      "Sécurisation du poste",
      "Scripts d'intervention",
      "Relation utilisateur",
    ],
    image: CARTE_MERE.src,
  },
];

const mailto = (f: Formation) =>
  `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
    `Formation — ${f.title}`,
  )}`;

// Une ligne de l'index. Le survol est piloté par l'état du parent (et non par
// `group-hover`) car il faut aussi estomper les AUTRES lignes.
function Row({
  f,
  last,
  active,
  dim,
  onHover,
  onOpen,
}: {
  f: Formation;
  last: boolean;
  active: boolean;
  dim: boolean;
  onHover: (v: boolean) => void;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
      onClick={onOpen}
      aria-label={`Découvrir le module : ${f.title}`}
      className={`relative flex h-[24vh] min-h-[110px] shrink-0 cursor-pointer items-center overflow-hidden border-zinc-900/15 text-left ${
        last ? "border-y" : "border-t"
      }`}
    >
      {/* Balayage noir qui monte depuis le bas de la ligne */}
      <motion.span
        aria-hidden
        initial={false}
        animate={{ y: active ? "0%" : "101%" }}
        transition={{ duration: 0.55, ease: EASE }}
        className="absolute inset-0 bg-zinc-900"
      />

      <motion.span
        initial={false}
        animate={{ x: active ? 12 : 0 }}
        transition={{ duration: 0.55, ease: EASE }}
        className={`relative flex w-full items-center gap-4 px-5 transition-colors duration-500 sm:gap-8 sm:px-10 ${
          active ? "text-white" : dim ? "text-zinc-900/25" : "text-zinc-900"
        }`}
      >
        <span className="font-quote w-7 shrink-0 text-base italic sm:w-9 sm:text-xl">
          {f.index}
        </span>

        <span className="min-w-0 flex-1 truncate text-[clamp(1rem,5vw,1.5rem)] font-bold uppercase leading-[0.95] tracking-tight sm:text-[clamp(1.4rem,6.8vh,4.5rem)]">
          {f.title}
        </span>

        <span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] sm:block">
          {f.duree}
          <span className={active ? "text-white/40" : "text-zinc-900/40"}>
            {" "}
            ·{" "}
          </span>
          {f.format}
        </span>

        <motion.span
          aria-hidden
          initial={false}
          animate={{ x: active ? 0 : -8, opacity: active ? 1 : 0.35 }}
          transition={{ duration: 0.55, ease: EASE }}
          className="shrink-0 text-lg sm:text-2xl"
        >
          ↗
        </motion.span>
      </motion.span>
    </button>
  );
}

// Panneau plein écran d'un module : image d'un côté, typo de l'autre.
// Le contenu réapparaît en cascade à chaque changement de module (clé = index).
function Detail({
  f,
  onClose,
  onNext,
}: {
  f: Formation;
  onClose: () => void;
  onNext: () => void;
}) {
  const stack = {
    hidden: {},
    show: { transition: { staggerChildren: 0.055, delayChildren: 0.3 } },
  };
  const line = {
    hidden: { y: 26, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.6, ease: EASE } },
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={f.title}
      initial={{ y: "100%" }}
      animate={{ y: "0%" }}
      exit={{ y: "100%" }}
      transition={{ duration: 0.75, ease: EASE }}
      className="fixed inset-0 z-[90] bg-black text-white"
    >
      {/* En bas à droite : le coin haut droit est occupé par la navbar (logo à
          gauche, CTA + burger à droite), qui reste peinte au-dessus du panneau. */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer le module"
        className="group absolute bottom-6 right-5 z-10 flex cursor-pointer items-center gap-2 rounded-full border border-white/25 bg-black/70 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-white backdrop-blur transition-colors hover:bg-white hover:text-black sm:bottom-8 sm:right-10"
      >
        Fermer
        <span className="inline-block text-base transition-transform duration-300 group-hover:rotate-90">
          ✕
        </span>
      </button>

      <div className="grid h-full grid-cols-1 lg:grid-cols-[1fr_0.78fr]">
        {/* Texte */}
        <motion.div
          key={f.index}
          variants={stack}
          initial="hidden"
          animate="show"
          className="order-2 overflow-y-auto px-5 pb-28 pt-10 sm:px-10 lg:order-1 lg:pb-16 lg:pt-[12vh]"
        >
          <motion.p
            variants={line}
            className="font-quote text-lg italic text-white/50 sm:text-2xl"
          >
            module {f.index}
          </motion.p>

          <motion.h3
            variants={line}
            className="mt-1 text-[clamp(2rem,5.6vw,4.5rem)] font-bold uppercase leading-[0.92] tracking-tight"
          >
            {f.title}
          </motion.h3>

          <motion.p
            variants={line}
            className="mt-3 text-sm text-white/60 sm:text-base"
          >
            {f.format} — {f.public}
          </motion.p>

          <motion.div
            variants={line}
            className="mt-7 flex flex-wrap gap-x-8 gap-y-2 border-y border-white/10 py-4 font-mono text-[10px] uppercase tracking-[0.18em] text-white/50"
          >
            <span>{f.duree}</span>
            <span>{f.public}</span>
            <span>{f.format}</span>
          </motion.div>

          <motion.p
            variants={line}
            className="mt-8 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base"
          >
            {f.desc}
          </motion.p>

          <motion.div variants={line} className="mt-12 max-w-2xl">
            <p className="font-quote text-xl italic text-white/70 sm:text-2xl">
              Au programme
            </p>
            <ul className="mt-4 border-t border-white/10">
              {f.programme.map((txt, k) => (
                <li
                  key={txt}
                  className="flex gap-4 border-b border-white/10 py-3 text-sm leading-relaxed text-white/70"
                >
                  <span className="mt-[3px] shrink-0 font-mono text-[10px] text-white/35">
                    0{k + 1}
                  </span>
                  {txt}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            variants={line}
            className="mt-14 flex flex-wrap items-center gap-x-10 gap-y-4"
          >
            <a
              href={mailto(f)}
              className="group relative text-[clamp(1.5rem,3.4vw,2.75rem)] font-bold uppercase leading-none tracking-tight"
            >
              Nous contacter
              <span className="absolute -bottom-1 left-0 h-[2px] w-full origin-left scale-x-0 bg-white transition-transform duration-500 ease-out group-hover:scale-x-100" />
            </a>

            <button
              type="button"
              onClick={onNext}
              className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.18em] text-white/50 transition-colors hover:text-white"
            >
              Module suivant →
            </button>
          </motion.div>
        </motion.div>

        {/* Image : bandeau en haut sur mobile, colonne pleine hauteur sur grand écran */}
        <div className="order-1 h-[34vh] overflow-hidden lg:order-2 lg:h-full">
          <motion.div
            key={f.image}
            initial={{ scale: 1.12 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.1, ease: EASE }}
            className="relative h-full w-full"
          >
            <Image
              src={f.image}
              alt=""
              aria-hidden="true"
              fill
              sizes="(max-width: 1024px) 100vw, 45vw"
              draggable={false}
              className="object-cover"
            />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

export default function FormationsIndex({
  progress,
  revealFrom,
  revealTo,
}: {
  progress: MotionValue<number>;
  revealFrom: number;
  revealTo: number;
}) {
  // L'index « se pose » pendant que l'escalier le découvre (léger zoom arrière).
  // Pas de montée d'opacité : il est à pleine intensité dès qu'on l'aperçoit.
  const scale = useTransform(progress, [revealFrom, revealTo], [1.06, 1]);

  // Survol : souris fine uniquement (pas de suivi de curseur au tactile).
  const [pointer, setPointer] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const apply = () => setPointer(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const [hovered, setHovered] = useState<number | null>(null);
  // On garde la dernière image survolée pour que la vignette s'efface en
  // douceur au lieu de disparaître d'un coup quand on quitte une ligne.
  const [lastHovered, setLastHovered] = useState(0);

  // Vignette qui suit le curseur (ressort). Coordonnées relatives au bloc.
  const listRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 320, damping: 38, mass: 0.7 });
  const sy = useSpring(my, { stiffness: 320, damping: 38, mass: 0.7 });

  const [open, setOpen] = useState<number | null>(null);
  const close = () => setOpen(null);

  // Verrou du scroll + Échap quand le panneau est ouvert.
  useEffect(() => {
    if (open === null) return;
    lockScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      unlockScroll();
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <motion.div style={{ scale }} className="absolute inset-0 bg-white">
        <div
          ref={listRef}
          onMouseMove={(e) => {
            if (!pointer) return;
            const r = listRef.current?.getBoundingClientRect();
            if (!r) return;
            mx.set(e.clientX - r.left);
            my.set(e.clientY - r.top);
          }}
          className="relative flex h-full flex-col"
        >
          {/* Bloc de lignes à hauteur fixe, centré verticalement : il respire
              dans l'écran épinglé au lieu de l'occuper entièrement. */}
          <div className="flex min-h-0 flex-1 flex-col justify-center">
            {formations.map((f, i) => (
              <Row
                key={f.index}
                f={f}
                last={i === formations.length - 1}
                active={hovered === i}
                dim={hovered !== null && hovered !== i}
                onHover={(v) => {
                  if (v) {
                    setHovered(i);
                    setLastHovered(i);
                  } else {
                    setHovered((cur) => (cur === i ? null : cur));
                  }
                }}
                onOpen={() => setOpen(i)}
              />
            ))}

            {/* CTA de section, centré : jeu serif italique / capitales, filet
                qui se déploie au survol. Lien mailto (déjà fonctionnel). */}
            <div className="mt-8 flex shrink-0 justify-center px-5 sm:mt-10">
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
                  "Formations",
                )}`}
                className="group relative inline-flex items-baseline gap-2 sm:gap-3"
              >
                <span className="font-quote text-[clamp(1.1rem,2.8vh,2rem)] italic leading-none text-zinc-500 transition-colors duration-300 group-hover:text-zinc-900">
                  nous
                </span>
                <span className="text-[clamp(0.9rem,2.3vh,1.6rem)] font-bold uppercase leading-none tracking-tight text-zinc-900">
                  contacter
                </span>
                <span
                  aria-hidden
                  className="text-[clamp(0.9rem,2.3vh,1.6rem)] leading-none text-zinc-900 transition-transform duration-300 group-hover:translate-x-1.5"
                >
                  →
                </span>
                {/* Filet qui se déploie sous la ligne au survol */}
                <span
                  aria-hidden
                  className="absolute -bottom-2 left-0 h-px w-full origin-left scale-x-0 bg-zinc-900 transition-transform duration-500 ease-out group-hover:scale-x-100"
                />
              </a>
            </div>
          </div>

          {/* Vignette suiveuse (souris uniquement) */}
          {pointer && (
            <motion.div
              aria-hidden
              style={{ x: sx, y: sy }}
              className="pointer-events-none absolute left-0 top-0 z-20"
            >
              <motion.div
                style={{ x: "-50%", y: "-50%" }}
                initial={false}
                animate={{
                  opacity: hovered !== null ? 1 : 0,
                  scale: hovered !== null ? 1 : 0.8,
                  rotate: hovered !== null ? -3 : 4,
                }}
                transition={{ duration: 0.45, ease: EASE }}
                className="overflow-hidden"
              >
                <div className="relative aspect-[4/5] w-[clamp(150px,13vw,230px)]">
                  <Image
                    key={formations[hovered ?? lastHovered].image}
                    src={formations[hovered ?? lastHovered].image}
                    alt=""
                    fill
                    sizes="230px"
                    draggable={false}
                    className="object-cover"
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Panneau plein écran, hors du bloc épinglé (pas de rognage possible) */}
      <AnimatePresence>
        {open !== null && (
          <Detail
            f={formations[open]}
            onClose={close}
            onNext={() => setOpen((i) => ((i ?? 0) + 1) % formations.length)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
