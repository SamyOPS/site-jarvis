"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { ChevronDown, LogIn, Menu, UserPlus, X } from "lucide-react";

const navLinks = [
  { label: "Accueil", href: "/" },
  { label: "Expertises", href: "/expertises" },
  { label: "Actualites", href: "/#actualites" },
  { label: "Formations", href: "/#formations" },
  { label: "Offres", href: "/#offres" },
  { label: "Contact", href: "/contact" },
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
  const pathname = usePathname();
  const router = useRouter();
  const [userLabel, setUserLabel] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [expertiseMenuOpen, setExpertiseMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [hideHeader, setHideHeader] = useState(false);
  const expertiseMenuRef = useRef<HTMLDivElement | null>(null);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    if (!supabase) return;

    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (user) {
        const meta = user.user_metadata as { full_name?: string; name?: string };
        const fullName = meta?.full_name ?? meta?.name ?? user.email ?? null;
        setUserLabel(fullName);
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
    lastScrollYRef.current = window.scrollY;
    const onScroll = () => {
      const currentY = window.scrollY;
      const lastY = lastScrollYRef.current;
      const delta = currentY - lastY;

      if (mobileNavOpen) {
        setHideHeader(false);
        lastScrollYRef.current = currentY;
        return;
      }

      if (currentY <= 80) {
        setHideHeader(false);
      } else if (delta > 6) {
        setHideHeader(true);
      } else if (delta < -4) {
        setHideHeader(false);
      }

      lastScrollYRef.current = currentY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mobileNavOpen]);

  const handleAnchorClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    if (!href.startsWith("/#")) return;

    event.preventDefault();
    const hash = href.replace("/#", "");

    if (pathname !== "/") {
      router.push(href);
      return;
    }

    const target = document.getElementById(hash);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.pushState(null, "", `/#${hash}`);
    }
  };

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

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;
    const onScroll = () => {
      const currentY = window.scrollY;
      const lastY = lastScrollYRef.current;
      const delta = currentY - lastY;

      if (mobileNavOpen) {
        setHideHeader(false);
        lastScrollYRef.current = currentY;
        return;
      }

      if (currentY <= 80) {
        setHideHeader(false);
      } else if (delta > 6) {
        setHideHeader(true);
      } else if (delta < -4) {
        setHideHeader(false);
      }

      lastScrollYRef.current = currentY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mobileNavOpen]);

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
    <header
      className={`sticky top-0 z-50 bg-[#f5f5f5] text-black border-b border-black/10 transition-transform duration-300 will-change-transform ${
        hideHeader ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 lg:px-6 overflow-visible">
        <div className="flex items-center justify-between gap-4 py-2">
          <a href="/" className="flex items-center">
            <img
              src="/logonoir.png"
              alt="Jarvis Connect"
              className="h-14 w-auto"
            />
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm text-black/70">
            {navLinks.map((link) =>
              link.label === "Expertises" ? (
                <div key={link.label} className="relative" ref={expertiseMenuRef}>
                  <button
                    type="button"
                    onClick={() => setExpertiseMenuOpen((v) => !v)}
                    className="inline-flex items-center gap-1 hover:text-black transition-all duration-200"
                  >
                    {link.label}
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  {expertiseMenuOpen ? (
                    <div className="absolute left-0 top-full mt-2 min-w-[240px] border border-black/10 bg-white p-2 shadow-lg z-50">
                      {expertiseLinks.map((item) => (
                        <a
                          key={item.href}
                          href={item.href}
                          className="block px-3 py-2 text-sm text-black/80 hover:bg-black/5 hover:text-black transition-colors"
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
                  className="hover:text-black transition-all duration-200"
                  onClick={(event) => handleAnchorClick(event, link.href)}
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
                    className="flex items-center gap-2 px-3 py-2 text-sm text-black/70 hover:text-black hover:bg-black/5 transition-colors"
                  >
                    <span className="max-w-[180px] truncate">{userLabel}</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white p-2 shadow-lg border border-black/10">
                      <a
                        href={getDashboardPath(userRole)}
                        className="block px-3 py-2 text-sm text-black/80 hover:bg-black/5 hover:text-black transition-colors"
                      >
                        Mon espace
                      </a>
                      <button
                        onClick={handleSignOut}
                        className="block w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-black/5 hover:text-red-600 transition-colors"
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
                  href="/auth"
                  aria-label="Connexion"
                  className="p-2 text-black/70 hover:text-black hover:bg-black/5 transition-colors"
                >
                  <LogIn className="h-5 w-5" />
                </a>
                <span className="h-4 w-px bg-black/10" aria-hidden="true" />
                <a
                  href="/auth"
                  aria-label="Inscription"
                  className="p-2 text-black/70 hover:text-black hover:bg-black/5 transition-colors"
                >
                  <UserPlus className="h-5 w-5" />
                </a>
              </>
            )}
            <button
              type="button"
              className="md:hidden p-2 text-black/70 hover:text-black hover:bg-black/5 transition-colors"
              aria-label={mobileNavOpen ? "Fermer le menu" : "Ouvrir le menu"}
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {mobileNavOpen ? (
          <div className="md:hidden pb-6">
            <div className="flex flex-col gap-2 rounded-2xl border border-black/10 bg-white/90 p-4 text-sm text-black/80 shadow-lg backdrop-blur">
              {navLinks.map((link) =>
                link.label === "Expertises" ? (
                  <div key={link.label} className="flex flex-col gap-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-black/50">
                      Expertises
                    </span>
                    {expertiseLinks.map((item) => (
                      <a
                        key={item.href}
                        href={item.href}
                        className="rounded-lg px-3 py-2 hover:bg-black/5 hover:text-black transition-colors"
                        onClick={() => setMobileNavOpen(false)}
                      >
                        {item.label}
                      </a>
                    ))}
                  </div>
                ) : (
                  <a
                    key={link.label}
                    href={link.href}
                    className="rounded-lg px-3 py-2 hover:bg-black/5 hover:text-black transition-colors"
                    onClick={(event) => {
                      handleAnchorClick(event, link.href);
                      setMobileNavOpen(false);
                    }}
                  >
                    {link.label}
                  </a>
                )
              )}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
