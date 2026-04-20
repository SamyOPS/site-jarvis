"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { ChevronDown, LogIn, Menu, X } from "lucide-react";
import { forceClientSignOut, safeGetClientSession } from "@/lib/client-auth";

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

const navLinks = [
  { label: "Expertises", href: "/#expertises" },
  { label: "Clients", href: "/#clients" },
  { label: "Actualités", href: "/#actualites" },
  { label: "Formations", href: "/#formations" },
  { label: "Offres", href: "/#offres" },
];

export function HomeHeader() {
  const [userLabel, setUserLabel] = useState<string | null>(null);
  const [dashboardPath, setDashboardPath] = useState("/auth");
  const [settingsPath, setSettingsPath] = useState("/auth");
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let isMounted = true;

    const loadUserState = async () => {
      const { session } = await safeGetClientSession(supabase);
      const user = session?.user;

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

      if (profile?.full_name) resolvedLabel = profile.full_name;
      if (profile?.role) resolvedRole = profile.role;

      setUserLabel(resolvedLabel);
      setDashboardPath(getDashboardPath(resolvedRole));
      setSettingsPath(getSettingsPath(resolvedRole));
    };

    void loadUserState();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
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
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [menuOpen]);

  const handleSignOut = async () => {
    if (!supabase) { window.location.href = "/"; return; }
    await forceClientSignOut(supabase);
    setMenuOpen(false);
    window.location.href = "/";
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0A1A2F]/95 backdrop-blur-md shadow-lg shadow-black/20"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">

          <Link
            href="/"
            className="flex items-center gap-2.5 hover:opacity-85 transition-opacity duration-200"
          >
            <img
              src="/logo jarvis.png"
              alt="Jarvis Connect"
              className="h-15 w-15 object-contain"
            />
            <span className="text-sm font-bold uppercase tracking-[0.28em] text-white">
              Jarvis Connect
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-sm font-medium text-white/80 hover:text-[#2aa0dd] hover:bg-white/5 rounded-lg transition-all duration-200"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {userLabel ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
                >
                  <span className="max-w-[140px] truncate">{userLabel}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-3 w-48 rounded-2xl bg-white p-2 text-[#0A1A2F] shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
                    <Link href={dashboardPath} className="block rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-[#f4f7fa]" onClick={() => setMenuOpen(false)}>
                      Mon espace
                    </Link>
                    <Link href={settingsPath} className="block rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-[#f4f7fa]" onClick={() => setMenuOpen(false)}>
                      Paramètres
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleSignOut()}
                      className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                    >
                      Déconnexion
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 rounded-xl bg-[#2aa0dd] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1e8bbf] active:scale-95"
              >
                <LogIn className="h-4 w-4" />
                Connexion
              </Link>
            )}

            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center rounded-lg p-2 text-white hover:bg-white/10 transition"
              onClick={() => setMobileOpen((o) => !o)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-white/10 bg-[#0A1A2F]/95 backdrop-blur-md pb-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-4 py-3 text-sm font-medium text-white/80 hover:text-[#2aa0dd] transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
