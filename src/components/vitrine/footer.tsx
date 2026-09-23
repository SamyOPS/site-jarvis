"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { usePageTransition } from "@/components/vitrine/page-transition";
import {
  infoLinks,
  isInternalExit,
  leavesVitrine,
  mainLinks,
  memberLinks,
} from "@/features/vitrine/nav";
import { armPageReveal } from "@/lib/page-reveal";
import FooterShader from "@/components/vitrine/footer-shader";
import { VITRINE_FONT_VARS } from "@/features/vitrine/fonts";

// Pied de page. Porte l'ancre #contact, cible du bouton « Contactez nous » de
// la barre de navigation. Même registre que les sections sombres : noir, filets
// à white/10, serif italique pour l'accroche, capitales pour les libellés.

// TODO : adresse de contact à confirmer.
const CONTACT_EMAIL = "contact@jarvis-connect.fr";

// Identité société : reprise des mentions légales (app/mentions-legales).
const ADDRESS_1 = "4 Avenue de la Libération";
const ADDRESS_2 = "60160 Montataire, France";

/**
 * Deux encres pour un même pied de page.
 *
 * `dark` clôt /decouvrir, dont les dernières sections (image pleine page, FAQ)
 * sont noires : le footer y prolonge le fond. `light` sert partout ailleurs —
 * offres d'emploi et pages légales, composées sur blanc — où un pavé noir
 * trancherait au lieu de conclure.
 *
 * Le ton clair se fond dans la page : meme blanc, et l'encre #1c1a17 du panneau
 * du menu. Pas de bandeau teinte pour marquer la separation — c'est le flux du
 * shader qui fait la transition, en emergeant du blanc.
 */
type FooterVariant = "dark" | "light";

const PALETTES: Record<
  FooterVariant,
  {
    shell: string;
    quote: string;
    email: string;
    rule: string;
    address: string;
    label: string;
    link: string;
    wordmark: string;
  }
> = {
  dark: {
    shell: "bg-black text-white",
    quote: "text-white/55",
    email: "text-white",
    rule: "bg-white",
    address: "text-white/45",
    label: "text-white/40",
    link: "text-white/70 hover:text-white",
    wordmark: "text-white",
  },
  light: {
    shell: "bg-white text-[#1c1a17]",
    quote: "text-[#1c1a17]/55",
    email: "text-[#1c1a17]",
    rule: "bg-[#1c1a17]",
    address: "text-[#1c1a17]/50",
    label: "text-[#1c1a17]/45",
    link: "text-[#1c1a17]/70 hover:text-[#1c1a17]",
    wordmark: "text-[#1c1a17]",
  },
};

// Mot-symbole révélé lettre par lettre : chaque lettre monte depuis sa ligne
// derrière un masque, en cascade. Même effet que le titre du menu et que le
// « VI » du hero, ici déclenché par l'entrée de la section dans le viewport.
const WORDMARK = "Jarvis Connect";
const STEP = 45; // ms entre deux lettres

function Wordmark({ className }: { className: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [shown, setShown] = useState(false);

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

  // Le décalage se compte sur les lettres visibles : l'espace entre les deux
  // mots ne doit pas créer de trou dans la cascade.
  let idx = -1;

  return (
    <p
      ref={ref}
      aria-label={WORDMARK}
      className={`-mx-6 mt-24 whitespace-nowrap text-center font-sans text-[10vw] font-bold uppercase leading-none tracking-tight sm:-mx-12 sm:mt-32 ${className}`}
    >
      {[...WORDMARK].map((char, i) => {
        if (char === " ") return " ";
        idx += 1;
        return (
          <span key={i} aria-hidden className="reveal-mask">
            <span
              className={`inline-block transition-transform duration-700 ease-out ${
                shown ? "translate-y-0" : "translate-y-full"
              }`}
              style={{ transitionDelay: shown ? `${idx * STEP}ms` : "0ms" }}
            >
              {char}
            </span>
          </span>
        );
      })}
    </p>
  );
}

export default function Footer({
  variant = "dark",
}: {
  variant?: FooterVariant;
}) {
  const palette = PALETTES[variant];
  const pathname = usePathname();
  const { navigate, leave } = usePageTransition();

  // Même comportement que les liens du menu : ancre de la page courante →
  // défilement doux ; autre page → voile de transition (et cible mémorisée
  // pour que ScrollToTarget fasse défiler à l'arrivée).
  const onNav = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    const [rawPath, hash] = href.split("#");
    const path = rawPath || pathname; // "#foo" seul → page courante
    const anchor = hash ? `#${hash}` : "";

    if (path === pathname) {
      if (anchor) {
        document.querySelector(anchor)?.scrollIntoView({ behavior: "smooth" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    if (anchor) {
      try {
        sessionStorage.setItem("jc:scrollTarget", anchor);
      } catch {
        /* sessionStorage indisponible : on ignore */
      }
    }
    navigate(path);
  };

  // Sortie de la vitrine : on couvre d'abord d'un voile noir, puis on part —
  // même fondu que les changements de page internes. Les raccourcis d'ouverture
  // en nouvel onglet (ctrl/cmd/⇧ + clic, clic milieu) restent au navigateur.
  const onExternal = (e: React.MouseEvent, href: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();

    // Déjà sur place : le pied de page est monté sur les offres d'emploi, où
    // « Offres d'emploi » pointe vers la page courante. Recharger serait absurde
    // — on remonte, comme le fait `onNav` dans le même cas.
    if (href === pathname) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    leave(() => {
      // Le fondu ne s'arrete pas au depart : la page d'arrivee reprend le voile
      // et le dissipe. Uniquement vers cette application — un drapeau pose avant
      // un depart vers un site tiers resterait en attente et se declencherait au
      // retour, sur une page qui n'a rien demande.
      if (isInternalExit(href)) armPageReveal();
      window.location.href = href;
    });
  };

  const linkClass = `text-sm font-medium uppercase tracking-tight transition-colors ${palette.link}`;

  const column = (label: string, links: typeof mainLinks) => (
    <div className="flex flex-col gap-3">
      <span
        className={`text-xs font-semibold uppercase tracking-[0.2em] ${palette.label}`}
      >
        {label}
      </span>
      {links.map((link) => {
        // Quitte la vitrine : voile puis départ. mailto:/tel: : lien nu (rien à
        // couvrir). Interne à la vitrine : <Link> + transition de page.
        if (leavesVitrine(link.href)) {
          return (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => onExternal(e, link.href)}
              className={linkClass}
            >
              {link.label}
            </a>
          );
        }
        if (/^(mailto:|tel:)/.test(link.href)) {
          return (
            <a key={link.href} href={link.href} className={linkClass}>
              {link.label}
            </a>
          );
        }
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={(e) => onNav(e, link.href)}
            className={linkClass}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );

  return (
    /*
      Le pied de page emporte la typographie de la vitrine avec lui. Il est aussi
      monte sur les offres d'emploi, hors du groupe (vitrine) : la, ni
      `--font-instrument` ni `--font-geist-sans` n'existent, et l'accroche
      « parlons de » retomberait sur Georgia pendant que le mot-symbole passerait
      en Inter. Redondant sur la vitrine, ou le scope les declare deja — mais
      redondant ne coute rien, et absent se voit.
    */
    <footer
      id="contact"
      /*
        `data-nav-dark` dit a la barre de navigation de passer en blanc quand
        elle survole cette section. Au ton clair, elle y deviendrait invisible :
        l'attribut ne suit donc que la variante sombre.
      */
      data-nav-dark={variant === "dark" ? "" : undefined}
      className={`${VITRINE_FONT_VARS} relative ${palette.shell}`}
    >
      {/* Flux animé en arrière-plan (WebGL) */}
      <FooterShader variant={variant} />

      <div className="relative w-full px-6 pb-10 pt-28 sm:px-12 sm:pb-14 sm:pt-36 lg:pb-16 lg:pt-48">
        <div className="flex flex-col gap-16 lg:flex-row lg:justify-between lg:gap-24">
          {/* Accroche + contact */}
          <div className="max-w-md">
            <p
              className={`font-quote ml-[0.1em] text-3xl italic leading-none sm:text-4xl ${palette.quote}`}
            >
              parlons de
            </p>
            <p className="mt-1 text-[clamp(2.25rem,6vw,4.5rem)] font-bold uppercase leading-[0.95] tracking-tight">
              votre projet
            </p>

            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className={`group relative mt-6 inline-flex items-baseline gap-2 text-base sm:text-lg ${palette.email}`}
            >
              {CONTACT_EMAIL}
              <span
                aria-hidden
                className="inline-block transition-transform duration-300 group-hover:translate-x-1"
              >
                →
              </span>
              <span
                aria-hidden
                className={`absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 transition-transform duration-500 ease-out group-hover:scale-x-100 ${palette.rule}`}
              />
            </a>

            <p className={`mt-8 text-sm leading-relaxed ${palette.address}`}>
              {ADDRESS_1}
              <br />
              {ADDRESS_2}
            </p>
          </div>

          {/* Colonnes de liens */}
          <div className="flex flex-col gap-12 sm:flex-row sm:gap-16 lg:gap-20">
            {column("Navigation", mainLinks)}

            {column("Informations", infoLinks)}

            {column("Membre de Jarvis", memberLinks)}
          </div>
        </div>

        {/* Mot-symbole en bas de page, comme sous le hero de l'accueil : mêmes
            réglages typographiques (10vw, capitales, tracking serré), à l'encre
            de la variante, révélé lettre par lettre à l'arrivée sur la
            section. */}
        <Wordmark className={palette.wordmark} />
      </div>
    </footer>
  );
}
