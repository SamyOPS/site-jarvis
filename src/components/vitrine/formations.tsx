import Image from "next/image";

import { TRACE } from "@/components/auth/auth-styles";
import { SectionTitle } from "@/components/vitrine/section-title";
import { CARTE_MERE, DEVELOPPEUR, PROCESSEUR } from "@/features/vitrine/images";

/*
  Formations : les modules en fiches, tout le contenu visible.

  Ils etaient reveles par un « escalier » d'images epingle sur plusieurs ecrans de
  defilement, puis presentes en index : survol avec image suiveuse, detail en plein ecran
  au clic. Le contenu est le meme ; il se lit comme une page ordinaire. Images =
  PLACEHOLDERS.
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
  return (
    <section id="formations" className="bg-white px-6 py-24 text-zinc-900 sm:px-12 sm:py-32">
      <SectionTitle eyebrow="nos" title="Formations" aside={`${formations.length} modules`} />

      <div className="mt-16 grid gap-x-12 gap-y-20 sm:mt-24 lg:grid-cols-3">
        {formations.map((formation) => (
          <article key={formation.index} className="flex min-w-0 flex-col">
            <div className="group relative aspect-[4/3] overflow-hidden bg-zinc-100">
              <Image
                src={formation.image}
                alt=""
                fill
                sizes="(min-width: 1024px) 33vw, 100vw"
                draggable={false}
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none"
              />
            </div>

            <p className="mt-6 font-quote text-xl italic text-zinc-500">module {formation.index}</p>
            <h3 className="mt-1 text-[clamp(1.5rem,2.6vw,2.25rem)] font-bold uppercase leading-[0.95] tracking-tight">
              {formation.title}
            </h3>

            <p className="mt-5 flex flex-wrap gap-x-6 gap-y-1 border-y border-zinc-900/15 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">
              <span>{formation.duree}</span>
              <span>{formation.public}</span>
              <span>{formation.format}</span>
            </p>

            <p className="mt-5 leading-relaxed text-zinc-600">{formation.desc}</p>

            <p className="mt-8 font-quote text-xl italic text-zinc-700">Au programme</p>
            <ul className="mt-3 border-t border-zinc-900/15">
              {formation.programme.map((item, position) => (
                <li
                  key={item}
                  className="flex gap-4 border-b border-zinc-900/15 py-3 text-sm leading-relaxed text-zinc-700"
                >
                  <span className="mt-[3px] shrink-0 font-mono text-[10px] text-zinc-400">
                    0{position + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <a
              href={mailto(`Formation — ${formation.title}`)}
              className="group relative mt-8 inline-flex items-center gap-2 self-start text-sm font-semibold text-zinc-900"
            >
              <span>Demander ce module</span>
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
              <span aria-hidden className={TRACE} />
            </a>
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
    </section>
  );
}
