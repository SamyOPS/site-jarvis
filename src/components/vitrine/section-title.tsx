"use client";

import { Fragment, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/*
  Titre de section de la vitrine : petit mot en serif italique (« nos »), grand titre en
  capitales, et parfois une mention a droite (« 3 modules »). C'est le registre des
  anciennes sections pleine page (zoom des expertises, escalier des formations, mosaique
  des offres), dont il garde les tailles.

  Les lettres montent depuis leur ligne, derriere un masque, quand le titre entre a
  l'ecran — une fois, au TEMPS et non a la position du defilement : la page defile
  normalement, rien n'y est epingle ni pilote par la molette.
*/

const LETTER_STEP_MS = 35;
const LETTER_BASE_MS = 120;

export function SectionTitle({
  eyebrow,
  title,
  aside,
  tone = "light",
  className,
}: {
  eyebrow?: string;
  title: string;
  /** Mention en serif italique, alignee a droite sous le titre. */
  aside?: string;
  /** `light` : encre noire sur fond clair ; `dark` : encre blanche sur fond sombre. */
  tone?: "light" | "dark";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const rise = (delayMs: number) => ({
    className: cn(
      "inline-block transition-transform duration-600 ease-out motion-reduce:transition-none",
      shown ? "translate-y-0" : "translate-y-[110%]",
    ),
    style: { transitionDelay: shown ? `${delayMs}ms` : "0ms" },
  });

  const soft = tone === "dark" ? "text-white/90" : "text-zinc-900";
  const words = title.split(" ");
  let letter = -1;
  const lettersEnd = LETTER_BASE_MS + title.replace(/\s/g, "").length * LETTER_STEP_MS;

  return (
    <div ref={ref} className={cn("inline-flex flex-col items-start", className)}>
      {eyebrow ? (
        <span
          aria-hidden
          className={cn(
            "reveal-mask mb-1 ml-[0.1em] px-[0.12em] font-quote text-[clamp(1.1rem,3.5vw,2.5rem)] italic leading-none",
            soft,
          )}
        >
          <span {...rise(0)}>{eyebrow}</span>
        </span>
      ) : null}

      <h2
        aria-label={eyebrow ? `${eyebrow} ${title}` : title}
        className={cn(
          "text-[clamp(2.5rem,8vw,7rem)] font-bold uppercase leading-[0.95] tracking-tight",
          tone === "dark" ? "text-white" : "text-zinc-900",
        )}
      >
        {words.map((word, wordIndex) => (
          <Fragment key={wordIndex}>
            <span aria-hidden className="inline-block whitespace-nowrap">
              {[...word].map((char, charIndex) => {
                letter += 1;
                return (
                  <span key={charIndex} className="reveal-mask">
                    <span {...rise(LETTER_BASE_MS + letter * LETTER_STEP_MS)}>{char}</span>
                  </span>
                );
              })}
            </span>
            {wordIndex < words.length - 1 ? " " : null}
          </Fragment>
        ))}
      </h2>

      {aside ? (
        <span
          aria-hidden
          className={cn(
            "reveal-mask mr-[0.1em] mt-1 self-end px-[0.12em] font-quote text-[clamp(1.1rem,3.5vw,2.5rem)] italic leading-none",
            soft,
          )}
        >
          <span {...rise(lettersEnd)}>{aside}</span>
        </span>
      ) : null}
    </div>
  );
}
