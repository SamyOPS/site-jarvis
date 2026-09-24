"use client";

import { useEffect } from "react";
import { usePageTransition } from "@/components/vitrine/page-transition";

// Sur /decouvrir : quand on est tout en haut et qu'on scrolle vers le haut,
// on repart vers l'accueil avec la même transition que le bouton (symétrique
// du « scroll vers le bas » du hero).
export default function ScrollUpHome() {
  const { navigate, prefetch } = usePageTransition();

  // Meme raison qu'a l'aller : le retour vers l'accueil est la seule destination
  // possible de ce geste, autant l'avoir deja sous la main.
  useEffect(() => {
    prefetch("/");
  }, [prefetch]);

  useEffect(() => {
    let triggered = false;
    let ready = false;
    // Petit délai après l'arrivée pour éviter un retour immédiat.
    const t = window.setTimeout(() => {
      ready = true;
    }, 800);

    const go = () => {
      if (!ready || triggered) return;
      if (document.documentElement.style.overflow === "hidden") return; // menu ouvert
      if (window.scrollY > 2) return; // uniquement en haut de page
      triggered = true;
      navigate("/", "up");
    };

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY < -15) go();
    };
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      // Swipe vers le bas = intention de scroller vers le haut.
      if ((e.touches[0]?.clientY ?? 0) - startY > 40) go();
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [navigate]);

  return null;
}
