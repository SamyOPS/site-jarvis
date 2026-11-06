"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { usePageTransition } from "@/components/vitrine/page-transition";

type VitrineLinkProps = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

/**
 * Lien interne a la vitrine : le meme fondu au noir que le menu et le pied de page.
 *
 * Un <Link> reste dessous : prechargement de la page cible, vrai <a> pour le clavier et
 * les lecteurs d'ecran. Seul le clic simple est intercepte — ctrl/cmd/⇧ + clic et le clic
 * milieu ouvrent toujours un nouvel onglet.
 */
export default function VitrineLink({ href, onClick, ...props }: VitrineLinkProps) {
  const { navigate } = usePageTransition();

  return (
    <Link
      href={href}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        ) {
          return;
        }
        event.preventDefault();
        navigate(href);
      }}
    />
  );
}
