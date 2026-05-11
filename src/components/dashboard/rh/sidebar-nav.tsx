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
          className={`block px-1 py-2 hover:underline ${currentSection === "overview" ? "font-semibold" : ""}`}
        >
          Vue d&apos;ensemble
        </Link>
        <Link
          href="/dashboard/rh/collaborateurs"
          onClick={handleNavigate}
          className={`block px-1 py-2 hover:underline ${currentSection === "collaborateurs" ? "font-semibold" : ""}`}
        >
          Collaborateurs
        </Link>
        {currentSection === "collaborateurs" && (
          <div className="ml-3 space-y-1 border-l border-slate-200 pl-3 text-xs">
            <Link
              href="/dashboard/rh/collaborateurs"
              onClick={handleNavigate}
              className={`block py-1 ${currentSubSection === "collab_tous" ? "font-semibold" : ""}`}
            >
              Tous les collaborateurs
            </Link>
            <Link
              href="/dashboard/rh/collaborateurs/actifs"
              onClick={handleNavigate}
              className={`block py-1 ${currentSubSection === "collab_actifs" ? "font-semibold" : ""}`}
            >
              Actifs
            </Link>
            <Link
              href="/dashboard/rh/collaborateurs/inactifs"
              onClick={handleNavigate}
              className={`block py-1 ${currentSubSection === "collab_inactifs" ? "font-semibold" : ""}`}
            >
              Inactifs / Sortants
            </Link>
            {currentSubSection === "collab_detail" && (
              <span className="block py-1 font-semibold">Fiche collaborateur</span>
            )}
          </div>
        )}
        <Link
          href="/dashboard/rh/documents"
          onClick={handleNavigate}
          className={`block px-1 py-2 hover:underline ${currentSection === "documents" ? "font-semibold" : ""}`}
        >
          Documents
        </Link>
        {currentSection === "documents" && (
          <div className="ml-3 space-y-1 border-l border-slate-200 pl-3 text-xs">
            <Link
              href="/dashboard/rh/documents/tous"
              onClick={handleNavigate}
              className={`block py-1 ${currentSubSection === "docs_all" ? "font-semibold" : ""}`}
            >
              Tous les documents
            </Link>
            <Link
              href="/dashboard/rh/documents/cra-facture"
              onClick={handleNavigate}
              className={`block py-1 ${currentSubSection === "docs_cra_facture" ? "font-semibold" : ""}`}
            >
              CRA & Facture
            </Link>
            <Link
              href="/dashboard/rh/documents/a-valider"
              onClick={handleNavigate}
              className={`block py-1 ${currentSubSection === "docs_a_valider" ? "font-semibold" : ""}`}
            >
              A valider
            </Link>
            <Link
              href="/dashboard/rh/documents/mes-demandes"
              onClick={handleNavigate}
              className={`block py-1 ${currentSubSection === "docs_mes_demandes" ? "font-semibold" : ""}`}
            >
              Mes demandes
            </Link>
            <Link
              href="/dashboard/rh/documents/corbeille"
              onClick={handleNavigate}
              className={`block py-1 ${currentSubSection === "docs_corbeille" ? "font-semibold" : ""}`}
            >
              Corbeille
            </Link>
          </div>
        )}
        {currentSection === "offres" && (
          <div className="ml-3 space-y-1 border-l border-slate-200 pl-3 text-xs">
            <Link
              href="/dashboard/rh/offres"
              onClick={handleNavigate}
              className={`block py-1 ${currentSubSection === "offres_actives" ? "font-semibold" : ""}`}
            >
              Offres actives
            </Link>
            <Link
              href="/dashboard/rh/offres/candidatures"
              onClick={handleNavigate}
              className={`block py-1 ${currentSubSection === "offres_candidatures" ? "font-semibold" : ""}`}
            >
              Candidatures
            </Link>
            <Link
              href="/dashboard/rh/offres/archives"
              onClick={handleNavigate}
              className={`block py-1 ${currentSubSection === "offres_archives" ? "font-semibold" : ""}`}
            >
              Archives
            </Link>
            <Link
              href="/dashboard/rh/offres/creer"
              onClick={handleNavigate}
              className={`block py-1 ${currentSubSection === "offres_creer" ? "font-semibold" : ""}`}
            >
              Creer une offre
            </Link>
          </div>
        )}
      </nav>
      <div className="mt-auto space-y-1">
        <button
          type="button"
          className="flex items-center px-1 py-2 text-sm hover:underline"
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
