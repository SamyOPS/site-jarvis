import Expertises from "@/components/vitrine/expertises";
import Faq from "@/components/vitrine/faq";
import Footer from "@/components/vitrine/footer";
import Formations from "@/components/vitrine/formations";
import Hero from "@/components/vitrine/hero";
import JobOffers from "@/components/vitrine/job-offers";
import LatestNews from "@/components/vitrine/latest-news";
import Menu from "@/components/vitrine/menu";
import Mission from "@/components/vitrine/mission";
import Partners from "@/components/vitrine/partners";
import ScrollToTarget from "@/components/vitrine/scroll-to-target";

/*
  La section « Dernieres actualites » lit la base : la page est regeneree au plus une fois
  par minute. Un article publie y apparait sans redeploiement.
*/
export const revalidate = 60;

/**
 * Accueil : TOUTE la vitrine, en sections qui defilent normalement.
 *
 * L'accueil n'etait qu'un hero, qu'un geste de molette remplacait par /decouvrir, ou se
 * succedaient des sections epinglees (zoom, galerie horizontale, escalier, mosaique).
 * La vitrine est revenue a une navigation classique : une seule page, aucune section
 * epinglee ni pilotee par le defilement. /decouvrir redirige ici (next.config.ts), et le
 * menu fait defiler jusqu'aux ancres #expertises, #formations, #offres, #faq.
 */
export default function Home() {
  return (
    <>
      <main>
        {/* Arrivee avec une cible (#section, ou clic de menu depuis une autre page). */}
        <ScrollToTarget />

        {/* Menu au premier plan, hors du hero : la perspective 3D du hero pigerait
            sinon les elements fixes de la barre. */}
        <Menu />

        <Hero />
        <Mission />
        <Expertises />
        <Partners />
        <Formations />
        <JobOffers />
        <LatestNews />
        <Faq />
      </main>

      {/* Version claire, comme sur les autres pages : les sections qui le precedent
          (actualites, FAQ) sont sur fond blanc, et le flux sombre deborde de 55vh pour se
          fondre dans une section NOIRE. */}
      <Footer variant="light" />
    </>
  );
}
