import Image from "next/image";

import { safeNewsImageSrc } from "@/features/vitrine/news-content";
import { cn } from "@/lib/utils";

type NewsCoverProps = {
  src: string | null;
  alt: string | null;
  /** Cadre de l'image (rapport, arrondi...) : l'image le remplit. */
  className?: string;
  sizes: string;
  priority?: boolean;
};

/**
 * Image de couverture d'un article, recadree dans son cadre.
 *
 * Un fichier du dossier public passe par l'optimiseur de Next. Une adresse https externe
 * est servie telle quelle (`unoptimized`) : l'optimiseur n'accepte que les domaines
 * declares dans next.config, et un article ne doit pas faire tomber la page parce que
 * son image vient d'ailleurs.
 */
export function NewsCover({ src, alt, className, sizes, priority }: NewsCoverProps) {
  const safeSrc = src ? safeNewsImageSrc(src) : null;
  if (!safeSrc) return null;

  return (
    <div className={cn("relative overflow-hidden bg-zinc-100", className)}>
      <Image
        src={safeSrc}
        alt={alt ?? ""}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={!safeSrc.startsWith("/")}
        className="object-cover"
      />
    </div>
  );
}
