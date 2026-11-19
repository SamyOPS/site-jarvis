import { cn } from "@/lib/utils";

/*
  Titre de section de la vitrine : petit mot en serif italique (« nos »), grand titre en
  capitales, et parfois une mention a droite (« 3 modules »). C'est le registre des
  anciennes sections pleine page (zoom des expertises, escalier des formations, mosaique
  des offres), dont il garde les tailles.

  Texte fixe : les lettres ne montent plus depuis leur ligne a l'entree a l'ecran
  (animations de texte retirees le 19/11/2026, a la demande). Composant serveur.
*/
export function SectionTitle({
  eyebrow,
  title,
  aside,
  tone = "light",
  className,
}: {
  eyebrow?: string;
  title: string;
  /** Mention en serif italique, alignee a droite sous le titre. */
  aside?: string;
  /** `light` : encre noire sur fond clair ; `dark` : encre blanche sur fond sombre. */
  tone?: "light" | "dark";
  className?: string;
}) {
  const soft = tone === "dark" ? "text-white/90" : "text-zinc-900";

  return (
    <div className={cn("inline-flex flex-col items-start", className)}>
      {eyebrow ? (
        <span
          className={cn(
            "mb-1 ml-[0.1em] px-[0.12em] font-quote text-[clamp(1.1rem,3.5vw,2.5rem)] italic leading-none",
            soft,
          )}
        >
          {eyebrow}
        </span>
      ) : null}

      <h2
        className={cn(
          "text-[clamp(2.5rem,8vw,7rem)] font-bold uppercase leading-[0.95] tracking-tight",
          tone === "dark" ? "text-white" : "text-zinc-900",
        )}
      >
        {title}
      </h2>

      {aside ? (
        <span
          className={cn(
            "mr-[0.1em] mt-1 self-end px-[0.12em] font-quote text-[clamp(1.1rem,3.5vw,2.5rem)] italic leading-none",
            soft,
          )}
        >
          {aside}
        </span>
      ) : null}
    </div>
  );
}
