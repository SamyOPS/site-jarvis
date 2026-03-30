"use client";

import { useEffect, useRef, useState } from "react";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { ChevronDown, LogIn, Menu } from "lucide-react";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

type MenuLink = {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
};

const menuLinks: MenuLink[] = [
  { label: "Accueil", href: "/#top" },
  {
    label: "Expertises",
    href: "/#expertises",
    children: [
      { label: "Support & infogerance", href: "/expertises/support" },
      { label: "Developpement d'applications", href: "/expertises/developpement" },
      { label: "Conseil & transformation digital", href: "/expertises/conseil" },
    ],
  },
  { label: "Actualites", href: "/#actualites" },
  { label: "Formations", href: "/#formations" },
  { label: "Offres", href: "/#offres" },
  { label: "Contact", href: "/contact" },
];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

const getDashboardPath = (role?: string | null) => {
  if (role === "admin") return "/dashboard";
  if (role === "professional") return "/dashboard/pro";
  if (role === "salarie") return "/dashboard/salarie";
  if (role === "rh") return "/dashboard/rh";
  return "/dashboard/candidat";
};

const getSettingsPath = (role?: string | null) => {
  if (role === "salarie") return "/dashboard/salarie/parametres";
  if (role === "rh") return "/dashboard/rh/parametres";
  return getDashboardPath(role);
};

type ProfileRow = {
  full_name: string | null;
  role: string | null;
};

export function HomeHeader() {
  const [userLabel, setUserLabel] = useState<string | null>(null);
  const [dashboardPath, setDashboardPath] = useState("/auth");
  const [settingsPath, setSettingsPath] = useState("/auth");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [menuLinksVisible, setMenuLinksVisible] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!supabase) return;

    let isMounted = true;

    const loadUserState = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user) {
        if (!isMounted) return;
        setUserLabel(null);
        setDashboardPath("/auth");
        setSettingsPath("/auth");
        setMenuOpen(false);
        return;
      }

      const meta = user.user_metadata as {
        full_name?: string;
        name?: string;
        display_name?: string;
      };

      let resolvedLabel =
        meta.full_name ?? meta.name ?? meta.display_name ?? user.email ?? "Mon espace";
      let resolvedRole = (user.user_metadata as { role?: string } | undefined)?.role ?? null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .maybeSingle<ProfileRow>();

      if (!isMounted) return;

      if (profile?.full_name) {
        resolvedLabel = profile.full_name;
      }

      if (profile?.role) {
        resolvedRole = profile.role;
      }

      setUserLabel(resolvedLabel);
      setDashboardPath(getDashboardPath(resolvedRole));
      setSettingsPath(getSettingsPath(resolvedRole));
    };

    void loadUserState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadUserState();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!sheetOpen) {
      setMenuLinksVisible(false);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setMenuLinksVisible(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [sheetOpen]);

  const handleSignOut = async () => {
    if (!supabase) {
      window.location.href = "/";
      return;
    }

    await supabase.auth.signOut();
    setMenuOpen(false);
    window.location.href = "/";
  };

  return (
    <header className="absolute inset-x-0 top-0 z-50">
      <div className="w-full px-4 pt-4 sm:px-6 lg:px-8">
        <div className="grid w-full grid-cols-[auto_1fr_auto] items-center px-0 py-2 text-white">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Ouvrir le menu"
                className="inline-flex h-11 w-11 items-center justify-center text-white transition hover:opacity-75"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>

            <SheetContent
              side="left"
              className="left-4 top-4 bottom-4 h-[calc(100vh-2rem)] w-[calc(50vw-1rem)] max-w-none rounded-xl border border-[#0A1A2F]/10 bg-white px-6 py-6 text-[#0A1A2F] data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-left-0 data-[state=closed]:zoom-out-95 data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-left-0 data-[state=open]:zoom-in-95 sm:left-6 sm:top-6 sm:bottom-6 sm:h-[calc(100vh-3rem)] sm:w-[calc(50vw-1.5rem)] sm:max-w-none"
            >
              <nav className="mt-8 flex flex-col gap-2">
                {menuLinks.map((item, index) => (
                  <div
                    key={item.href}
                    className={`transition duration-500 ${
                      menuLinksVisible
                        ? "translate-x-0 opacity-100"
                        : "translate-x-4 opacity-0"
                    }`}
                    style={{
                      transitionDelay: menuLinksVisible ? `${index * 70}ms` : "0ms",
                    }}
                  >
                    <SheetClose asChild>
                      <a
                        href={item.href}
                        className={`rounded-2xl px-4 py-3 text-base font-medium transition hover:text-[#0A1A2F] ${
                          index === 0 ? "text-[#0A1A2F]" : "text-[#6b7280]"
                        }`}
                      >
                        {item.label}
                      </a>
                    </SheetClose>

                    {item.children ? (
                      <div className="mt-1 flex flex-col gap-1 pl-8">
                        {item.children.map((child) => (
                          <SheetClose asChild key={child.href}>
                            <a
                              href={child.href}
                              className="rounded-2xl px-4 py-2 text-sm font-medium text-[#8b94a3] transition hover:text-[#0A1A2F]"
                            >
                              {child.label}
                            </a>
                          </SheetClose>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          <Link
            href="/"
            className="justify-self-center text-center text-sm font-semibold uppercase tracking-[0.28em] text-white sm:text-base"
          >
            Jarvis Connect
          </Link>

          {userLabel ? (
            <div className="relative justify-self-end" ref={menuRef}>
              <button
                type="button"
                aria-label={userLabel}
                onClick={() => setMenuOpen((open) => !open)}
                className="inline-flex max-w-[220px] items-center justify-end gap-2 text-right text-sm font-semibold text-white transition hover:opacity-75"
              >
                <span className="truncate">{userLabel}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform ${
                    menuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {menuOpen ? (
                <div className="absolute right-0 mt-3 w-48 rounded-2xl bg-white p-2 text-[#0A1A2F] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
                  <Link
                    href={dashboardPath}
                    className="block rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-[#f4f7fa]"
                    onClick={() => setMenuOpen(false)}
                  >
                    Mon espace
                  </Link>
                  <Link
                    href={settingsPath}
                    className="block rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-[#f4f7fa]"
                    onClick={() => setMenuOpen(false)}
                  >
                    Parametres
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                  >
                    Deconnexion
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <Link
              href="/auth"
              aria-label="Connexion"
              className="inline-flex h-11 w-11 items-center justify-center text-white transition hover:opacity-75"
            >
              <LogIn className="h-5 w-5" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
