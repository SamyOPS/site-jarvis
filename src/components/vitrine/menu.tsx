"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { usePageTransition } from "@/components/vitrine/page-transition";
import { lockScroll, unlockScroll } from "@/features/vitrine/scroll-lock";
import {
  AUTH_HREF,
  infoLinks,
  isInternalExit,
  JOBS_HREF,
  mainLinks,
} from "@/features/vitrine/nav";
import { VITRINE_FONT_VARS } from "@/features/vitrine/fonts";
import { armPageReveal } from "@/lib/page-reveal";

// Révélation masquée lettre par lettre, pilotée par l'ouverture du panneau.
// Les mots restent insécables (pas de coupure au milieu d'un mot).
function RevealChars({
  text,
  open,
  base = 0,
  step = 25,
}: {
  text: string;
  open: boolean;
  base?: number;
  step?: number;
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
              const delay = base + idx * step;
              return (
                <span key={ci} aria-hidden className="reveal-mask">
                  <span
                    className={`inline-block transition-transform duration-700 ease-out ${
                      open ? "translate-y-0" : "translate-y-full"
                    }`}
                    style={{ transitionDelay: open ? `${delay}ms` : "0ms" }}
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

export default function Menu() {
  const [open, setOpen] = useState(false);
  const [onDark, setOnDark] = useState(false);
  // Thème figé à l'ouverture (clair si on ouvre au-dessus d'une section sombre)
  const [panelLight, setPanelLight] = useState(false);
  // Vrai tant que le panneau occupe l'écran (ouvert OU en cours de fermeture)
  const [covering, setCovering] = useState(false);
  const close = () => setOpen(false);
  const pathname = usePathname();
  const { navigate, leave } = usePageTransition();

  // Ouvre/ferme le panneau. À l'ouverture, on fige son thème selon le fond.
  const toggle = () =>
    setOpen((v) => {
      const next = !v;
      if (next) {
        setPanelLight(onDark);
        setCovering(true);
      }
      return next;
    });

  // Verrouille le défilement de la page tant que le panneau est ouvert
  // (via le verrou à compteur, partagé avec la porte du hero).
  useEffect(() => {
    if (!open) return;
    lockScroll();
    return () => unlockScroll();
  }, [open]);

  // Fin de l'animation de glissement : quand le panneau a fini de se refermer,
  // la barre peut de nouveau suivre la couleur de la section. (On ne réagit qu'à
  // la transition du panneau lui-même, pas à celle des lettres qu'il contient.)
  const onPanelTransitionEnd = (e: React.TransitionEvent) => {
    if (e.target === e.currentTarget && !open) setCovering(false);
  };

  // La barre passe en blanc quand un panneau sombre (data-nav-dark) la recouvre.
  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      const navY = 48; // point situé dans la barre (haut de page)
      let over = false;
      document.querySelectorAll("[data-nav-dark]").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top <= navY && r.bottom >= navY) over = true;
      });
      setOnDark(over);
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [pathname]);

  // Couleur des éléments de la barre : ils doivent contraster avec ce qu'il y a
  // derrière. Tant que le panneau recouvre l'écran (ouverture/fermeture), c'est
  // lui la référence (inverse de son thème) ; sinon, c'est la section sous la
  // barre. Ainsi la barre reste cohérente pendant toute la fermeture.
  const dark = covering ? !panelLight : onDark;

  // Jeux de classes du panneau selon son thème (clair ou sombre).
  const panel = panelLight
    ? {
        bg: "bg-[#f4f1ec] text-[#1c1a17]",
        link: "text-[#1c1a17] hover:text-[#1c1a17]/60",
        label: "text-[#1c1a17]/50",
        info: "text-[#1c1a17]/70 hover:text-[#1c1a17]",
        social:
          "border-[#1c1a17]/25 text-[#1c1a17]/70 hover:border-[#1c1a17] hover:text-[#1c1a17]",
      }
    : {
        bg: "bg-[#1c1a17] text-white",
        link: "text-white hover:text-white/60",
        label: "text-white/50",
        info: "text-white/80 hover:text-white",
        social:
          "border-white/30 text-white/80 hover:border-white hover:text-white",
      };

  // Sortie du site (espace membre, offres) : on couvre d'un voile noir puis on
  // part, comme pour un changement de page interne. On NE referme pas le
  // panneau : le voile le recouvre, sans animation de repli. Les raccourcis
  // d'ouverture en nouvel onglet restent au navigateur.
  const onExternal = (e: React.MouseEvent, href: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    leave(() => {
      // Le fondu ne s'arrete pas au depart : la page d'arrivee reprend le voile
      // et le dissipe. Uniquement vers cette application — un drapeau pose avant
      // un depart vers un site tiers resterait en attente et se declencherait au
      // retour, sur une page qui n'a rien demande.
      if (isInternalExit(href)) armPageReveal();
      window.location.href = href;
    });
  };

  // Clic sur un lien. Le href peut être un chemin, une ancre, ou les deux
  // (ex. "/decouvrir#expertises").
  const onNav = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    const [rawPath, hash] = href.split("#");
    const path = rawPath || pathname; // "#foo" seul → page courante
    const anchor = hash ? `#${hash}` : "";

    if (path === pathname) {
      // Déjà sur la page : on referme le panneau (animation) puis on défile.
      close();
      window.setTimeout(() => {
        if (anchor) {
          document
            .querySelector(anchor)
            ?.scrollIntoView({ behavior: "smooth" });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, 500);
      return;
    }

    // Autre page : seulement le fondu (voile). On NE referme PAS le panneau :
    // le voile le recouvre et le fait fondre au noir, sans animation de repli.
    // Le défilement à l'arrivée est pris en charge par ScrollToTarget.
    if (anchor) {
      try {
        sessionStorage.setItem("jc:scrollTarget", anchor);
      } catch {
        /* sessionStorage indisponible : on ignore */
      }
    }
    navigate(path);
  };

  return (
    /*
      Conteneur inerte : ses trois enfants sont en `position: fixed`, il ne
      prend donc aucune place et ne decale rien. Il n'est la que pour porter la
      typographie de la vitrine — le menu est aussi monte sur les offres
      d'emploi, hors du groupe (vitrine), ou `--font-geist-sans` n'existe pas et
      ou les grands liens du panneau retomberaient en Inter.

      Sans transform ni filtre, sous peine de devenir le repere des enfants
      `fixed` et de les arracher a la fenetre.
    */
    <div className={VITRINE_FONT_VARS}>
      {/* Logo au premier plan : passe en blanc quand le panneau s'ouvre */}
      <Link
        href="/"
        onClick={(e) => onNav(e, "/")}
        aria-label="Jarvis — Accueil"
        className="fixed left-8 top-8 z-50 sm:left-12 sm:top-12"
      >
        {/*
          Meme marque que la console (`console-mark.tsx`) : `/logo-jarvis-noir.png`, a
          l'encre noire sur fond transparent. Le site public et l'espace connecte ne
          montrent plus deux emblemes differents.

          L'encre reste RETOURNEE par `invert` sur les sections sombres, comme avant : le
          fichier est en RVBA a encre noire, le filtre le rend donc blanc. La console, elle,
          a besoin de DEUX fichiers parce que sa bascule est un theme pose avant la
          premiere peinture ; ici l'etat `dark` suit le defilement, un filtre anime en
          300 ms suffit et evite un second telechargement.

          `w-auto` et non `w-10` : cette marque est en 256x195, pas carree comme l'ancien
          `/logo.png` (641x641). A largeur imposee, `object-contain` l'aurait retrecie
          d'un quart en hauteur. C'est la HAUTEUR qui doit rester celle d'avant.
        */}
        <Image
          src="/logo-jarvis-noir.png"
          alt="Jarvis"
          width={256}
          height={195}
          sizes="64px"
          priority
          className={`h-10 w-auto object-contain transition-[filter] duration-300 sm:h-12 ${
            dark ? "invert" : "invert-0"
          }`}
        />
      </Link>

      {/* Coin haut droit : bouton Contacter + burger (au premier plan) */}
      <div className="fixed right-8 top-8 z-50 flex items-center gap-3 sm:right-12 sm:top-12">
        {/* CTA Contacter, encadré, reste visible sur le panneau noir */}
        <Link
          href="#contact"
          onClick={close}
          className={`animate-fade-in rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-tight transition-colors duration-300 ${
            dark
              ? "border-white text-white hover:bg-white hover:text-black"
              : "border-zinc-900 text-zinc-900 hover:bg-zinc-900 hover:text-white"
          }`}
          style={{ animationDelay: "0.9s" }}
        >
          Contactez nous
        </Link>

        {/* Burger (se transforme en croix à l'ouverture) */}
        <button
          type="button"
          onClick={toggle}
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
          className="flex h-12 w-12 flex-col items-center justify-center gap-1.5"
        >
          <span
            className={`block h-0.5 w-7 transition-all duration-300 ${
              dark ? "bg-white" : "bg-zinc-900"
            } ${open ? "translate-y-2 rotate-45" : ""}`}
          />
          <span
            className={`block h-0.5 w-7 transition-all duration-300 ${
              open ? "opacity-0" : dark ? "bg-white" : "bg-zinc-900"
            }`}
          />
          <span
            className={`block h-0.5 w-7 transition-all duration-300 ${
              dark ? "bg-white" : "bg-zinc-900"
            } ${open ? "-translate-y-2 -rotate-45" : ""}`}
          />
        </button>
      </div>

      {/* Panneau plein écran qui glisse depuis la droite */}
      <aside
        aria-hidden={!open}
        onTransitionEnd={onPanelTransitionEnd}
        className={`fixed inset-0 z-40 h-dvh w-full transition-transform duration-500 ease-out ${panel.bg} ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col px-8 py-8 sm:px-12 sm:py-10">
          {/* Corps : gros liens à gauche + colonne d'infos à droite */}
          <div className="flex flex-1 items-center justify-between gap-8">
            <nav className="flex flex-col gap-1">
              {mainLinks.map((link, i) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={(e) => onNav(e, link.href)}
                  className={`block text-5xl font-bold uppercase leading-[1.05] tracking-tight transition-colors sm:text-7xl laptop:text-5xl ${panel.link}`}
                >
                  <RevealChars
                    text={link.label}
                    open={open}
                    base={200 + i * 90}
                    step={35}
                  />
                </Link>
              ))}
            </nav>

            <div className="hidden shrink-0 flex-col gap-8 text-sm sm:flex">
              <div className="flex flex-col gap-2">
                <span
                  className={`text-xs font-semibold uppercase tracking-[0.2em] ${panel.label}`}
                >
                  <RevealChars
                    text="Contact"
                    open={open}
                    base={700}
                    step={22}
                  />
                </span>
                {infoLinks.map((link, k) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={(e) => onNav(e, link.href)}
                    className={`font-medium uppercase tracking-tight transition-colors ${panel.info}`}
                  >
                    <RevealChars
                      text={link.label}
                      open={open}
                      base={760 + k * 60}
                      step={14}
                    />
                  </Link>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <span
                  className={`text-xs font-semibold uppercase tracking-[0.2em] ${panel.label}`}
                >
                  <RevealChars
                    text="Membre de Jarvis"
                    open={open}
                    base={1040}
                    step={22}
                  />
                </span>
                <a
                  href={AUTH_HREF}
                  onClick={(e) => onExternal(e, AUTH_HREF)}
                  className={`inline-flex items-center gap-1 font-medium uppercase tracking-tight transition-colors ${panel.info}`}
                >
                  <RevealChars
                    text="Accéder à mon espace"
                    open={open}
                    base={1120}
                    step={14}
                  />
                  <span aria-hidden className="reveal-mask">
                    <span
                      className={`inline-block transition-transform duration-700 ease-out ${
                        open ? "translate-y-0" : "translate-y-full"
                      }`}
                      style={{ transitionDelay: open ? "1360ms" : "0ms" }}
                    >
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <line x1="7" y1="17" x2="17" y2="7" />
                        <polyline points="7 7 17 7 17 17" />
                      </svg>
                    </span>
                  </span>
                </a>

                {/* Offres d'emploi : même traitement que le lien ci-dessus
                    (révélation lettre par lettre puis la flèche), la cascade
                    reprenant là où « Accéder à mon espace » s'arrête. */}
                <a
                  href={JOBS_HREF}
                  onClick={(e) => onExternal(e, JOBS_HREF)}
                  className={`inline-flex items-center gap-1 font-medium uppercase tracking-tight transition-colors ${panel.info}`}
                >
                  <RevealChars
                    text="Offres d'emploi"
                    open={open}
                    base={1420}
                    step={14}
                  />
                  <span aria-hidden className="reveal-mask">
                    <span
                      className={`inline-block transition-transform duration-700 ease-out ${
                        open ? "translate-y-0" : "translate-y-full"
                      }`}
                      style={{ transitionDelay: open ? "1620ms" : "0ms" }}
                    >
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <line x1="7" y1="17" x2="17" y2="7" />
                        <polyline points="7 7 17 7 17 17" />
                      </svg>
                    </span>
                  </span>
                </a>
              </div>
            </div>
          </div>

          {/* Pied : réseaux sociaux en bas à droite */}
          <div className="flex justify-end">
            <a
              href="https://www.linkedin.com/company/jarvis-connect/posts/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className={`flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${panel.social}`}
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05c.53-1 1.83-2.05 3.75-2.05 4 0 4.75 2.65 4.75 6.1V21h-4v-5.4c0-1.3 0-2.95-1.8-2.95s-2.05 1.4-2.05 2.85V21H10V9Z" />
              </svg>
            </a>
          </div>
        </div>
      </aside>
    </div>
  );
}
