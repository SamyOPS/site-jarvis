"use client";

import Image from "next/image";
import { Fragment, useEffect, useRef, useState } from "react";

// Paragraphes de la section mission (le premier sert d'accroche).
const paragraphs = [
  "Chez Jarvis Connect, la technologie n’a de valeur que lorsqu’elle rapproche les idées, les talents et les ambitions.",
  "ESN engagée, nous accompagnons votre transformation numérique avec des solutions fiables, agiles et humaines, au service de vos projets et de votre croissance.",
];

const CLOSING = "Bienvenue chez Jarvis Connect.";
const STEP = 4; // ms entre chaque lettre (cascade, comme les textes du menu)
// Délai de départ : on laisse le voile de transition se dissiper avant que la
// cascade démarre, pour qu'elle soit bien visible à l'arrivée sur la page.
const BASE = 650;

// Compte les caractères hors espaces (base de délai de la lettre suivante).
const visibleLen = (t: string) => t.replace(/\s/g, "").length;

// Index de départ (en lettres) de chaque bloc, pour une cascade continue sur
// tout le discours. Calculé une fois, hors rendu (les textes sont constants).
let acc = 0;
const blocks = paragraphs.map((text) => {
  const start = acc;
  acc += visibleLen(text);
  return { text, start };
});
const closingStart = acc;
acc += visibleLen(CLOSING);
const signatureDelay = BASE + acc * STEP + 150;

// Révélation lettre par lettre : chaque lettre monte depuis sa ligne (masque),
// en cascade. Même effet que les catégories du menu, piloté par `shown`.
// `start` = nombre de lettres déjà passées avant ce bloc (cascade continue).
function RevealText({
  text,
  shown,
  start,
  className,
}: {
  text: string;
  shown: boolean;
  start: number;
  className?: string;
}) {
  const words = text.split(" ");
  let idx = -1;
  return (
    <span aria-label={text} className={className}>
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

export default function Mission() {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

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
      data-nav-dark
      className="flex min-h-dvh flex-col justify-center bg-black pb-16 pt-24 text-white sm:pb-20 sm:pt-32 lg:pb-24 lg:pt-40 2xl:pt-48"
    >
      <div className="font-quote mx-auto w-full max-w-3xl px-6 sm:px-12">
        {blocks.map(({ text, start }, i) => (
          <p
            key={i}
            className={
              i === 0
                ? "text-xl leading-snug text-white sm:text-2xl lg:text-3xl 2xl:text-4xl"
                : "mt-4 text-base leading-relaxed text-white/70 sm:mt-6 sm:text-lg lg:text-xl 2xl:text-2xl"
            }
          >
            <RevealText text={text} shown={shown} start={start} />
          </p>
        ))}

        <p className="mt-6 text-xl tracking-tight text-white sm:mt-10 sm:text-2xl lg:text-3xl 2xl:text-4xl">
          <RevealText text={CLOSING} shown={shown} start={closingStart} />
        </p>

        {/* Signature manuscrite : l'image est noire, on l'inverse en blanc
            pour la rendre visible sur le panneau noir. Elle apparaît en fondu
            une fois le texte révélé. */}
        <Image
          src="/Image/signature.png"
          alt="Signature"
          width={2508}
          height={627}
          className={`mt-6 ml-auto block h-auto w-48 -rotate-[12deg] invert transition-all duration-700 ease-out sm:mt-8 sm:w-64 lg:w-80 2xl:w-96 ${
            shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
          style={{ transitionDelay: shown ? `${signatureDelay}ms` : "0ms" }}
        />
      </div>
    </section>
  );
}
