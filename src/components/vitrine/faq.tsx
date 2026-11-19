"use client";

import { useEffect, useRef, useState } from "react";

import { RevealWords, revealWordCount } from "@/components/vitrine/reveal-words";
import { SectionTitle } from "@/components/vitrine/section-title";

// FAQ dans le registre du discours (composant Mission) : fond blanc, colonne
// serif centrée, révélation mot par mot quand la section entre à l'écran.
// Grand titre comme les autres sections, puis une liste volontairement sobre —
// pas d'image, pas de numéros : juste des filets fins, et une seule réponse ouverte à la fois pour que l'écran
// reste calme. Textes = PLACEHOLDERS à valider.


const items = [
  {
    q: "Quels types d'entreprises accompagnez-vous ?",
    a: "Des PME comme des grands comptes, de dix à plusieurs milliers de postes. Nos équipes s'adaptent à votre organisation : un interlocuteur unique pour les structures les plus petites, une équipe dédiée sur site pour les plus grandes.",
  },
  {
    q: "En combien de temps intervenez-vous ?",
    a: "Les délais de prise en charge sont fixés au contrat et varient selon la criticité de l'incident. Le support est joignable par téléphone, par e-mail et via un portail de tickets, avec un suivi de bout en bout.",
  },
  {
    q: "Peut-on vous confier une partie seulement de notre informatique ?",
    a: "Oui. Vous pouvez nous déléguer l'intégralité de votre informatique comme un périmètre précis : le support utilisateurs, la sécurité, le cloud ou un projet applicatif. Nous intervenons aussi en renfort d'une DSI existante.",
  },
  {
    q: "Intervenez-vous sur site ou à distance ?",
    a: "Les deux. La majorité des demandes se traite à distance, mais nous assurons également une présence sur site, ponctuelle ou permanente, selon vos besoins et vos implantations.",
  },
  {
    q: "Comment démarre une collaboration ?",
    a: "Par un audit de votre parc et de vos usages, sans engagement. Nous en tirons un plan d'action chiffré et priorisé, puis une reprise progressive du périmètre pour ne rien interrompre côté utilisateurs.",
  },
  {
    q: "Vos contrats sont-ils engageants ?",
    a: "Nos contrats d'infogérance sont annuels et reconductibles, avec un préavis clair. Les prestations ponctuelles et les projets se font au forfait ou en régie, sans engagement de durée.",
  },
];

/*
 * Cascade MOT PAR MOT (voir `RevealWords`). Lettre par lettre, les ~250 lettres des
 * questions demarraient leur transition dans la meme image, a l'entree de la section :
 * 27 a 84 ms de recalcul de style en plein defilement. Par mot, ~45 elements, et la
 * cascade tient en ~1 s au lieu de ~1,8 s.
 */
const STEP = 10; // ms entre deux mots
const BASE = 120; // on arrive ici au scroll : pas de voile à attendre

// Index de départ (en mots) de chaque bloc, pour une cascade continue de
// l'accroche jusqu'à la dernière question. Calculé une fois, hors rendu.
let acc = 0;
const questions = items.map(({ q, a }) => {
  const start = acc;
  acc += revealWordCount(q);
  return { q, a, start };
});

function Item({
  q,
  a,
  start,
  shown,
  open,
  onToggle,
}: {
  q: string;
  a: string;
  start: number;
  shown: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-t border-zinc-900/15 last:border-b">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="group flex w-full cursor-pointer items-baseline gap-6 py-5 text-left sm:py-6"
      >
        <span
          className={`flex-1 leading-snug transition-colors duration-300 sm:text-lg lg:text-xl 2xl:text-2xl ${
            open ? "text-zinc-900" : "text-zinc-900/70 group-hover:text-zinc-900"
          }`}
        >
          <RevealWords text={q} shown={shown} start={start} base={BASE} step={STEP} />
        </span>

        {/* + qui devient − : seule la barre verticale s'escamote */}
        <span
          aria-hidden
          className="relative mt-1 h-3 w-3 shrink-0 self-center opacity-50 transition-opacity duration-300 group-hover:opacity-100"
        >
          <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-zinc-900" />
          <span
            className={`absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-zinc-900 transition-transform duration-500 ease-out ${
              open ? "scale-y-0" : "scale-y-100"
            }`}
          />
        </span>
      </button>

      {/* Dépliage en CSS pur (0fr → 1fr), comme le reste de la section : pas
          d'animation JS pour une simple hauteur. */}
      <div
        className={`grid transition-all duration-500 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="max-w-3xl pb-6 text-sm leading-relaxed text-zinc-500 sm:pb-7 sm:text-base lg:text-lg">
            {a}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Faq() {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  // Révèle le texte quand la section entre dans le viewport (au scroll).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      id="faq"
      className="relative bg-white px-6 py-24 text-zinc-900 sm:px-12 sm:py-32"
    >
      {/* Grand titre, comme les autres sections, HORS du bloc serif des questions :
          il en heriterait sinon la police. */}
      <SectionTitle eyebrow="les" title="Questions fréquentes" />

      {/* z-10 : garde le texte au-dessus du flux anime du pied de page, si
          celui-ci venait a deborder sur la section (voir FooterShader). */}
      <div className="font-quote relative z-10 mx-auto mt-16 w-full max-w-5xl sm:mt-24">
        <div>
          {questions.map((it, i) => (
            <Item
              key={it.q}
              q={it.q}
              a={it.a}
              start={it.start}
              shown={shown}
              open={open === i}
              onToggle={() => setOpen((cur) => (cur === i ? null : i))}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
