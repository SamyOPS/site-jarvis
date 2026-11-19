"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { RevealWords, revealWordCount } from "@/components/vitrine/reveal-words";

// Paragraphes de la section mission (le premier sert d'accroche).
const paragraphs = [
  "Chez Jarvis Connect, la technologie n’a de valeur que lorsqu’elle rapproche les idées, les talents et les ambitions.",
  "ESN engagée, nous accompagnons votre transformation numérique avec des solutions fiables, agiles et humaines, au service de vos projets et de votre croissance.",
];

const CLOSING = "Bienvenue chez Jarvis Connect.";
/*
 * Cascade MOT PAR MOT (voir `RevealWords`) : ~45 mots au lieu de ~260 lettres.
 *
 * Elle durait ~2,2 s (650 ms d'attente puis 4 ms par lettre) ; elle tient maintenant en
 * ~1,3 s. `BASE` attend que le voile d'une navigation interne se soit leve (~60 ms de
 * battement, puis 350 ms de fondu, cf. PageTransition) : la vague demarre a sa fin.
 */
const STEP = 10; // ms entre deux mots
const BASE = 380;

// Index de départ (en mots) de chaque bloc, pour une cascade continue sur tout le
// discours. Calculé une fois, hors rendu (les textes sont constants).
let acc = 0;
const blocks = paragraphs.map((text) => {
  const start = acc;
  acc += revealWordCount(text);
  return { text, start };
});
const closingStart = acc;
acc += revealWordCount(CLOSING);
const signatureDelay = BASE + acc * STEP + 150;

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
      className="flex min-h-dvh flex-col justify-center bg-white pb-16 pt-24 text-zinc-900 sm:pb-20 sm:pt-32 lg:pb-24 lg:pt-40 2xl:pt-48"
    >
      <div className="font-quote mx-auto w-full max-w-3xl px-6 sm:px-12">
        {blocks.map(({ text, start }, i) => (
          <p
            key={i}
            className={
              i === 0
                ? "text-xl leading-snug text-zinc-900 sm:text-2xl lg:text-3xl 2xl:text-4xl"
                : "mt-4 text-base leading-relaxed text-zinc-500 sm:mt-6 sm:text-lg lg:text-xl 2xl:text-2xl"
            }
          >
            <RevealWords text={text} shown={shown} start={start} base={BASE} step={STEP} />
          </p>
        ))}

        <p className="mt-6 text-xl tracking-tight text-zinc-900 sm:mt-10 sm:text-2xl lg:text-3xl 2xl:text-4xl">
          <RevealWords text={CLOSING} shown={shown} start={closingStart} base={BASE} step={STEP} />
        </p>

        {/* Signature manuscrite, a l'encre noire sur le fond blanc. Elle
            apparaît en fondu une fois le texte révélé.
            `signature-noir.png` et non `signature.png` : l'original a un fond blanc
            OPAQUE, qui, compresse puis tourne de 12°, dessinait un rectangle grise sur
            la page. La copie est derivee de l'original (encre noire, fond transparent). */}
        <Image
          src="/Image/signature-noir.png"
          alt="Signature"
          width={1000}
          height={250}
          className={`mt-6 ml-auto block h-auto w-48 -rotate-[12deg] transition-all duration-500 ease-out sm:mt-8 sm:w-64 lg:w-80 2xl:w-96 ${
            shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
          style={{ transitionDelay: shown ? `${signatureDelay}ms` : "0ms" }}
        />
      </div>
    </section>
  );
}
