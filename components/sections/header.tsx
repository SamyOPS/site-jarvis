"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { ChevronDown, LogIn, Menu, UserPlus, X } from "lucide-react";

const navLinks = [
  { label: "Accueil", href: "/" },
  { label: "Expertises", href: "/expertises" },
  { label: "Actualités", href: "/actus" },
  { label: "Formations", href: "/formations" },
  { label: "Offres", href: "/offres" },
  { label: "Contact", href: "/contact" },
];

type MegaMenuColumn = { title: string; links: { label: string; href: string }[] };

type MegaMenuFeatured = {
  title: string;
  description: string;
  href: string;
  image: string;
};

type MegaMenuConfig = Record<
  string,
  {
    columns: MegaMenuColumn[];
    featured?: MegaMenuFeatured;
  }
>;

const megaMenuConfig: MegaMenuConfig = {
  Expertises: {
    columns: [
      {
        title: "Support & infogérance",
        links: [          { label: "Service Desk", href: "/expertises/support#service-desk" },
          { label: "Supervision & MCO", href: "/expertises/support#supervision-mco" },
          { label: "Infogérance", href: "/expertises/support" },
          { label: "Cybersécurité", href: "/expertises/support" },
        ],
      },
      {
        title: "Développement applicatif",
        links: [
          { label: "Applications métiers", href: "/expertises/developpement" },
          { label: "Modernisation", href: "/expertises/developpement" },
          { label: "Intégrations", href: "/expertises/developpement" },
          { label: "MVP & Delivery", href: "/expertises/developpement" },
        ],
      },
      {
        title: "Conseil & transformation",
        links: [
          { label: "Roadmap digitale", href: "/expertises/conseil" },
          { label: "Architecture", href: "/expertises/conseil" },
          { label: "Gouvernance", href: "/expertises/conseil" },
          { label: "Change & adoption", href: "/expertises/conseil" },
        ],
      },
    ],
    featured: {
      title: "À la une",
      description:
        "Accélérez la performance IT avec un partenaire unique support, apps et transformation.",
      href: "/expertises",
      image: "/images/block/placeholder-dark-1.svg",
    },
  },
  "Actualités": {
    columns: [
      {
        title: "Dernières actus",
        links: [          { label: "Cybersécurité", href: "/actus" },
          { label: "Innovation", href: "/actus" },
        ],
      },
      {
        title: "Ressources",
        links: [
          { label: "Livres blancs", href: "/actus" },
          { label: "Études", href: "/actus" },
        ],
      },
    ],
    featured: {
      title: "À la une",
      description: "Découvrez nos dernières annonces et analyses sectorielles.",
      href: "/actus",
      image: "/images/block/placeholder-dark-1.svg",
    },
  },
  Formations: {
    columns: [
      {
        title: "Parcours",
        links: [
          { label: "Support & ITSM", href: "/formations" },
          { label: "Cybersécurité", href: "/formations" },
          { label: "Cloud", href: "/formations" },
        ],
      },
      {
        title: "Modalités",
        links: [
          { label: "Inter-entreprises", href: "/formations" },
          { label: "Sur-mesure", href: "/formations" },
        ],
      },
    ],
    featured: {
      title: "À la une",
      description: "Des formations opérationnelles pour accélérer les équipes.",
      href: "/formations",
      image: "/images/block/placeholder-dark-1.svg",
    },
  },
  Offres: {
    columns: [
      {
        title: "Recrutement",
        links: [
          { label: "Toutes les offres", href: "/offres" },
          { label: "Profils IT", href: "/offres" },
          { label: "Alternance", href: "/offres" },
        ],
      },
      {
        title: "Candidats",
        links: [
          { label: "Notre approche", href: "/offres" },
          { label: "Process", href: "/offres" },
        ],
      },
    ],
    featured: {
      title: "À la une",
      description: "Rejoignez nos équipes et construisez l’IT de demain.",
      href: "/offres",
      image: "/images/block/placeholder-dark-1.svg",
    },
  },
};

const expertiseLinks = [
  { label: "Support & Infogérance", href: "/expertises/support" },
  { label: "Développement applicatif", href: "/expertises/developpement" },
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
  const [megaMenuOpen, setMegaMenuOpen] = useState<string | null>(null);
  const [megaMenuContent, setMegaMenuContent] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [hideHeader, setHideHeader] = useState(false);
  const megaMenuRef = useRef<HTMLDivElement | null>(null);
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
        setUserRole(
          profile?.role ?? (user.user_metadata as { role?: string })?.role ?? null
        );
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
        megaMenuRef.current &&
        !megaMenuRef.current.contains(event.target as Node)
      ) {
        setMegaMenuOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (megaMenuOpen) {
      setMegaMenuContent(megaMenuOpen);
    }
  }, [megaMenuOpen]);

  const activeMegaMenu = megaMenuContent
    ? megaMenuConfig[megaMenuContent]
    : null;
  const isMegaMenuOpen = Boolean(megaMenuOpen);

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
      <div
        className="relative max-w-6xl mx-auto px-4 lg:px-6 overflow-visible"
        ref={megaMenuRef}
      >
        <div className="flex items-center justify-between gap-4 py-2">
          <a
            href="/"
            className="group flex items-center px-1 py-1"
            aria-label="Jarvis Connect"
          >
            <img
              src="/logonoir.png"
              alt="Jarvis Connect"
              className="h-14 w-auto transition-transform duration-200 ease-out group-hover:-translate-y-0.5"
            />
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm text-black/70">
            {navLinks.map((link) =>
              ["Expertises", "Actualités", "Formations", "Offres"].includes(
                link.label
              ) ? (
                <div key={link.label} className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setMegaMenuOpen((current) =>
                        current === link.label ? null : link.label
                      )
                    }
                    className="inline-flex items-center gap-1 hover:text-black transition-all duration-200"
                  >
                    {link.label}
                    <ChevronDown className="h-4 w-4" />
                  </button>
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

          <div
            className={`absolute left-0 top-full w-full bg-white shadow-xl transition-[max-height,opacity,transform] duration-300 ease-out origin-top overflow-hidden ${
              isMegaMenuOpen
                ? "max-h-[700px] opacity-100 translate-y-0 pointer-events-auto border-t border-black/10"
                : "max-h-0 opacity-0 -translate-y-2 pointer-events-none border-t border-transparent"
            }`}
          >
            {activeMegaMenu ? (
              <div className="mx-auto max-w-6xl px-6 py-8">

                <div className="grid gap-8 lg:grid-cols-[2.5fr_1fr]">
                  <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {activeMegaMenu.columns.map((column) => (
                      <div key={column.title} className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/50">
                          {column.title}
                        </p>
                        <div className="flex flex-col gap-2">
                          {column.links.map((item) => (
                            <a
                              key={item.href + item.label}
                              href={item.href}
                              className="text-sm text-black/80 hover:text-black"
                              onClick={() => {
                                setMegaMenuOpen(null);
                                if (item.href.startsWith("/#")) {
                                  window.location.href = item.href;
                                  return;
                                }
                                router.push(item.href);
                              }}
                            >
                              {item.label}
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {activeMegaMenu.featured ? (
                    <a
                      href={activeMegaMenu.featured.href}
                      className="group block overflow-hidden border border-black/10"
                      onClick={() => {
                        setMegaMenuOpen(null);
                        const target = activeMegaMenu.featured?.href ?? "/";
                        if (target.startsWith("/#")) {
                          window.location.href = target;
                          return;
                        }
                        router.push(target);
                      }}
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                        <img
                          src={activeMegaMenu.featured.image}
                          alt={activeMegaMenu.featured.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-black/40">
                          À la une
                        </p>
                        <p className="mt-2 text-base font-semibold text-black">
                          {activeMegaMenu.featured.title}
                        </p>
                        <p className="mt-2 text-sm text-black/70">
                          {activeMegaMenu.featured.description}
                        </p>
                      </div>
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {userLabel ? (
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
