"use client";

import { motion, useScroll, useSpring } from "motion/react";
import { usePathname } from "next/navigation";
import {
  usePageScrolls,
  useDarkSectionAt,
} from "@/features/vitrine/use-dark-section";

// Barre de progression verticale personnalisée, à gauche, centrée et décollée
// du bord. Elle remplace la scrollbar native (masquée en CSS). Sa couleur
// s'inverse selon la section derrière : noire sur fond clair, blanche sur fond
// sombre (détecté via l'attribut data-nav-dark, comme la navbar).
export default function ScrollProgress() {
  const pathname = usePathname();
  const { scrollYProgress } = useScroll();
  // Léger lissage du remplissage pour un rendu plus doux.
  const scaleY = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.3,
  });

  /*
    Ces deux etats se recalculaient A CHAQUE FRAME de defilement, en lisant la position de
    chaque section puis `scrollHeight` — deux mises en page forcees par image. Ils sont
    desormais pousses par le navigateur, qui ne reveille le composant qu'au changement.
  */
  // Fond sombre derriere le milieu de l'ecran, la ou la barre est posee → barre blanche.
  const dark = useDarkSectionAt("center", pathname);
  // Barre affichee seulement si la page defile vraiment (donc pas sur l'accueil).
  const visible = usePageScrolls(pathname);

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed left-6 top-1/2 z-30 h-32 w-[3px] -translate-y-1/2 overflow-hidden rounded-full transition-opacity duration-500 sm:left-8 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Rail discret */}
      <div
        className={`absolute inset-0 rounded-full transition-colors duration-300 ${
          dark ? "bg-white/25" : "bg-black/15"
        }`}
      />
      {/* Remplissage selon la progression du scroll (part du haut) */}
      <motion.div
        style={{ scaleY }}
        className={`absolute inset-0 origin-top rounded-full transition-colors duration-300 ${
          dark ? "bg-white" : "bg-black"
        }`}
      />
    </div>
  );
}
