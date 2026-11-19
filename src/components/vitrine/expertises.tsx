"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { ImageDetail, useImageDetail } from "@/components/vitrine/image-detail";
import { SectionTitle } from "@/components/vitrine/section-title";
import { DEFENSE, DEVELOPPEUR, PROCESSEUR, TECHNICIENS } from "@/features/vitrine/images";

/*
  Expertises : une rangee horizontale de fiches (image, titre, phrase d'accroche), que l'on
  fait defiler avec deux boutons (precedent / suivant), au doigt ou au geste horizontal du
  pave tactile. Le detail — domaine, approche, points — s'ouvre au clic sur l'image, en
  plein ecran, comme dans l'ancienne galerie.

  Rien n'est pilote par la molette verticale : la section defile avec la page, comme les
  autres. C'est ce qui la distingue de l'ancienne galerie, epinglee sur plusieurs ecrans et
  entrainee par le defilement de la page. Images = PLACEHOLDERS.
*/
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
  },
];

/** Marge de tolerance (px) pour dire qu'on est en butee, malgre les arrondis. */
const EDGE_TOLERANCE = 4;

const NAV_BUTTON =
  "flex h-12 w-12 items-center justify-center rounded-full border border-zinc-900 text-zinc-900 transition-colors duration-300 hover:bg-zinc-900 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:pointer-events-none disabled:opacity-25";

export default function Expertises() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  // Detail plein ecran de la fiche dont on a clique l'image (voir `ImageDetail`).
  const { openIndex, rect, open: openImage, close } = useImageDetail();
  const active = openIndex !== null ? items[openIndex] : null;

  // Boutons grises en butee : relu a chaque defilement de la rangee et a chaque
  // changement de taille (la largeur des fiches suit celle de l'ecran).
  const updateEdges = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setCanPrev(track.scrollLeft > EDGE_TOLERANCE);
    setCanNext(track.scrollLeft + track.clientWidth < track.scrollWidth - EDGE_TOLERANCE);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    updateEdges();
    track.addEventListener("scroll", updateEdges, { passive: true });
    const resize = new ResizeObserver(updateEdges);
    resize.observe(track);
    return () => {
      track.removeEventListener("scroll", updateEdges);
      resize.disconnect();
    };
  }, [updateEdges]);

  /*
    Un cran = la fiche suivante (ou precedente) alignee sur la marge gauche.

    On vise la POSITION de la fiche, et non « une largeur de fiche plus loin » : en fin de
    rangee, la derniere position n'est alignee sur aucune fiche (la rangee bute avant). En
    reculant d'une largeur depuis la, on tombait entre deux fiches, et l'aimantation
    ramenait au debut au lieu de la fiche d'avant.
  */
  const scrollByCard = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const trackLeft = track.getBoundingClientRect().left;
    const padding = parseFloat(getComputedStyle(track).scrollPaddingLeft) || 0;
    const positions = Array.from(track.children).map(
      (card) => card.getBoundingClientRect().left - trackLeft + track.scrollLeft - padding,
    );
    const max = track.scrollWidth - track.clientWidth;
    const current = track.scrollLeft;
    const target =
      direction === 1
        ? (positions.find((position) => position > current + EDGE_TOLERANCE) ?? max)
        : ([...positions].reverse().find((position) => position < current - EDGE_TOLERANCE) ?? 0);
    track.scrollTo({ left: Math.min(max, Math.max(0, target)), behavior: "smooth" });
  };

  return (
    <section id="expertises" className="bg-white py-24 text-zinc-900 sm:py-32">
      <div className="flex flex-wrap items-end justify-between gap-6 px-6 sm:px-12">
        <SectionTitle eyebrow="nos" title="Expertises" />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            disabled={!canPrev}
            aria-label="Expertise précédente"
            aria-controls="expertises-track"
            className={NAV_BUTTON}
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            disabled={!canNext}
            aria-label="Expertise suivante"
            aria-controls="expertises-track"
            className={NAV_BUTTON}
          >
            <ArrowRight className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>

      {/*
        La rangee court jusqu'au bord droit de l'ecran (la fiche suivante depasse : on voit
        qu'il y a une suite) ; `scroll-pl` / `pl` gardent l'alignement a gauche sur la
        marge de la page. Barre de defilement masquee : les boutons en tiennent lieu.
      */}
      <div
        id="expertises-track"
        ref={trackRef}
        role="region"
        aria-label="Nos expertises"
        tabIndex={0}
        className="mt-16 flex snap-x snap-mandatory gap-8 overflow-x-auto scroll-smooth px-6 pb-2 scroll-pl-6 focus-visible:outline-none sm:mt-24 sm:gap-12 sm:px-12 sm:scroll-pl-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, index) => (
          <article
            key={item.index}
            className="flex w-[85%] shrink-0 snap-start flex-col sm:w-[60%] lg:w-[40%] xl:w-[36%]"
          >
            <button
              type="button"
              onClick={(event) => openImage(index, event.currentTarget)}
              aria-label={`Voir le détail : ${item.title}`}
              className="group relative block aspect-[4/3] w-full overflow-hidden bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
            >
              {/* L'image source s'efface pendant l'ouverture : seule sa copie s'anime. */}
              <div
                className={`absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none ${
                  openIndex === index ? "opacity-0" : ""
                }`}
              >
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  sizes="(min-width: 1280px) 36vw, (min-width: 1024px) 40vw, (min-width: 640px) 60vw, 85vw"
                  draggable={false}
                  className="object-cover"
                />
              </div>
              <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
            </button>

            <h3 className="mt-6 font-quote text-4xl leading-[1.05] sm:text-5xl">{item.title}</h3>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-500">{item.desc}</p>
          </article>
        ))}
      </div>

      <ImageDetail
        detail={active && { key: active.index, image: active.image, label: active.title }}
        rect={rect}
        onClose={close}
      >
        {active && (
          <>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.2em] text-white/70">
              <span>{active.index}</span>
              <span aria-hidden className="text-white/30">/</span>
              <span>{active.domaine}</span>
              <span aria-hidden className="text-white/30">/</span>
              <span>{active.approche}</span>
            </p>

            <h2 className="font-quote text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">{active.title}</h2>

            <p className="max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">{active.desc}</p>

            <ul className="grid gap-x-10 gap-y-2 sm:grid-cols-2">
              {active.points.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-white/90 sm:text-base">
                  <span aria-hidden className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-white/60" />
                  {point}
                </li>
              ))}
            </ul>
          </>
        )}
      </ImageDetail>
    </section>
  );
}
