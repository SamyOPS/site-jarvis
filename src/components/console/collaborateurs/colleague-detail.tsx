"use client";

import Link from "next/link";
import { ArrowLeft, Mail, MessageSquare, Phone } from "lucide-react";

import { AvatarBubble } from "@/components/console/avatar-bubble";
import { Button } from "@/components/ui/button";

type ColleagueDetailProps = {
  colleague: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
  };
  /** Page de messagerie de l'espace, pour ouvrir la conversation. */
  messagesHref: string;
};

/**
 * Fiche d'un collegue RH.
 *
 * DELIBEREMENT EN LECTURE, et distincte de la fiche collaborateur. Cette derniere est
 * batie pour le suivi documentaire d'un consultant : documents, demandes, entreprises
 * clientes, identite de facturation. Rien de tout cela n'existe pour un pair — et le
 * serveur refuse de toute facon ses enregistrements a un RH qui n'a pas ce compte dans son
 * perimetre (`assertRhAccess`). L'y envoyer aurait donne un ecran vide et des
 * enregistrements rejetes.
 *
 * Ce qu'un RH cherche en cliquant sur un collegue, c'est de quoi le joindre. C'est donc ce
 * que la page donne, avec le raccourci vers la conversation.
 */
export function ConsoleColleagueDetail({ colleague, messagesHref }: ColleagueDetailProps) {
  const name = colleague.name.trim() || colleague.email;

  return (
    <div className="space-y-2">
      <section className="rounded-app-card border border-app-line bg-app-surface p-5">
        <div className="flex flex-wrap items-start gap-4">
          <AvatarBubble
            avatarUrl={colleague.avatarUrl}
            name={colleague.name}
            email={colleague.email}
            size={56}
            className="text-app-lg"
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-app-lg font-semibold text-app-text">{name}</h1>
              <span className="inline-flex items-center rounded-app-control border border-app-accent-soft bg-app-accent-soft px-2 py-1 text-app-xs font-medium text-app-accent-fg">
                RH
              </span>
            </div>
            <p className="mt-1 text-app-sm text-app-text-secondary">
              Gestionnaire RH — collègue de votre équipe.
            </p>
          </div>

          <Link
            href="/dashboard/rh/collaborateurs"
            className="flex shrink-0 items-center gap-2 rounded-app-control border border-app-line px-3 py-2 text-app-sm text-app-text-secondary transition-colors hover:bg-app-surface-hover hover:text-app-text focus-visible:outline-app"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
        </div>
      </section>

      <section className="rounded-app-card border border-app-line bg-app-surface">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-app-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-app-md font-semibold text-app-text">Contact</h2>
            <p className="mt-1 text-app-sm text-app-text-secondary">
              Pour le joindre directement.
            </p>
          </div>
          <Button asChild type="button" size="sm">
            <Link href={`${messagesHref}?to=${encodeURIComponent(colleague.id)}`}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Envoyer un message
            </Link>
          </Button>
        </div>

        <div className="divide-y divide-app-line px-5">
          <div className="flex items-center gap-3 py-3.5">
            <Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-app-text-muted" />
            <a
              href={`mailto:${colleague.email}`}
              className="min-w-0 truncate text-app-sm text-app-text hover:underline focus-visible:outline-app"
            >
              {colleague.email}
            </a>
          </div>

          <div className="flex items-center gap-3 py-3.5">
            <Phone aria-hidden="true" className="h-4 w-4 shrink-0 text-app-text-muted" />
            {colleague.phone ? (
              <a
                href={`tel:${colleague.phone}`}
                className="text-app-sm text-app-text hover:underline focus-visible:outline-app"
              >
                {colleague.phone}
              </a>
            ) : (
              <span className="text-app-sm text-app-text-muted">
                Aucun téléphone renseigné
              </span>
            )}
          </div>
        </div>
      </section>

      {/*
        Ni documents, ni demandes, ni entreprises clientes : ces notions n'existent pas pour
        un collegue. Et sa derniere connexion n'est pas affichee car elle n'est pas connue —
        la route d'activite ne rend que les comptes affectes au RH qui la consulte.
      */}
      <p className="px-1 text-app-xs text-app-text-muted">
        Le suivi documentaire ne concerne que les consultants : un collègue RH n&apos;a ni
        documents, ni demandes, ni entreprises clientes dans cet espace.
      </p>
    </div>
  );
}
