import { LogoGrid, type GridLogo } from "@/components/vitrine/logo-grid";

/*
 * Logos partenaires (public/Image/logo_partenaire).
 *
 * Meme regle que la section clients (voir clients.tsx) : l'encre est dans les FICHIERS.
 * Les `-noir.png` sont derives des fichiers livres — noircis, marges rognees, bornes a
 * 600x240 — et les originaux restent dans le dossier pour pouvoir les regenerer. Un logo
 * dont l'aspect change doit changer de nom, sinon les caches servent l'ancien.
 */
/** Par ordre alphabetique : neutre entre partenaires. */
const partners: GridLogo[] = [
  { src: "/Image/logo_partenaire/cgi-noir.png", alt: "CGI", w: 515, h: 240 },
  { src: "/Image/logo_partenaire/helpline-noir.png", alt: "Helpline", w: 386, h: 69 },
  { src: "/Image/logo_partenaire/inetum-noir.png", alt: "Inetum", w: 600, h: 90 },
  { src: "/Image/logo_partenaire/inps-noir.png", alt: "Inop's", w: 600, h: 232 },
  { src: "/Image/logo_partenaire/opteamis-noir.png", alt: "Opteamis", w: 488, h: 100 },
  // `-v2` : la premiere version etait abimee (halos), le nouveau nom contourne les caches.
  { src: "/Image/logo_partenaire/scc-noir-v2.png", alt: "SCC", w: 457, h: 152 },
  { src: "/Image/logo_partenaire/spie-noir.png", alt: "SPIE", w: 555, h: 240 },
  { src: "/Image/logo_partenaire/tibco-noir.png", alt: "TIBCO", w: 600, h: 164 },
];

/**
 * Section « Nos partenaires ».
 *
 * Distincte de « Ils nous font confiance » : un partenaire n'est pas un client, et les
 * melanger laisserait croire le contraire. Meme grammaire visuelle que les clients — titre
 * en italique, filets noirs, logos noirs — mais une grille FIXE (`LogoGrid`) : avec une
 * poignee de logos, des bandes defilantes tourneraient a vide.
 *
 * Composant serveur : aucune interaction, donc aucun JavaScript envoye au navigateur.
 */
export default function Partners() {
  return (
    <section id="partenaires" className="relative bg-white pb-8 sm:pb-16 lg:pb-20 2xl:pb-32">
      <div className="px-6 pt-2 sm:px-12 sm:pt-10 lg:pt-12 2xl:pt-16">
        <h2 className="font-quote text-2xl text-zinc-900 sm:text-3xl lg:text-4xl 2xl:text-5xl">
          Nos partenaires
        </h2>
      </div>

      <div className="mt-3 sm:mt-10 lg:mt-12">
        <LogoGrid logos={partners} columnsClassName="grid-cols-2 lg:grid-cols-4" />
      </div>
    </section>
  );
}
