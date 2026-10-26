import Image from "next/image";

/*
 * Logos partenaires (public/Image/logo_partenaire).
 *
 * Meme regle que la section clients (voir clients.tsx) : l'encre est dans les FICHIERS.
 * Les `-noir.png` sont derives des fichiers livres — noircis, marges rognees, bornes a
 * 600x240 — et les originaux restent dans le dossier pour pouvoir les regenerer. Un logo
 * dont l'aspect change doit changer de nom, sinon les caches servent l'ancien.
 *
 * `w` / `h` : dimensions INTRINSEQUES des fichiers, pour que `next/image` tienne le bon
 * rapport et serve une variante a la taille utile.
 */
/** Par ordre alphabetique : neutre entre partenaires. */
const partners: { src: string; alt: string; w: number; h: number }[] = [
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
 * Filet vertical a droite d'une case : partout sauf en fin de rangee — toutes les 2 cases
 * sur mobile, toutes les 4 a partir de `lg`. Calcule par position plutot qu'avec des
 * variantes `even:` / `last:`, qui se contredisaient des la deuxieme rangee : chaque case
 * recoit exactement une classe par palier, aucune ne peut l'emporter sur l'autre.
 */
function rightRule(index: number) {
  return [
    index % 2 === 1 ? "border-r-0" : "border-r",
    index % 4 === 3 ? "lg:border-r-0" : "lg:border-r",
  ].join(" ");
}

/** Hauteur d'affichage maximale (2xl:h-12) : borne la largeur a servir, comme pour les clients. */
const MAX_LOGO_HEIGHT_PX = 48;

/**
 * Section « Nos partenaires ».
 *
 * Distincte de « Ils nous font confiance » : un partenaire n'est pas un client, et les
 * melanger dans les memes bandes le laisserait croire. Meme grammaire visuelle que la
 * section clients — titre en italique, filets noirs pleine largeur, logos noirs a la meme
 * hauteur — mais une grille FIXE : avec une poignee de logos, un bandeau defilant tournerait a vide.
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

      {/*
        Deux colonnes sur mobile, quatre a partir de `lg`. Les filets verticaux separent les
        cases sans encadrer la grille : comme les bandes clients, elle court d'un bord a
        l'autre, seuls les filets horizontaux touchent les marges.
      */}
      <ul className="mt-3 grid grid-cols-2 border-t border-zinc-900 sm:mt-10 lg:mt-12 lg:grid-cols-4">
        {partners.map((partner, index) => (
          <li
            key={partner.src}
            className={`flex h-32 items-center justify-center border-b border-zinc-900 px-6 sm:h-40 lg:h-44 2xl:h-56 ${rightRule(index)}`}
          >
            <Image
              src={partner.src}
              alt={partner.alt}
              width={partner.w}
              height={partner.h}
              sizes={`${Math.min(190, Math.ceil((partner.w / partner.h) * MAX_LOGO_HEIGHT_PX))}px`}
              draggable={false}
              className="h-auto max-h-10 w-auto max-w-[min(190px,100%)] object-contain transition-opacity duration-200 hover:opacity-50 2xl:max-h-12"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
