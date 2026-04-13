import type { RefObject } from "react";

import Link from "next/link";
import { Grip, LogOut, Settings, User as UserIcon } from "lucide-react";

type DashboardProfileMenuProps = {
  menuRef: RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSignOut: () => void | Promise<void>;
  email: string;
  displayName: string;
  roleLabel: string;
  settingsHref: string;
  settingsActive: boolean;
};

export function DashboardProfileMenu({
  menuRef,
  isOpen,
  onToggle,
  onClose,
  onSignOut,
  email,
  displayName,
  roleLabel,
  settingsHref,
  settingsActive,
}: DashboardProfileMenuProps) {
  return (
    <div ref={menuRef} className="hidden lg:fixed lg:right-4 lg:top-[18px] lg:block">
      <div className="relative">
        <div className="flex items-center gap-1 rounded-full border border-white/60 bg-white/85 px-2 py-1 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur">
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
          <div className="absolute right-0 top-full mt-3 w-[320px] rounded-[28px] border border-slate-200 bg-[#eef3fb] p-4 shadow-[0_24px_48px_rgba(15,23,42,0.18)]">
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
