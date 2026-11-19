import Image from "next/image";

import { cn } from "@/lib/utils";

export type GridLogo = {
  src: string;
  alt: string;
  /** Dimensions INTRINSEQUES du fichier : `next/image` en tire le rapport et la variante. */
  w: number;
  h: number;
  /** Logo dont le texte serait illisible a la hauteur commune : un cran plus grand. */
  big?: boolean;
};

/** Hauteur d'affichage maximale (`2xl:max-h-12` / `2xl:max-h-20`) : borne la largeur a servir. */
const MAX_HEIGHT_PX = 48;
const MAX_HEIGHT_BIG_PX = 80;
const MAX_WIDTH_PX = 190;

/**
 * Grille de logos de la vitrine (partenaires) : filets noirs entre les cases,
 * logos noirs a hauteur commune.
 *
 * Les filets : chaque case porte son filet droit et son filet bas, la grille son filet
 * haut. Le filet droit de la derniere colonne deborde d'un pixel (`-mr-px`) et le cadre le
 * rogne : seuls les filets INTERIEURS restent, quel que soit le nombre de colonnes et meme
 * si la derniere rangee est incomplete — sans calcul de position par palier.
 */
export function LogoGrid({ logos, columnsClassName }: { logos: GridLogo[]; columnsClassName: string }) {
  return (
    <div className="overflow-hidden border-t border-zinc-900">
      <ul className={cn("-mr-px grid", columnsClassName)}>
        {logos.map((logo) => {
          const maxHeight = logo.big ? MAX_HEIGHT_BIG_PX : MAX_HEIGHT_PX;
          return (
            <li
              key={logo.src}
              className="flex h-28 items-center justify-center border-b border-r border-zinc-900 px-3 sm:h-40 sm:px-6 lg:h-44 2xl:h-56"
            >
              <Image
                src={logo.src}
                alt={logo.alt}
                title={logo.alt}
                width={logo.w}
                height={logo.h}
                sizes={`${Math.min(MAX_WIDTH_PX, Math.ceil((logo.w / logo.h) * maxHeight))}px`}
                draggable={false}
                className={cn(
                  "h-auto w-auto max-w-[min(190px,100%)] object-contain transition-opacity duration-200 hover:opacity-50",
                  logo.big ? "max-h-14 lg:max-h-16 2xl:max-h-20" : "max-h-10 2xl:max-h-12",
                )}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
