"use client";

import { motion, useScroll, useSpring } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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

  const [dark, setDark] = useState(false); // fond sombre derrière → barre blanche
  const [visible, setVisible] = useState(false); // masquée si la page ne défile pas

  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      // Barre affichée seulement si la page défile vraiment (donc pas sur
      // l'accueil, qui tient sur un écran).
      const doc = document.documentElement;
      setVisible(doc.scrollHeight - window.innerHeight > 40);
      // Détection du fond au niveau vertical de la barre (centre de l'écran).
      const y = window.innerHeight / 2;
      let over = false;
      document.querySelectorAll("[data-nav-dark]").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top <= y && r.bottom >= y) over = true;
      });
      setDark(over);
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(check);
    };
    // Premier calcul différé (évite un setState synchrone dans l'effet).
    raf = window.requestAnimationFrame(check);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [pathname]);

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
