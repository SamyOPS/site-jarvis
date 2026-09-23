import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Marque de la console : le logo du site.
 *
 * DEUX ENCRES, PAS UNE. Le logo d'origine (`/logo jarvis.png`) est blanc sur fond
 * transparent — il est fait pour l'en-tete sombre du site public, et disparaitrait
 * purement et simplement sur le theme clair de la console, qui est le theme par defaut.
 * `/logo-jarvis-noir.png` en est la contrepartie a l'encre noire : le JPEG d'origine, au
 * fond blanc opaque, a ete detoure puis retire de `public/` — il n'etait jamais servi.
 *
 * LA BASCULE EST EN CSS (voir `console.css`, section Marque), pas en React : le theme est
 * pose par le script d'amorcage avant la premiere peinture. Un composant qui lirait le
 * theme a l'hydratation afficherait la mauvaise encre pendant un instant, et ce
 * clignotement serait visible sur chaque chargement de page.
 *
 * `unoptimized` : ces deux fichiers sont deja legers et servis tels quels ; les faire
 * passer par l'optimiseur pour un rendu de 28 px n'apporte rien.
 */
export function ConsoleMark({ className }: { className?: string }) {
  /*
    28 px et non 24 : a 24 le mot-symbole inscrit dans l'embleme se brouille. L'en-tete de
    la barre laterale fait 48 px de haut, la place est disponible. Le texte « Jarvis
    Connect » figure de toute facon a cote — l'embleme n'a pas a etre lu, seulement
    reconnu.
  */
  const common = "h-7 w-7 shrink-0 object-contain";

  return (
    <>
      <Image
        src="/logo-jarvis-noir.png"
        alt=""
        width={28}
        height={28}
        unoptimized
        priority
        className={cn("console-mark--light", common, className)}
      />
      <Image
        src="/logo jarvis.png"
        alt=""
        width={28}
        height={28}
        unoptimized
        priority
        className={cn("console-mark--dark", common, className)}
      />
    </>
  );
}
