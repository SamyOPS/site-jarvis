"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { lockScroll, unlockScroll } from "@/features/vitrine/scroll-lock";

/*
  Detail plein ecran ouvert au clic sur l'image d'une fiche (Expertises, Formations).

  SEULE l'image cliquee s'anime, depuis sa position mesuree jusqu'au plein ecran (et
  retour). Le contenu est sa SOEUR et non son enfant : place dans la boite animee, il
  serait compose a la taille de la vignette puis etire. Il entre apres l'atterrissage de
  l'image et sort deux fois plus vite.

  Chaque section fournit le texte du detail (`children`) ; l'ouverture, la fermeture
  (croix, clic hors du texte, Echap) et le gel de la page sont communs.
*/

type Rect = { top: number; left: number; width: number; height: number };

// Depart lent -> acceleration -> ralentissement, pour le zoom de l'image vers le plein ecran.
const IMG_TRANSITION = { duration: 0.65, ease: [0.83, 0, 0.17, 1] as const };

/**
 * Etat du detail : quelle fiche est ouverte, et ou se trouvait son image au clic.
 * Tant qu'une fiche est ouverte, la page est figee et Echap la referme.
 */
export function useImageDetail() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);

  const open = useCallback((index: number, element: HTMLElement) => {
    const box = element.getBoundingClientRect();
    setRect({ top: box.top, left: box.left, width: box.width, height: box.height });
    setOpenIndex(index);
  }, []);
  const close = useCallback(() => setOpenIndex(null), []);

  useEffect(() => {
    if (openIndex === null) return;
    lockScroll();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenIndex(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      unlockScroll();
      window.removeEventListener("keydown", onKey);
    };
  }, [openIndex]);

  return { openIndex, rect, open, close };
}

export function ImageDetail({
  detail,
  rect,
  onClose,
  children,
}: {
  /** Fiche ouverte (`null` : detail ferme). `key` doit etre unique par fiche. */
  detail: { key: string; image: string; label: string } | null;
  rect: Rect | null;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {detail && rect && (
        <motion.div
          key={detail.key}
          role="dialog"
          aria-modal="true"
          aria-label={detail.label}
          onClick={onClose}
          className="fixed inset-0 z-[80]"
        >
          <motion.div
            initial={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, borderRadius: 12 }}
            animate={{ top: 0, left: 0, width: window.innerWidth, height: window.innerHeight, borderRadius: 0 }}
            exit={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, borderRadius: 12 }}
            transition={IMG_TRANSITION}
            className="fixed overflow-hidden"
          >
            <Image
              src={detail.image}
              alt=""
              aria-hidden="true"
              fill
              sizes="100vw"
              draggable={false}
              className="object-cover"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24, transition: { duration: 0.2 } }}
            transition={{ duration: 0.45, delay: IMG_TRANSITION.duration * 0.6, ease: "easeOut" }}
            className="pointer-events-none fixed inset-0 flex flex-col justify-end"
          >
            {/* Voile de lisibilite : une photo ne garantit aucun contraste sous le texte. */}
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/10"
            />

            <button
              type="button"
              onClick={onClose}
              autoFocus
              aria-label="Fermer le détail"
              className="pointer-events-auto absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border border-white/40 text-white transition-colors duration-300 hover:bg-white hover:text-black sm:right-8 sm:top-8"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>

            {/* `stopPropagation` : selectionner du texte ne doit pas fermer le detail. */}
            <div
              onClick={(event) => event.stopPropagation()}
              className="pointer-events-auto relative mx-auto flex max-h-[80svh] w-full max-w-5xl flex-col gap-4 overflow-y-auto px-6 pb-12 text-white sm:gap-5 sm:px-10 sm:pb-16"
            >
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
