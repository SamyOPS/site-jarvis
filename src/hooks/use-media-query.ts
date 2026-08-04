"use client";

import { useEffect, useState } from "react";

/**
 * Renvoie false au rendu serveur et au premier rendu client, puis la vraie valeur
 * apres montage : le HTML serveur et le premier rendu client concordent donc
 * toujours, ce qui evite toute erreur d'hydratation.
 *
 * Utile pour ne pas seulement *cacher* un composant couteux sous un breakpoint
 * (`hidden xl:block` le monte quand meme) mais eviter de le monter du tout.
 */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const sync = () => setMatches(mediaQueryList.matches);

    sync();
    mediaQueryList.addEventListener("change", sync);
    return () => mediaQueryList.removeEventListener("change", sync);
  }, [query]);

  return matches;
}
