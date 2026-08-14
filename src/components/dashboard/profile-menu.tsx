"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { Grip, LogOut, Settings, User as UserIcon } from "lucide-react";

import { useDismissable } from "@/hooks/use-dismissable";

type DashboardProfileMenuProps = {
  onSignOut: () => void | Promise<void>;
  email: string;
  displayName: string;
  roleLabel: string;
  settingsHref: string;
  settingsActive: boolean;
  /**
   * Change de valeur a chaque changement de route : le menu se referme alors, comme le
   * faisait l'effet declare dans chaque espace. Le clic exterieur couvre deja le cas
   * courant, ce garde-fou couvre les navigations qui n'en produisent pas.
   */
  routeKey?: string;
};

/**
 * Le menu porte desormais son propre etat d'ouverture : les deux espaces le declaraient
 * a l'identique et le lui repassaient en quatre props (`menuRef`, `isOpen`, `onToggle`,
 * `onClose`), sans jamais s'en servir par ailleurs.
 */
export function DashboardProfileMenu({
  onSignOut,
  email,
  displayName,
  roleLabel,
  settingsHref,
  settingsActive,
  routeKey,
}: DashboardProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useDismissable<HTMLDivElement>(isOpen, () => setIsOpen(false));
  const onToggle = () => setIsOpen((open) => !open);
  const onClose = () => setIsOpen(false);

  useEffect(() => {
    setIsOpen(false);
  }, [routeKey]);

  return (
    <div ref={menuRef} className="hidden lg:fixed lg:right-4 lg:top-[18px] lg:block">
      <div className="relative">
        <div className="flex items-center gap-1 px-2 py-1">
          <Link
            href={settingsHref}
            aria-label="Parametres"
            className={`flex h-9 w-9 items-center justify-center text-[#0A1A2F]/75 transition hover:text-[#0A1A2F] ${settingsActive ? "text-[#0A1A2F]" : ""}`}
          >
            <Settings className="h-4 w-4" />
          </Link>
          <button
            type="button"
            aria-label="Applications"
            className="flex h-9 w-9 items-center justify-center text-[#0A1A2F]/75 transition hover:text-[#0A1A2F]"
          >
            <Grip className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Ouvrir le menu profil"
            aria-expanded={isOpen}
            onClick={onToggle}
            className="flex h-9 w-9 items-center justify-center text-[#0A1A2F]/75 transition hover:text-[#0A1A2F]"
          >
            <UserIcon className="h-4 w-4" />
          </button>
        </div>
        {isOpen ? (
          <div className="absolute right-0 top-full mt-3 w-[320px] rounded-[28px] border border-slate-200 bg-[#eef3fb] p-4">
            <div className="rounded-[24px] bg-white px-5 py-6 text-center">
              <UserIcon className="mx-auto h-8 w-8 text-[#0EA5B7]" />
              <p className="mt-4 text-sm text-[#0A1A2F]/60">{email}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-[#0A1A2F]">
                {displayName}
              </p>
              <p className="mt-1 text-sm text-[#0A1A2F]/65">{roleLabel}</p>
            </div>
            <div className="mt-3 space-y-2 rounded-[24px] bg-white p-3">
              <Link
                href={settingsHref}
                onClick={onClose}
                className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm text-[#0A1A2F] transition hover:bg-slate-50"
              >
                <span>Gerer mon compte</span>
                <Settings className="h-4 w-4 text-[#0A1A2F]/55" />
              </Link>
              <button
                type="button"
                onClick={() => void onSignOut()}
                className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm text-[#0A1A2F] transition hover:bg-slate-50"
              >
                <span>Se deconnecter</span>
                <LogOut className="h-4 w-4 text-[#0A1A2F]/55" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
