"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { ChevronDown, LogIn, UserPlus } from "lucide-react";

const navLinks = [
  { label: "Accueil", href: "#" },
  { label: "Expertises", href: "#expertises" },
  { label: "Clients", href: "#clients" },
  { label: "Actualites", href: "#actualites" },
  { label: "Formations", href: "#formations" },
  { label: "Offres", href: "#offres" },
];

const expertiseLinks = [
  { label: "Support & Infogerance", href: "/expertises/support" },
  { label: "Developpement applicatif", href: "/expertises/developpement" },
  { label: "Conseil & Transformation", href: "/expertises/conseil" },
];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export function Header() {
  const [userLabel, setUserLabel] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [expertiseMenuOpen, setExpertiseMenuOpen] = useState(false);
  const expertiseMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!supabase) return;

    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (user) {
        const meta = user.user_metadata as { full_name?: string; name?: string };
        const fullName = meta?.full_name ?? meta?.name ?? user.email ?? null;
        setUserLabel(fullName);
        // récupérer le rôle stocké dans profiles si possible
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        setUserRole(profile?.role ?? (user.user_metadata as { role?: string })?.role ?? null);
      } else {
        setUserLabel(null);
        setUserRole(null);
      }
    };

    void load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void load();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        expertiseMenuRef.current &&
        !expertiseMenuRef.current.contains(event.target as Node)
      ) {
        setExpertiseMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getDashboardPath = (role?: string | null) => {
    if (role === "admin") return "/dashboard";
    if (role === "professional") return "/dashboard/pro";
    if (role === "salarie") return "/dashboard/salarie";
    return "/dashboard/candidat";
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-50 bg-black text-white border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between gap-4 py-4">
          <a href="#" className="flex items-center">
            <img
              src="/logo%20jarvis.png"
              alt="Jarvis Connect"
              className="h-10 w-auto"
            />
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm text-white/80">
            {navLinks.map((link) =>
              link.label === "Expertises" ? (
                <div key={link.label} className="relative" ref={expertiseMenuRef}>
                  <button
                    type="button"
                    onClick={() => setExpertiseMenuOpen((v) => !v)}
                    className="inline-flex items-center gap-1 hover:text-white transition-all duration-200 hover:[text-shadow:0_0_12px_#1A73E8]"
                  >
                    {link.label}
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  {expertiseMenuOpen ? (
                    <div className="absolute left-0 top-full mt-2 min-w-[240px] border border-white/10 bg-black/90 p-2 shadow-lg">
                      {expertiseLinks.map((item) => (
                        <a
                          key={item.href}
                          href={item.href}
                          className="block px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                          onClick={() => setExpertiseMenuOpen(false)}
                        >
                          {item.label}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  className="hover:text-white transition-all duration-200 hover:[text-shadow:0_0_12px_#1A73E8]"
                >
                  {link.label}
                </a>
              )
            )}
          </nav>

          <div className="flex items-center gap-2">
            {userLabel ? (
              <>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((open) => !open)}
                    onBlur={() => setTimeout(() => setMenuOpen(false), 120)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <span className="max-w-[180px] truncate">{userLabel}</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-black/90 p-2 shadow-lg">
                      <a
                        href={getDashboardPath(userRole)}
                        className="block px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        Mon espace
                      </a>
                      <button
                        onClick={handleSignOut}
                        className="block w-full px-3 py-2 text-left text-sm text-red-100 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        Déconnexion
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <a
                  href="/login"
                  aria-label="Connexion"
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <LogIn className="h-5 w-5" />
                </a>
                <span className="h-4 w-px bg-white/20" aria-hidden="true" />
                <a
                  href="/register"
                  aria-label="Inscription"
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <UserPlus className="h-5 w-5" />
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
