"use client";

import { useEffect, useRef, useState } from "react";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { ChevronDown, LogIn } from "lucide-react";

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
        <div className="relative grid w-full grid-cols-[1fr_auto] items-center px-0 py-2 text-white">
          <Link
            href="/"
            className="absolute left-1/2 -translate-x-1/2 text-center text-sm font-semibold uppercase tracking-[0.28em] text-white sm:text-base"
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
