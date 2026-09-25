"use client";

import type { MouseEvent } from "react";
import { usePathname } from "next/navigation";

import { usePageTransition } from "@/components/vitrine/page-transition";
import { isInternalExit } from "@/features/vitrine/nav";
import { armPageReveal } from "@/lib/page-reveal";

/**
 * Quitter la vitrine pour une destination qui vit hors du groupe (vitrine).
 *
 * `/auth` et `/offres` appartiennent bien a cette application, mais sous un autre layout :
 * le `PageTransition` de la vitrine s'y demonte, et le voile noir avec lui, d'un coup sec.
 * Il faut donc couvrir l'ecran, partir en navigation de DOCUMENT, et armer la dissipation
 * du voile pour que la page d'arrivee le reprenne a son compte.
 *
 * Le menu et le pied de page portaient chacun leur copie de cette sequence. Ce hook existe
 * pour qu'un troisieme appelant n'en ecrive pas une de plus.
 */
export function useVitrineExit(options?: {
  /**
   * Appele lorsque la destination EST la page courante. Sans lui, on repart normalement —
   * c'est-a-dire qu'on recharge la page, ce qui est rarement souhaitable.
   */
  onSamePage?: () => void;
}) {
  const pathname = usePathname();
  const { leave } = usePageTransition();

  return (event: MouseEvent, href: string) => {
    // Ouverture en nouvel onglet, clic milieu : on laisse le navigateur faire.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();

    if (href === pathname && options?.onSamePage) {
      options.onSamePage();
      return;
    }

    leave(() => {
      /*
       * Le drapeau n'est pose que pour les destinations de cette application : arme avant
       * un depart vers un site tiers, il resterait en attente et declencherait un fondu
       * parasite au retour, sur une page qui n'a rien demande.
       */
      if (isInternalExit(href)) armPageReveal();
      window.location.href = href;
    });
  };
}
