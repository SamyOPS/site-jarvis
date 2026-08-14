"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";

import type {
  SidebarConfig,
  SidebarSubItem,
} from "@/features/dashboard/shell/sidebar-config";

type DashboardSidebarNavProps = {
  config: SidebarConfig;
  currentSection: string;
  currentSubSection: string;
  onSignOut: () => void | Promise<void>;
  onNavigate?: () => void;
};

const itemClass = (active: boolean) =>
  `block rounded-xl px-3 py-2 transition hover:bg-white/70 ${
    active ? "border-l-4 border-[#2aa0dd] bg-white font-semibold text-[#0A1A2F] shadow-sm" : "text-[#0A1A2F]/70"
  }`;

const subItemClass = (active: boolean) =>
  `block rounded-lg px-2 py-1.5 transition hover:bg-white/70 ${
    active ? "bg-white font-semibold text-[#0A1A2F]" : "text-[#0A1A2F]/65"
  }`;

const nestedSubItemClass = (active: boolean) =>
  `block rounded-lg px-2 py-1 transition hover:bg-white/70 ${
    active ? "bg-white font-semibold text-[#0A1A2F]" : "text-[#0A1A2F]/55"
  }`;

/**
 * Barre laterale des espaces RH et salarie, pilotee par `SidebarConfig`.
 *
 * Les trois fabriques de classes ci-dessus etaient recopiees a l'identique dans les deux
 * anciens fichiers ; `nestedSubItemClass` n'existait que cote salarie, pour le seul
 * troisieme niveau de l'arborescence (les fiches de paie).
 */
export function DashboardSidebarNav({
  config,
  currentSection,
  currentSubSection,
  onSignOut,
  onNavigate,
}: DashboardSidebarNavProps) {
  const handleNavigate = () => onNavigate?.();

  const renderSubItem = (subItem: SidebarSubItem) => (
    <div key={subItem.href + subItem.subSection}>
      <Link
        href={subItem.href}
        onClick={handleNavigate}
        className={subItemClass(currentSubSection === subItem.subSection)}
      >
        {subItem.label}
      </Link>
      {subItem.children?.length ? (
        <div className="ml-2 space-y-1 border-l border-slate-200 pl-2">
          {subItem.children.map((child) => (
            <Link
              key={child.href + child.subSection}
              href={child.href}
              onClick={handleNavigate}
              className={nestedSubItemClass(currentSubSection === child.subSection)}
            >
              {child.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="flex h-full flex-col gap-4 px-4 py-5">
      <Link
        href={config.homeHref}
        onClick={handleNavigate}
        className="block rounded-2xl px-2 py-1 transition hover:bg-white/60"
      >
        <p className="text-lg font-semibold tracking-tight text-[#0A1A2F]">{config.brand}</p>
      </Link>
      <nav className="mt-5 space-y-1 text-sm">
        {config.items.map((item) => {
          const sectionActive = currentSection === item.section;
          const showStaticChild =
            item.staticChild && currentSubSection === item.staticChild.subSection;

          return (
            <div key={item.href + item.section} className="space-y-1">
              <Link
                href={item.href}
                onClick={handleNavigate}
                className={itemClass(sectionActive)}
              >
                {item.label}
              </Link>
              {sectionActive && item.children?.length ? (
                <div className="ml-3 space-y-1 border-l border-slate-200 pl-3 text-xs">
                  {item.children.map(renderSubItem)}
                  {showStaticChild ? (
                    <span className="block rounded-lg bg-white px-2 py-1.5 font-semibold text-[#0A1A2F]">
                      {item.staticChild?.label}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
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
