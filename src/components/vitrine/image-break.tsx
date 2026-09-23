"use client";

import { ZoomParallax } from "@/components/vitrine/zoom-parallax";
import { illustration } from "@/features/vitrine/images";

// Après l'index des formations : on arrive sur une image plein écran, puis le scroll
// DÉZOOME et révèle la mosaïque des autres visuels. C'est le `ZoomParallax` des
// expertises joué à l'envers (`direction="out"`), donc la page ouvre et referme
// sur le même geste.
// Sept cadres pour trois visuels : on fait tourner ceux dont on dispose. Le
// premier est celui qui occupe l'écran au départ (il est au centre, sans
// décalage) ; les six suivants composent la mosaïque autour de lui.
const mosaic = Array.from({ length: 7 }, (_, i) => illustration(i));

export default function ImageBreak() {
  return (
    <section data-nav-dark className="relative bg-black">
      <ZoomParallax images={mosaic} direction="out" />
    </section>
  );
}
