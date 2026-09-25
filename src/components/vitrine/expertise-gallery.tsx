"use client";

import {
  AnimatePresence,
  motion,
  useScroll,
  useTransform,
} from "motion/react";
import { X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { lockScroll, unlockScroll } from "@/features/vitrine/scroll-lock";
import {
  CARTE_MERE,
  DEFENSE,
  DEVELOPPEUR,
  FOND_BLEU,
  PROCESSEUR,
  TECHNICIENS,
} from "@/features/vitrine/images";

// Expertises présentées en fiches (image + métadonnées + grand titre serif),
// parcourues par un défilement horizontal piloté par le scroll vertical.
// Un clic sur une image l'agrandit (layout partagé) en plein écran centré, avec
// toutes les infos de l'expertise. Images = PLACEHOLDERS.
const items = [
  {
    index: "01",
    domaine: "Infrastructure",
    approche: "Assistance & infogérance",
    desc: "Assistance réactive et infogérance de votre parc au quotidien, pour des équipes toujours opérationnelles.",
    points: [
      "Helpdesk et support de proximité",
      "Gestion et supervision du parc",
      "Maintenance préventive et curative",
      "Gestion des incidents et des demandes",
    ],
    title: "Support informatique",
    image: TECHNICIENS.src,
    image2: PROCESSEUR.src,
  },
  {
    index: "02",
    domaine: "Applicatif",
    approche: "Sur mesure",
    desc: "Applications web et outils métiers conçus pour vos process, du besoin à la mise en production.",
    points: [
      "Applications web sur mesure",
      "Outils et portails métiers",
      "Intégrations et API",
      "Maintenance évolutive",
    ],
    title: "Développement",
    image: DEVELOPPEUR.src,
    image2: CARTE_MERE.src,
  },
  {
    index: "03",
    domaine: "Sécurité",
    approche: "Audit & protection",
    desc: "Audits, sécurisation et sensibilisation pour protéger vos données et garantir votre conformité.",
    points: [
      "Audits et tests d'intrusion",
      "Sécurisation des systèmes et réseaux",
      "Sensibilisation des équipes",
      "Mise en conformité (RGPD)",
    ],
    title: "Cybersécurité",
    image: PROCESSEUR.src,
    image2: DEVELOPPEUR.src,
  },
  {
    index: "04",
    domaine: "Cloud",
    approche: "Supervision & gestion",
    desc: "Migration, supervision et gestion de vos environnements pour une infrastructure disponible et maîtrisée.",
    points: [
      "Migration vers le cloud",
      "Supervision 24/7",
      "Sauvegarde et plan de reprise",
      "Optimisation des coûts",
    ],
    title: "Infogérance & Cloud",
    image: DEFENSE.src,
    image2: FOND_BLEU.src,
  },
];

// Départ lent → accélération → ralentissement (ease-in-out) pour un rendu fluide
const IMG_TRANSITION = { duration: 0.65, ease: [0.83, 0, 0.17, 1] as const };

export default function ExpertiseGallery() {
  const container = useRef(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start start", "end end"],
  });

  // Largeur d'une fiche (en vw), responsive : 86vw sur grand écran (avec un
  // aperçu des voisines), pleine largeur sur mobile (fiches moins resserrées).
  const [panelVw, setPanelVw] = useState(86);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setPanelVw(mq.matches ? 86 : 100);
    const raf = requestAnimationFrame(apply);
    mq.addEventListener("change", apply);
    return () => {
      cancelAnimationFrame(raf);
      mq.removeEventListener("change", apply);
    };
  }, []);
  const peek = (100 - panelVw) / 2;

  // Le scroll vertical translate la piste horizontale (une fiche par écran).
  // La piste finit à 0.96 : juste ce qu'il faut de scroll « mort » pour lire la
  // dernière fiche, sans laisser un grand vide avant la section clients.
  const x = useTransform(
    scrollYProgress,
    [0, 0.96],
    ["0vw", `-${(items.length - 1) * panelVw}vw`],
  );

  // Détail plein écran. On mémorise la position/taille exacte de l'image
  // cliquée pour n'animer QUE celle-ci (une image overlay), sans toucher aux
  // autres — indépendamment de la position de scroll.
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [rect, setRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const active = openIndex !== null ? items[openIndex] : null;
  const close = () => setOpenIndex(null);
  const openImage = (i: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    setOpenIndex(i);
  };

  // Verrou du scroll + fermeture au clavier (Échap) quand le détail est ouvert.
  useEffect(() => {
    if (openIndex === null) return;
    lockScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      unlockScroll();
      window.removeEventListener("keydown", onKey);
    };
  }, [openIndex]);

  return (
    <section
      ref={container}
      style={{ height: `${items.length * 100}vh` }}
      className="relative bg-white text-zinc-900"
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        <motion.div
          style={{ x, paddingLeft: `${peek}vw`, paddingRight: `${peek}vw` }}
          className="flex h-full"
        >
          {items.map((it, i) => (
            /*
              `content-visibility: auto` : le navigateur saute entierement le rendu des
              fiches hors champ. La piste fait quatre ecrans de large et transporte huit
              photos, alors qu'une seule fiche est lue a la fois.

              Le gain depend du cadrage : sur grand ecran, `panelVw` vaut 86 et laisse
              deborder 7vw de chaque voisine — trois fiches restent donc partiellement
              visibles, une seule est sautee. SUR MOBILE, ou la fiche occupe 100vw, deux a
              trois fiches sur quatre sont sautees. C'est precisement la que ca manquait.

              `contain-intrinsic-size` est une ceinture de securite : largeur et hauteur
              sont deja imposees ici, la taille des fiches sautees ne depend donc pas de
              leur contenu. Il evite qu'une fiche s'aplatisse si ces regles changent.
            */
            <article
              key={it.index}
              style={{
                width: `${panelVw}vw`,
                contentVisibility: "auto",
                containIntrinsicSize: `${panelVw}vw 100vh`,
              }}
              className="flex h-full shrink-0 flex-col justify-center gap-6 px-4 sm:gap-8 sm:px-6"
            >
              {/* Duo d'images : la grande, cliquable (zoom plein écran), et une
                  seconde purement décorative là où se trouvait le texte. */}
              {/* gap = 2× le px de l'article, pour que l'écart entre les deux
                  images soit identique à celui entre deux fiches voisines. */}
              <div className="flex h-[42vh] w-full gap-8 sm:h-[48vh] sm:gap-12 lg:h-[52vh]">
                <button
                  type="button"
                  onClick={(e) => openImage(i, e.currentTarget)}
                  aria-label={`Voir le détail : ${it.title}`}
                  className="group relative h-full flex-1 overflow-hidden"
                >
                  {/* Le zoom au survol porte sur un calque : `next/image` en
                      `fill` gère lui-même son positionnement. */}
                  <motion.div
                    whileHover={{
                      scale: 1.05,
                      transition: { duration: 0.4, ease: "easeOut" },
                    }}
                    className={`absolute inset-0 ${
                      openIndex === i ? "opacity-0" : ""
                    }`}
                  >
                    <Image
                      src={it.image}
                      alt={it.title}
                      fill
                      sizes="(max-width: 1024px) 100vw, 60vw"
                      draggable={false}
                      className="object-cover"
                    />
                  </motion.div>
                  <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
                </button>

                <div className="pointer-events-none relative h-full w-[26%] shrink-0 overflow-hidden sm:w-[24%] lg:w-[22%]">
                  <Image
                    src={it.image2}
                    alt=""
                    aria-hidden="true"
                    fill
                    sizes="(max-width: 1024px) 30vw, 22vw"
                    draggable={false}
                    className="object-cover"
                  />
                </div>
              </div>

              {/* Texte sous les images : titre puis description en dessous */}
              <div className="flex w-full flex-col gap-3">
                <h3 className="font-quote whitespace-nowrap text-3xl leading-[1] sm:text-4xl lg:text-5xl xl:text-6xl">
                  {it.title}
                </h3>
                <p className="w-full text-sm leading-relaxed text-zinc-500 lg:whitespace-nowrap">
                  {it.desc}
                </p>
              </div>
            </article>
          ))}
        </motion.div>
      </div>

      {/* Détail plein écran : SEULE l'image cliquée s'anime, depuis sa position
          mesurée jusqu'au plein écran (et retour). Pas de fond, pas de doublon
          (l'image source de la galerie est masquée pendant l'ouverture). */}
      <AnimatePresence>
        {active && rect && (
          <motion.div
            key={openIndex}
            role="dialog"
            aria-modal="true"
            aria-label={active.title}
            onClick={close}
            className="fixed inset-0 z-[80]"
          >
            <motion.div
              initial={{
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                borderRadius: 12,
              }}
              animate={{
                top: 0,
                left: 0,
                width: window.innerWidth,
                height: window.innerHeight,
                borderRadius: 0,
              }}
              exit={{
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                borderRadius: 12,
              }}
              transition={IMG_TRANSITION}
              className="fixed overflow-hidden"
            >
              <Image
                src={active.image}
                alt=""
                aria-hidden="true"
                fill
                sizes="100vw"
                draggable={false}
                className="object-cover"
              />
            </motion.div>

            {/*
              Contenu du detail.

              SŒUR de l'image et non enfant : la boite de l'image s'anime de la vignette
              au plein ecran, un contenu place dedans serait donc compose a la taille de
              la vignette puis etire. Ici il est mis en page d'emblee au format final, et
              ne fait que paraitre.

              Il entre APRES l'atterrissage de l'image — le delai vaut 60 % de la duree du
              zoom — et sort deux fois plus vite : on attend pour lire, on n'attend pas
              pour fermer.
            */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24, transition: { duration: 0.2 } }}
              transition={{
                duration: 0.45,
                delay: IMG_TRANSITION.duration * 0.6,
                ease: "easeOut",
              }}
              className="pointer-events-none fixed inset-0 flex flex-col justify-end"
            >
              {/* Voile de lisibilite : une photo ne garantit aucun contraste sous le
                  texte. Degrade plutot qu'aplat, pour ne pas eteindre le haut de l'image. */}
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/10"
              />

              <button
                type="button"
                onClick={close}
                autoFocus
                aria-label="Fermer le détail"
                className="pointer-events-auto absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border border-white/40 text-white transition-colors duration-300 hover:bg-white hover:text-black sm:right-8 sm:top-8"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>

              {/* `stopPropagation` : le fond ferme au clic, mais selectionner une ligne
                  de texte ne doit pas faire disparaitre ce qu'on est en train de lire. */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="pointer-events-auto relative mx-auto flex max-h-[80svh] w-full max-w-5xl flex-col gap-4 overflow-y-auto px-6 pb-12 text-white sm:gap-5 sm:px-10 sm:pb-16"
              >
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.2em] text-white/70">
                  <span>{active.index}</span>
                  <span aria-hidden className="text-white/30">/</span>
                  <span>{active.domaine}</span>
                  <span aria-hidden className="text-white/30">/</span>
                  <span>{active.approche}</span>
                </p>

                <h2 className="font-quote text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
                  {active.title}
                </h2>

                <p className="max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
                  {active.desc}
                </p>

                <ul className="grid gap-x-10 gap-y-2 sm:grid-cols-2">
                  {active.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-3 text-sm text-white/90 sm:text-base"
                    >
                      <span
                        aria-hidden
                        className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-white/60"
                      />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
