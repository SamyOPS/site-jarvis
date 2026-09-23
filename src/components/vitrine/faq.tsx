"use client";

import { Fragment, useEffect, useRef, useState } from "react";

// FAQ dans le registre du discours (composant Mission) : fond noir, colonne
// serif centrée, révélation lettre par lettre quand la section entre à l'écran.
// Volontairement sobre — pas d'image, pas de numéros, pas de gros titre : juste
// des filets fins, et une seule réponse ouverte à la fois pour que l'écran
// reste calme. Textes = PLACEHOLDERS à valider.

const INTRO = "Questions fréquentes";

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

const STEP = 4; // ms entre chaque lettre (même cadence que le discours)
const BASE = 120; // on arrive ici au scroll : pas de voile à attendre

const visibleLen = (t: string) => t.replace(/\s/g, "").length;

// Index de départ (en lettres) de chaque bloc, pour une cascade continue de
// l'accroche jusqu'à la dernière question. Calculé une fois, hors rendu.
let acc = 0;
const introStart = acc;
acc += visibleLen(INTRO);
const questions = items.map(({ q, a }) => {
  const start = acc;
  acc += visibleLen(q);
  return { q, a, start };
});

// Révélation lettre par lettre : chaque lettre monte depuis sa ligne (masque).
// Identique au discours, `start` = lettres déjà passées avant ce bloc.
function RevealText({
  text,
  shown,
  start,
}: {
  text: string;
  shown: boolean;
  start: number;
}) {
  const words = text.split(" ");
  let idx = -1;
  return (
    <span aria-label={text}>
      {words.map((word, wi) => (
        <Fragment key={wi}>
          <span className="inline-block whitespace-nowrap">
            {[...word].map((char, ci) => {
              idx += 1;
              const delay = BASE + (start + idx) * STEP;
              return (
                <span key={ci} aria-hidden className="reveal-mask-text">
                  <span
                    className={`inline-block transition-transform duration-500 ease-out ${
                      shown ? "translate-y-0" : "translate-y-[135%]"
                    }`}
                    style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
                  >
                    {char}
                  </span>
                </span>
              );
            })}
          </span>
          {wi < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </span>
  );
}

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
    <div className="border-t border-white/10 last:border-b">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="group flex w-full cursor-pointer items-baseline gap-6 py-5 text-left sm:py-6"
      >
        <span
          className={`flex-1 leading-snug transition-colors duration-300 sm:text-lg lg:text-xl 2xl:text-2xl ${
            open ? "text-white" : "text-white/80 group-hover:text-white"
          }`}
        >
          <RevealText text={q} shown={shown} start={start} />
        </span>

        {/* + qui devient − : seule la barre verticale s'escamote */}
        <span
          aria-hidden
          className="relative mt-1 h-3 w-3 shrink-0 self-center opacity-50 transition-opacity duration-300 group-hover:opacity-100"
        >
          <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white" />
          <span
            className={`absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white transition-transform duration-500 ease-out ${
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
          <p className="max-w-3xl pb-6 text-sm leading-relaxed text-white/55 sm:pb-7 sm:text-base lg:text-lg">
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
      data-nav-dark
      className="flex min-h-dvh flex-col justify-center bg-black pb-16 pt-24 text-white sm:pb-20 sm:pt-32 lg:pb-24 lg:pt-40"
    >
      {/* z-10 : le flux du footer déborde sur le bas de cette section (voir
          FooterShader) — le texte doit rester au-dessus. */}
      <div className="font-quote relative z-10 mx-auto w-full max-w-5xl px-6 sm:px-12">
        <p className="text-xl leading-snug text-white sm:text-2xl lg:text-3xl 2xl:text-4xl">
          <RevealText text={INTRO} shown={shown} start={introStart} />
        </p>

        <div className="mt-10 sm:mt-14">
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
