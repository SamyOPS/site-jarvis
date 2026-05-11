"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { LogOut, Menu, Settings, User as UserIcon } from "lucide-react";

import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type DashboardMobileHeaderProps = {
  brand: string;
  brandHref?: string;
  email: string;
  displayName: string;
  roleLabel: string;
  settingsHref: string;
  settingsActive?: boolean;
  onSignOut: () => void | Promise<void>;
  renderNav: (closeSheet: () => void) => ReactNode;
};

export function DashboardMobileHeader({
  brand,
  brandHref = "/",
  email,
  displayName,
  roleLabel,
  settingsHref,
  settingsActive,
  onSignOut,
  renderNav,
}: DashboardMobileHeaderProps) {
  const [navOpen, setNavOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const closeNav = () => setNavOpen(false);
  const closeProfile = () => setProfileOpen(false);

  return (
    <div className="flex items-center justify-between gap-2 px-1 py-1 lg:hidden">
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label="Ouvrir le menu de navigation"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/70 bg-white/80 text-[#0A1A2F]/85 transition active:bg-white"
          >
            <Menu className="h-5 w-5" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] max-w-[85vw] p-0">
          <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
          <div className="flex h-full flex-col overflow-y-auto">{renderNav(closeNav)}</div>
        </SheetContent>
      </Sheet>

      <Link
        href={brandHref}
        className="truncate px-2 text-base font-semibold tracking-tight text-[#0A1A2F]"
      >
        {brand}
      </Link>

      <Sheet open={profileOpen} onOpenChange={setProfileOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label="Ouvrir mon profil"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/70 bg-white/80 text-[#0A1A2F]/85 transition active:bg-white"
          >
            <UserIcon className="h-5 w-5" />
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[300px] max-w-[85vw] p-0">
          <SheetTitle className="sr-only">Mon profil</SheetTitle>
          <div className="flex h-full flex-col gap-4 overflow-y-auto p-5">
            <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-center">
              <UserIcon className="mx-auto h-7 w-7 text-[#0EA5B7]" />
              <p className="mt-3 truncate text-sm text-[#0A1A2F]/60">{email}</p>
              <p className="mt-1 truncate text-lg font-semibold text-[#0A1A2F]">{displayName}</p>
              <p className="mt-1 text-xs text-[#0A1A2F]/65">{roleLabel}</p>
            </div>
            <div className="space-y-1">
              <Link
                href={settingsHref}
                onClick={closeProfile}
                className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm transition hover:bg-slate-50 ${settingsActive ? "bg-slate-50 font-medium" : ""}`}
              >
                <span>Gerer mon compte</span>
                <Settings className="h-4 w-4 text-[#0A1A2F]/55" />
              </Link>
              <button
                type="button"
                onClick={() => {
                  closeProfile();
                  void onSignOut();
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm transition hover:bg-slate-50"
              >
                <span>Se deconnecter</span>
                <LogOut className="h-4 w-4 text-[#0A1A2F]/55" />
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
