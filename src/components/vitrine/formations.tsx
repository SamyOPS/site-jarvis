"use client";

import Image from "next/image";

import { TRACE } from "@/components/auth/auth-styles";
import { ImageDetail, useImageDetail } from "@/components/vitrine/image-detail";
import { SectionTitle } from "@/components/vitrine/section-title";
import { CARTE_MERE, DEVELOPPEUR, PROCESSEUR } from "@/features/vitrine/images";

/*
  Formations : une fiche par module (image, numero, titre, duree). Le detail — public,
  format, description, programme, demande par e-mail — s'ouvre au clic sur l'image, en
  plein ecran, comme pour les expertises.

  Les modules etaient reveles par un « escalier » d'images epingle sur plusieurs ecrans de
  defilement, puis presentes en index. Images = PLACEHOLDERS.
*/

const CONTACT_EMAIL = "am@jarvis-connect.fr";

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

const formations: Formation[] = [
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

const mailto = (subject: string) => `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;

export default function Formations() {
  // Detail plein ecran du module dont on a clique l'image (voir `ImageDetail`).
  const { openIndex, rect, open, close } = useImageDetail();
  const active = openIndex !== null ? formations[openIndex] : null;

  return (
    <section id="formations" className="bg-white px-6 py-24 text-zinc-900 sm:px-12 sm:py-32">
      <SectionTitle eyebrow="nos" title="Formations" aside={`${formations.length} modules`} />

      <div className="mt-16 grid gap-x-12 gap-y-16 sm:mt-24 lg:grid-cols-3">
        {formations.map((formation, index) => (
          <article key={formation.index} className="flex min-w-0 flex-col">
            <button
              type="button"
              onClick={(event) => open(index, event.currentTarget)}
              aria-label={`Voir le détail : ${formation.title}`}
              className="group relative block aspect-[4/3] w-full overflow-hidden bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
            >
              {/* L'image source s'efface pendant l'ouverture : seule sa copie s'anime. */}
              <div
                className={`absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none ${
                  openIndex === index ? "opacity-0" : ""
                }`}
              >
                <Image
                  src={formation.image}
                  alt={formation.title}
                  fill
                  sizes="(min-width: 1024px) 33vw, 100vw"
                  draggable={false}
                  className="object-cover"
                />
              </div>
              <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
            </button>

            <p className="mt-6 font-quote text-xl italic text-zinc-500">module {formation.index}</p>
            <h3 className="mt-1 text-[clamp(1.5rem,2.6vw,2.25rem)] font-bold uppercase leading-[0.95] tracking-tight">
              {formation.title}
            </h3>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">
              {formation.duree} · {formation.format}
            </p>
          </article>
        ))}
      </div>

      {/* Appel de section : jeu serif italique / capitales, filet qui se deploie au survol. */}
      <div className="mt-20 flex justify-center sm:mt-28">
        <a href={mailto("Formations")} className="group relative inline-flex items-baseline gap-2 sm:gap-3">
          <span className="font-quote text-[clamp(1.25rem,2.5vw,2rem)] italic leading-none text-zinc-500 transition-colors duration-300 group-hover:text-zinc-900">
            nous
          </span>
          <span className="text-[clamp(1rem,2vw,1.6rem)] font-bold uppercase leading-none tracking-tight text-zinc-900">
            contacter
          </span>
          <span
            aria-hidden
            className="text-[clamp(1rem,2vw,1.6rem)] leading-none text-zinc-900 transition-transform duration-300 group-hover:translate-x-1.5"
          >
            →
          </span>
          <span
            aria-hidden
            className="absolute -bottom-2 left-0 h-px w-full origin-left scale-x-0 bg-zinc-900 transition-transform duration-500 ease-out group-hover:scale-x-100"
          />
        </a>
      </div>

      <ImageDetail
        detail={active && { key: active.index, image: active.image, label: active.title }}
        rect={rect}
        onClose={close}
      >
        {active && (
          <>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.2em] text-white/70">
              <span>module {active.index}</span>
              <span aria-hidden className="text-white/30">/</span>
              <span>{active.duree}</span>
              <span aria-hidden className="text-white/30">/</span>
              <span>{active.public}</span>
              <span aria-hidden className="text-white/30">/</span>
              <span>{active.format}</span>
            </p>

            <h2 className="text-[clamp(2rem,5vw,4rem)] font-bold uppercase leading-[0.95] tracking-tight">
              {active.title}
            </h2>

            <p className="max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">{active.desc}</p>

            <div>
              <p className="font-quote text-xl italic text-white/70 sm:text-2xl">Au programme</p>
              <ul className="mt-3 grid gap-x-10 gap-y-2 sm:grid-cols-2">
                {active.programme.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-white/90 sm:text-base">
                    <span aria-hidden className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-white/60" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <a
              href={mailto(`Formation — ${active.title}`)}
              className="group relative mt-2 inline-flex items-center gap-2 self-start text-sm font-semibold text-white sm:text-base"
            >
              <span>Demander ce module</span>
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
              <span aria-hidden className={TRACE} />
            </a>
          </>
        )}
      </ImageDetail>
    </section>
  );
}
