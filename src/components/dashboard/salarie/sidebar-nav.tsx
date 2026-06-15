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
          href="/dashboard/salarie"
          onClick={handleNavigate}
          className={itemClass(currentSection === "overview")}
        >
          Vue d&apos;ensemble
        </Link>
        <Link
          href="/dashboard/salarie/documents"
          onClick={handleNavigate}
          className={itemClass(currentSection === "documents")}
        >
          Mes documents
        </Link>
        {currentSection === "documents" && (
          <div className="ml-3 space-y-1 border-l border-slate-200 pl-3 text-xs">
            <Link
              href="/dashboard/salarie/documents/a-deposer"
              onClick={handleNavigate}
              className={subItemClass(currentSubSection === "docs_a_deposer")}
            >
              A deposer
            </Link>
            <Link
              href="/dashboard/salarie/documents"
              onClick={handleNavigate}
              className={subItemClass(currentSubSection === "docs_tous")}
            >
              Tous mes documents
            </Link>
            <Link
              href="/dashboard/salarie/documents/cra-facture"
              onClick={handleNavigate}
              className={subItemClass(currentSubSection === "docs_cra_facture")}
            >
              CRA & Facture
            </Link>
            <Link
              href="/dashboard/salarie/documents/corbeille"
              onClick={handleNavigate}
              className={subItemClass(currentSubSection === "docs_corbeille")}
            >
              Corbeille
            </Link>
          </div>
        )}
        <Link
          href="/dashboard/salarie/offres"
          onClick={handleNavigate}
          className={itemClass(currentSection === "offres")}
        >
          Offres d&apos;emploi
        </Link>
        {currentSection === "offres" && (
          <div className="ml-3 space-y-1 border-l border-slate-200 pl-3 text-xs">
            <Link
              href="/dashboard/salarie/offres"
              onClick={handleNavigate}
              className={subItemClass(currentSubSection === "offres_toutes")}
            >
              Toutes les offres
            </Link>
            <Link
              href="/dashboard/salarie/candidatures"
              onClick={handleNavigate}
              className={subItemClass(currentSubSection === "candidatures")}
            >
              Mes candidatures
            </Link>
            <Link
              href="/dashboard/salarie/cv"
              onClick={handleNavigate}
              className={subItemClass(currentSubSection === "cvs")}
            >
              Mes CVs
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
