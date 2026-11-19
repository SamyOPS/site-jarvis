"use client";

import { LogIn, Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import FooterShader from "@/components/vitrine/footer-shader";
import { usePageTransition } from "@/components/vitrine/page-transition";
import { lockScroll, unlockScroll } from "@/features/vitrine/scroll-lock";
import {
  AUTH_HREF,
  infoLinks,
  isInternalExit,
  leavesVitrine,
  mainLinks,
} from "@/features/vitrine/nav";
import { VITRINE_FONT_VARS } from "@/features/vitrine/fonts";
import { useDarkSectionAt } from "@/features/vitrine/use-dark-section";
import { armPageReveal } from "@/lib/page-reveal";

export default function Menu() {
  const [open, setOpen] = useState(false);
  // Thème figé à l'ouverture (clair si on ouvre au-dessus d'une section sombre)
  const [panelLight, setPanelLight] = useState(false);
  // Vrai tant que le panneau occupe l'écran (ouvert OU en cours de fermeture)
  const [covering, setCovering] = useState(false);
  const close = () => setOpen(false);
  const pathname = usePathname();
  const { navigate, leave } = usePageTransition();

  /*
    Fond sombre sous la barre. Meme bascule qu'avant, mais poussee par le navigateur : la
    version precedente relisait la position des douze sections a chaque frame, en meme
    temps que la barre de progression faisait le meme travail de son cote.

    48 px : un point situe DANS la barre, dont les enfants commencent a `top-8` (32 px).
  */
  const onDark = useDarkSectionAt(48, pathname);

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

    // Deja sur place : le menu est aussi monte sur les offres d'emploi, ou « Offres
    // d'emploi » designe la page courante. Recharger serait absurde — on referme le
    // panneau et on remonte, comme `onNav` dans le meme cas.
    if (href === pathname) {
      close();
      window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 500);
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

  // Clic sur un lien. Le href peut être un chemin, une ancre, ou les deux
  // (ex. "/#expertises").
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
      {/*
        Logo et nom de la societe au premier plan : passent en blanc quand le panneau
        s'ouvre ou sur une section sombre. Le nom est masque sous `md` : plus etroit, il
        ne tient pas a cote des boutons de droite (a 640 px, il touchait deja « Nous
        contacter »).
      */}
      <Link
        href="/"
        onClick={(e) => onNav(e, "/")}
        aria-label="Jarvis Connect — Accueil"
        className="fixed left-8 top-8 z-50 flex items-center gap-3 sm:left-12 sm:top-12"
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
        <span
          className={`hidden text-lg font-bold uppercase leading-none tracking-tight transition-colors duration-300 md:inline ${
            dark ? "text-white" : "text-zinc-900"
          }`}
        >
          Jarvis Connect
        </span>
      </Link>

      {/*
        Coin haut droit : contact, connexion, burger.

        Contact : bouton TEXTE « Nous contacter » des `sm` ; pastille enveloppe sur
        telephone, ou le texte ne tiendrait pas. Connexion : pastille a icone, au gabarit
        du burger ; son libelle est en `sr-only` (lu par les lecteurs d'ecran) et `title`
        le restitue en infobulle au survol.

        Plus de fondu retarde a l'arrivee : le header est complet des la premiere image.
      */}
      <div className="fixed right-8 top-8 z-50 flex items-center gap-3 sm:right-12 sm:top-12">
        {/* Contact. Reste visible sur le panneau noir. */}
        <Link
          href="#contact"
          onClick={close}
          className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors duration-300 sm:h-12 sm:w-auto sm:px-6 ${
            dark
              ? "border-white text-white hover:bg-white hover:text-black"
              : "border-zinc-900 text-zinc-900 hover:bg-zinc-900 hover:text-white"
          }`}
        >
          <Mail className="h-4 w-4 shrink-0 sm:hidden" aria-hidden />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap sm:text-xs sm:font-semibold sm:uppercase sm:tracking-[0.2em]">
            Nous contacter
          </span>
        </Link>

        {/*
          Connexion. Meme destination et MEME sortie que « Acceder a mon espace » du
          panneau : `/auth` vit hors du groupe (vitrine), `onExternal` pose donc le voile
          noir et arme sa dissipation a l'arrivee. Un simple <Link> demonterait le
          `PageTransition` et ferait sauter le voile d'un coup sec.
        */}
        <Link
          href={AUTH_HREF}
          onClick={(e) => onExternal(e, AUTH_HREF)}
          title="Connexion"
          className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors duration-300 sm:h-12 sm:w-12 ${
            dark
              ? "border-white text-white hover:bg-white hover:text-black"
              : "border-zinc-900 text-zinc-900 hover:bg-zinc-900 hover:text-white"
          }`}
        >
          <LogIn className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden />
          <span className="sr-only">Connexion</span>
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
        className={`fixed inset-0 z-40 h-dvh w-full transition-transform duration-350 ease-out ${panel.bg} ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/*
          Meme flux anime que le pied de page, dans le nuancier du panneau.

          `overlapVh={0}` : le debordement de 55vh du nuancier sombre sert a joindre la
          section qui precede le footer. Ici le panneau occupe tout l'ecran — ce
          debordement ne serait calcule que hors champ.

          Rien a eteindre a la fermeture : le panneau sort de l'ecran par `translate-x-full`,
          l'observateur de visibilite du shader constate qu'il n'est plus visible et arrete
          sa boucle de lui-meme.
        */}
        <FooterShader variant={panelLight ? "light" : "dark"} overlapVh={0} />

        {/* `relative` : le contenu doit passer AU-DESSUS du canvas, qui est absolu. */}
        <div className="relative flex h-full flex-col px-8 py-8 sm:px-12 sm:py-10">
          {/*
            Corps : les liens principaux, centres dans le panneau.

            Taille bornee par la HAUTEUR de l'ecran (`dvh`) : la liste et le pied (liens d'information)
            doivent tenir ensemble sans defilement, jusque sur un ecran bas — portable,
            telephone a l'horizontale. Sur un ecran assez haut, les plafonds
            `3rem` et `4.5rem` redonnent les tailles d'origine (text-5xl, text-7xl).
          */}
          <nav className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 text-center text-[min(3rem,6.5dvh)] font-bold uppercase leading-[1.05] tracking-tight sm:text-[min(4.5rem,6dvh)]">
            {mainLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                /*
                  « Offres d'emploi » quitte la vitrine (/offres a son propre layout) : voile
                  et navigation de document, sans quoi le `PageTransition` se demonterait et
                  le voile sauterait d'un coup sec. Les autres entrees restent internes.
                */
                onClick={(e) =>
                  leavesVitrine(link.href) ? onExternal(e, link.href) : onNav(e, link.href)
                }
                className={`block max-w-full transition-colors ${panel.link}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/*
            Pied du panneau : liens d'information en bas a gauche, en LIGNE et sans intitule,
            renvoyes a la ligne si la largeur manque ; LinkedIn en bas a droite. Masques sur
            mobile, comme avant.

            Le bloc « Membre de Jarvis » n'est plus dans le panneau : la connexion reste a
            portee par l'icone de la barre, toujours visible au-dessus.
          */}
          <div className="flex items-end justify-between gap-8">
            <div className="hidden min-w-0 flex-wrap items-baseline gap-x-8 gap-y-2 text-sm sm:flex">
              {infoLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={(e) => onNav(e, link.href)}
                  className={`font-medium uppercase tracking-tight transition-colors ${panel.info}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <a
              href="https://www.linkedin.com/company/jarvis-connect/posts/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className={`ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors ${panel.social}`}
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
