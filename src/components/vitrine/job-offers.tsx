"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";

import { SectionTitle } from "@/components/vitrine/section-title";
import { CARTE_MERE } from "@/features/vitrine/images";
import { JOBS_HREF } from "@/features/vitrine/nav";
import { useVitrineExit } from "@/features/vitrine/use-vitrine-exit";

/**
 * Bandeau « nos Offres d'emploi » : photo sombre en fond, titre et lien vers la page des
 * offres par-dessus. Seule section de l'accueil qui n'est pas sur fond blanc — la photo en
 * fond est voulue. `data-nav-dark` passe la barre du haut en blanc au-dessus d'elle.
 *
 * `id="offres"` garde vivante l'ancienne adresse /decouvrir#offres (redirigee vers
 * l'accueil). Le lien sort de la vitrine — /offres a son propre layout — d'ou
 * `useVitrineExit` : voile noir, puis navigation de document.
 */
export default function JobOffers() {
  const exitVitrine = useVitrineExit();

  return (
    <section
      id="offres"
      data-nav-dark
      className="relative flex min-h-[80svh] items-center overflow-hidden bg-black px-6 py-24 sm:px-12 sm:py-32"
    >
      <Image
        src={CARTE_MERE.src}
        alt=""
        fill
        sizes="100vw"
        draggable={false}
        className="object-cover brightness-[0.55]"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center">
        <div className="flex flex-col items-start">
          <SectionTitle eyebrow="nos" title="Offres d'emploi" tone="dark" />
          <a
            href={JOBS_HREF}
            onClick={(event) => exitVitrine(event, JOBS_HREF)}
            className="group relative mr-[0.1em] mt-3 inline-flex items-center gap-[0.35em] self-end font-quote text-[clamp(1.1rem,3.5vw,2.5rem)] italic leading-none text-white/90 transition-colors duration-300 hover:text-white"
          >
            Voir les offres
            <ArrowRight
              aria-hidden
              className="h-[0.62em] w-[0.62em] shrink-0 transition-transform duration-300 group-hover:translate-x-[0.15em]"
            />
            <span
              aria-hidden
              className="absolute -bottom-1 left-0 h-[2px] w-full origin-left scale-x-0 bg-white transition-transform duration-500 ease-out group-hover:scale-x-100"
            />
          </a>
        </div>
      </div>
    </section>
  );
}
