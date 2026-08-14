import { cn } from "@/lib/utils";

/**
 * Marque de la console. Le projet ne dispose pas d'un logo Jarvis vectoriel
 * (seuls Logo-Inetum.png et auth/SIIT.png existent, qui sont des logos
 * clients) : la marque est donc dessinee en SVG, sur l'accent, pour rester
 * nette en 24px et suivre le theme.
 */
export function ConsoleMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("h-6 w-6 shrink-0", className)}
    >
      <rect
        x="1"
        y="1"
        width="22"
        height="22"
        rx="6"
        className="fill-app-accent-soft stroke-app-accent"
        strokeWidth="1.5"
      />
      <path
        d="M15 6.5v7.75a3.75 3.75 0 0 1-6.4 2.65"
        fill="none"
        className="stroke-app-accent"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
