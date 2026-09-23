"use client";

import { animate, useMotionValue } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import ScrollProgress from "@/components/vitrine/scroll-progress";

type Direction = "down" | "up";

type TransitionCtx = {
  // `direction` fait glisser le contenu dans le sens du scroll pendant le fondu.
  navigate: (href: string, direction?: Direction) => void;
  /*
    Départ sans retour : couvre l'écran, exécute `action` une fois le noir plein,
    ET RESTE COUVERT.

    `action` fait quitter le document (`window.location.href`). Une navigation de
    document n'est pas instantanée : le navigateur continue d'afficher CETTE page
    pendant qu'il va chercher la suivante. Lever le voile après l'avoir déclenchée
    rendrait donc la page de départ à l'écran, le temps du chargement — un fondu
    au noir puis un retour à la case départ, avant que la page d'arrivée ne
    paraisse enfin. Le voile tient jusqu'à ce que le document soit remplacé ; la
    page d'arrivée reprend le relais avec le sien (voir `src/lib/page-reveal.ts`).
  */
  leave: (action?: () => void) => void;
};

/*
  Valeur par defaut du contexte : elle sert la ou aucun <PageTransition> n'est
  monte au-dessus, c'est-a-dire hors du groupe (vitrine) — le pied de page est
  aussi affiche sur les offres d'emploi.

  Elle navigue pour de bon. Des fonctions vides seraient pires qu'un fondu
  manquant : `onNav` appelle `e.preventDefault()` avant de deleguer, et le lien
  ne mènerait donc nulle part. Sans voile a faire apparaitre, on part
  directement — une navigation de document, qui laisse au passage le script
  d'amorcage reposer les attributs de scope.
*/
const NO_TRANSITION: TransitionCtx = {
  navigate: (href) => {
    window.location.href = href;
  },
  leave: (action) => {
    action?.();
  },
};

const TransitionContext = createContext<TransitionCtx>(NO_TRANSITION);

export const usePageTransition = () => useContext(TransitionContext);

// Durée du fondu du voile noir (doit correspondre à `duration-500`).
const DURATION = 500;

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [covering, setCovering] = useState(false);
  const pendingRef = useRef<string | null>(null);

  // Glissement du contenu SORTANT pendant le fondu (simulation de scroll). Le
  // transform n'est appliqué que lorsque la valeur ≠ 0 (sinon on casserait les
  // éléments `fixed`/`sticky` au repos). Le conteneur a un fond noir : l'espace
  // découvert par le glissement est noir et se fond dans le voile (pas de blanc).
  // À l'arrivée on remet 0 (pas de translation d'entrée → navbar visible tout de
  // suite, pas de zone blanche).
  const contentEl = useRef<HTMLDivElement>(null);
  const contentY = useMotionValue(0);
  useEffect(() => {
    return contentY.on("change", (v) => {
      const el = contentEl.current;
      if (el) el.style.transform = v === 0 ? "" : `translateY(${v}px)`;
    });
  }, [contentY]);

  const navigate = useCallback(
    (href: string, direction?: Direction) => {
      const targetPath = href.split("#")[0] || pathname;
      if (targetPath === pathname && !href.includes("#")) return;
      pendingRef.current = targetPath;
      setCovering(true);
      if (direction) {
        const offset = window.innerHeight * 0.14;
        contentY.set(0);
        animate(contentY, direction === "down" ? -offset : offset, {
          duration: DURATION / 1000,
          ease: [0.4, 0, 1, 1],
        });
      }
      window.setTimeout(() => router.push(href), DURATION);
    },
    [pathname, router, contentY],
  );

  const leave = useCallback((action?: () => void) => {
    setCovering(true);
    // Pas de contrepartie qui lèverait le voile : voir le contrat de `leave`.
    window.setTimeout(() => action?.(), DURATION);
  }, []);

  /*
    Retour arrière depuis la page d'arrivée.

    `leave` laisse le voile posé, et le navigateur peut restaurer cette page
    telle qu'il l'avait gelée — état React compris, donc voile compris. Sans ce
    garde-fou, revenir en arrière afficherait un écran noir définitif. `persisted`
    distingue la restauration depuis le cache d'un chargement neuf, qui repart
    déjà de `false`.
  */
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setCovering(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  // Nouvelle page chargée → contenu posé à sa place (transform 0), puis on
  // dissipe le voile.
  useEffect(() => {
    if (pendingRef.current && pendingRef.current === pathname) {
      pendingRef.current = null;
      contentY.set(0);
      const t = window.setTimeout(() => setCovering(false), 100);
      return () => window.clearTimeout(t);
    }
  }, [pathname, contentY]);

  return (
    <TransitionContext.Provider value={{ navigate, leave }}>
      {/* Fond noir permanent derrière le contenu : quand le contenu glisse
          pendant une transition, l'espace découvert (en haut ou en bas) reste
          noir au lieu de laisser voir le fond blanc de la page. */}
      <div aria-hidden className="fixed inset-0 -z-10 bg-black" />
      <div
        ref={contentEl}
        className="flex min-h-full flex-1 flex-col overflow-x-clip bg-black"
      >
        {children}
      </div>

      {/* Barre de progression verticale (remplace la scrollbar native). Hors du
          conteneur qui glisse, sous le voile (z-100) et le menu (z-40). */}
      <ScrollProgress />

      <div
        aria-hidden
        className={`fixed inset-0 z-[100] bg-black transition-opacity duration-500 ease-in-out ${
          covering ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
    </TransitionContext.Provider>
  );
}
