"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type ComposerPopoverProps = {
  /** Icone du bouton. */
  icon: ReactNode;
  label: string;
  disabled?: boolean;
  className?: string;
  /** Contenu du panneau ; `close` le referme apres un choix qui l'exige. */
  children: (close: () => void) => ReactNode;
};

/**
 * Bouton de la zone de saisie et son panneau, ouvert au-dessus.
 *
 * Commun aux menus « Emoji » et « Jeux » : meme ancrage, meme fermeture (clic hors du
 * panneau, Echap), pour qu'ils se comportent comme une seule barre d'outils.
 */
export function ComposerPopover({
  icon,
  label,
  disabled = false,
  className,
  children,
}: ComposerPopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={disabled}
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-app-control text-app-text-muted transition-colors hover:bg-app-surface-hover hover:text-app-text focus-visible:outline-app disabled:pointer-events-none disabled:opacity-60",
          open && "bg-app-surface-hover text-app-text",
        )}
      >
        {icon}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={label}
          className={cn(
            "absolute bottom-full left-0 z-20 mb-2 max-w-[calc(100vw-2rem)] rounded-app-card border border-app-line bg-app-raised p-2 shadow-app-raised",
            className,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
