"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";

import type {
  RhDashboardSection,
  RhDashboardSubSection,
} from "@/features/dashboard/rh/navigation";

type RhSidebarNavProps = {
  currentSection: RhDashboardSection;
  currentSubSection: RhDashboardSubSection;
  onSignOut: () => void | Promise<void>;
  onNavigate?: () => void;
};

export function RhSidebarNav({
  currentSection,
  currentSubSection,
  onSignOut,
  onNavigate,
}: RhSidebarNavProps) {
  const handleNavigate = () => onNavigate?.();
  const itemClass = (active: boolean) =>
    `block rounded-xl px-3 py-2 transition hover:bg-white/70 ${
      active ? "border-l-4 border-[#2aa0dd] bg-white font-semibold text-[#0A1A2F] shadow-sm" : "text-[#0A1A2F]/70"
    }`;
  const subItemClass = (active: boolean) =>
    `block rounded-lg px-2 py-1.5 transition hover:bg-white/70 ${
      active ? "bg-white font-semibold text-[#0A1A2F]" : "text-[#0A1A2F]/65"
    }`;

  return (
    <div className="flex h-full flex-col gap-4 px-4 py-5">
      <Link
        href="/"
        onClick={handleNavigate}
        className="block rounded-2xl px-2 py-1 transition hover:bg-white/60"
      >
        <p className="text-lg font-semibold tracking-tight text-[#0A1A2F]">Jarvis Connect</p>
      </Link>
      <nav className="mt-5 space-y-1 text-sm">
        <Link
          href="/dashboard/rh"
          onClick={handleNavigate}
          className={itemClass(currentSection === "overview")}
        >
          Vue d&apos;ensemble
        </Link>
        <Link
          href="/dashboard/rh/collaborateurs"
          onClick={handleNavigate}
          className={itemClass(currentSection === "collaborateurs")}
        >
          Collaborateurs
        </Link>
        {currentSection === "collaborateurs" && (
          <div className="ml-3 space-y-1 border-l border-slate-200 pl-3 text-xs">
            <Link
              href="/dashboard/rh/collaborateurs"
              onClick={handleNavigate}
              className={subItemClass(currentSubSection === "collab_tous")}
            >
              Tous les collaborateurs
            </Link>
            <Link
              href="/dashboard/rh/collaborateurs/actifs"
              onClick={handleNavigate}
              className={subItemClass(currentSubSection === "collab_actifs")}
            >
              Actifs
            </Link>
            <Link
              href="/dashboard/rh/collaborateurs/inactifs"
              onClick={handleNavigate}
              className={subItemClass(currentSubSection === "collab_inactifs")}
            >
              Inactifs / Sortants
            </Link>
            {currentSubSection === "collab_detail" && (
              <span className="block rounded-lg bg-white px-2 py-1.5 font-semibold text-[#0A1A2F]">Fiche collaborateur</span>
            )}
          </div>
        )}
        <Link
          href="/dashboard/rh/documents"
          onClick={handleNavigate}
          className={itemClass(currentSection === "documents")}
        >
          Documents
        </Link>
        {currentSection === "documents" && (
          <div className="ml-3 space-y-1 border-l border-slate-200 pl-3 text-xs">
            <Link
              href="/dashboard/rh/documents/tous"
              onClick={handleNavigate}
              className={subItemClass(currentSubSection === "docs_all")}
            >
              Tous les documents
            </Link>
            <Link
              href="/dashboard/rh/documents/cra-facture"
              onClick={handleNavigate}
              className={subItemClass(currentSubSection === "docs_cra_facture")}
            >
              CRA & Facture
            </Link>
            <Link
              href="/dashboard/rh/documents/a-valider"
              onClick={handleNavigate}
              className={subItemClass(currentSubSection === "docs_a_valider")}
            >
              A valider
            </Link>
            <Link
              href="/dashboard/rh/documents/mes-demandes"
              onClick={handleNavigate}
              className={subItemClass(currentSubSection === "docs_mes_demandes")}
            >
              Mes demandes
            </Link>
            <Link
              href="/dashboard/rh/documents/corbeille"
              onClick={handleNavigate}
              className={subItemClass(currentSubSection === "docs_corbeille")}
            >
              Corbeille
            </Link>
          </div>
        )}
        <Link
          href="/dashboard/rh/offres"
          onClick={handleNavigate}
          className={itemClass(currentSection === "offres")}
        >
          Offres
        </Link>
        {currentSection === "offres" && (
          <div className="ml-3 space-y-1 border-l border-slate-200 pl-3 text-xs">
            <Link
              href="/dashboard/rh/offres"
              onClick={handleNavigate}
              className={subItemClass(currentSubSection === "offres_actives")}
            >
              Offres actives
            </Link>
            <Link
              href="/dashboard/rh/offres/candidatures"
              onClick={handleNavigate}
              className={subItemClass(currentSubSection === "offres_candidatures")}
            >
              Candidatures
            </Link>
            <Link
              href="/dashboard/rh/offres/archives"
              onClick={handleNavigate}
              className={subItemClass(currentSubSection === "offres_archives")}
            >
              Archives
            </Link>
            <Link
              href="/dashboard/rh/offres/creer"
              onClick={handleNavigate}
              className={subItemClass(currentSubSection === "offres_creer")}
            >
              Creer une offre
            </Link>
          </div>
        )}
      </nav>
      <div className="mt-auto space-y-1">
        <button
          type="button"
          className="flex items-center rounded-xl px-3 py-2 text-sm text-[#0A1A2F]/70 transition hover:bg-white/70 hover:text-[#0A1A2F]"
          onClick={() => {
            handleNavigate();
            void onSignOut();
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Deconnexion
        </button>
      </div>
    </div>
  );
}
