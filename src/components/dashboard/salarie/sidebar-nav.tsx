"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";

import type {
  SalarieDashboardSection,
  SalarieDashboardSubSection,
} from "@/features/dashboard/salarie/navigation";

type SalarieSidebarNavProps = {
  currentSection: SalarieDashboardSection;
  currentSubSection: SalarieDashboardSubSection;
  onSignOut: () => void | Promise<void>;
  onNavigate?: () => void;
};

export function SalarieSidebarNav({
  currentSection,
  currentSubSection,
  onSignOut,
  onNavigate,
}: SalarieSidebarNavProps) {
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
          href="/dashboard/salarie"
          onClick={handleNavigate}
          className={`block px-1 py-2 hover:underline ${currentSection === "overview" ? "font-semibold" : ""}`}
        >
          Vue d&apos;ensemble
        </Link>
        <Link
          href="/dashboard/salarie/documents"
          onClick={handleNavigate}
          className={`block px-1 py-2 hover:underline ${currentSection === "documents" ? "font-semibold" : ""}`}
        >
          Mes documents
        </Link>
        {currentSection === "documents" && (
          <div className="ml-3 space-y-1 border-l border-slate-200 pl-3 text-xs">
            <Link
              href="/dashboard/salarie/documents/a-deposer"
              onClick={handleNavigate}
              className={`block py-1 ${currentSubSection === "docs_a_deposer" ? "font-semibold" : ""}`}
            >
              A deposer
            </Link>
            <Link
              href="/dashboard/salarie/documents"
              onClick={handleNavigate}
              className={`block py-1 ${currentSubSection === "docs_tous" ? "font-semibold" : ""}`}
            >
              Tous mes documents
            </Link>
            <Link
              href="/dashboard/salarie/documents/cra-facture"
              onClick={handleNavigate}
              className={`block py-1 ${currentSubSection === "docs_cra_facture" ? "font-semibold" : ""}`}
            >
              CRA & Facture
            </Link>
            <Link
              href="/dashboard/salarie/documents/corbeille"
              onClick={handleNavigate}
              className={`block py-1 ${currentSubSection === "docs_corbeille" ? "font-semibold" : ""}`}
            >
              Corbeille
            </Link>
          </div>
        )}
        <Link
          href="/dashboard/salarie/offres"
          onClick={handleNavigate}
          className={`block px-1 py-2 hover:underline ${currentSection === "offres" ? "font-semibold" : ""}`}
        >
          Offres d&apos;emploi
        </Link>
        {currentSection === "offres" && (
          <div className="ml-3 space-y-1 border-l border-slate-200 pl-3 text-xs">
            <Link
              href="/dashboard/salarie/offres"
              onClick={handleNavigate}
              className={`block py-1 ${currentSubSection === "offres_toutes" ? "font-semibold" : ""}`}
            >
              Toutes les offres
            </Link>
            <Link
              href="/dashboard/salarie/candidatures"
              onClick={handleNavigate}
              className={`block py-1 ${currentSubSection === "candidatures" ? "font-semibold" : ""}`}
            >
              Mes candidatures
            </Link>
            <Link
              href="/dashboard/salarie/cv"
              onClick={handleNavigate}
              className={`block py-1 ${currentSubSection === "cvs" ? "font-semibold" : ""}`}
            >
              Mes CVs
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
