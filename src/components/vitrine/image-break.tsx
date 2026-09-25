"use client";

import { ZoomParallax } from "@/components/vitrine/zoom-parallax";
import { illustration } from "@/features/vitrine/images";
import { JOBS_HREF } from "@/features/vitrine/nav";

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
    /*
      `id="offres"` : cible du lien « Offres d'emploi » du menu et du pied de page.

      Sur la SECTION elle-meme, et non decalee comme celle des expertises. Ce zoom-ci est
      en `direction="out"` : le titre est entier des le premier pixel de la section, alors
      que celui des expertises n'apparait qu'a la fin de son zoom — d'ou l'ancre posee a
      200vh la-bas.
    */
    <section id="offres" data-nav-dark className="relative bg-black">
      {/*
        Le titre et son lien sont poses sur l'image plein ecran du depart, puis s'effacent
        au fil du dezoom — sens inverse de la section expertises, ou le titre arrive avec le
        zoom. C'est le meme composant : `direction="out"` suffit a retourner l'animation.
      */}
      <ZoomParallax
        images={mosaic}
        direction="out"
        eyebrow="nos"
        title="Offres d'emploi"
        cta={{ label: "Voir les offres", href: JOBS_HREF }}
      />
    </section>
  );
}
