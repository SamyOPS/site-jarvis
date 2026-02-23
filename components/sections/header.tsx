"use client";

import React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
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

const expertisesMenu = {
  key: "/expertises",
  title: "Expertises",
  links: [
    { label: "Support & infogérance", href: "/expertises/support" },
    { label: "Développement applicatif", href: "/expertises/developpement" },
    { label: "Conseil & transformation", href: "/expertises/conseil" },
  ],
};

const formationsMenu = {
  key: "/formations",
  title: "Formations",
  links: [
    { label: "Support & ITSM", href: "/formations" },
    { label: "Cybersécurité", href: "/formations" },
    { label: "Cloud", href: "/formations" },
  ],
};

type NewsItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image: string | null;
  published_at: string | null;
  created_at: string;
};

type JobOffer = {
  id: string;
  title: string;
  published_at: string | null;
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
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [activeMegaMenu, setActiveMegaMenu] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [hideHeader, setHideHeader] = useState(false);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [offers, setOffers] = useState<JobOffer[]>([]);
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
    if (!supabase) return;

    const loadMenuData = async () => {
      const { data: newsData } = await supabase
        .from("news")
        .select("id,title,slug,excerpt,cover_image,published_at,created_at")
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(10);

      setNewsItems(newsData ?? []);

      const { data: offersData } = await supabase
        .from("job_offers")
        .select("id,title,published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(10);

      setOffers(offersData ?? []);
    };

    void loadMenuData();
  }, []);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;
    const onScroll = () => {
      const currentY = window.scrollY;
      const lastY = lastScrollYRef.current;
      const delta = currentY - lastY;

      if (megaMenuOpen) {
        setMegaMenuOpen(false);
      }

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
  }, [mobileNavOpen, megaMenuOpen]);

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
        setMegaMenuOpen(false);
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

  const actusLinks = useMemo(
    () =>
      newsItems.slice(0, 10).map((item) => ({
        label: item.title,
        href: `/actus/${item.slug}`,
      })),
    [newsItems]
  );

  const offersLinks = useMemo(
    () =>
      offers.slice(0, 10).map((offer) => ({
        label: offer.title,
        href: `/offres/${offer.id}`,
      })),
    [offers]
  );

  const latestNews = newsItems[0] ?? null;

  const actusItems = useMemo(
    () =>
      newsItems.slice(0, 6).map((item) => ({
        label: item.title,
        description: item.excerpt ?? "Actualité publiée récemment.",
        href: `/actus/${item.slug}`,
      })),
    [newsItems]
  );

  const offersItems = useMemo(
    () =>
      offers.slice(0, 6).map((offer) => ({
        label: offer.title,
        description: "Poste à pourvoir — rejoignez-nous.",
        href: `/offres/${offer.id}`,
      })),
    [offers]
  );

  const megaPanels = useMemo(
    () => ({
      "/expertises": {
        title: "Expertises",
        intro:
          "Un accompagnement complet pour vos projets IT & digital, de l’architecture au run.",
        items: [
          {
            label: "Support & infogérance",
            description:
              "Service desk, supervision, MCO et pilotage SLA pour une disponibilité maximale.",
            href: "/expertises/support",
          },
          {
            label: "Développement applicatif",
            description:
              "Conception, delivery, modernisation et intégrations sur mesure.",
            href: "/expertises/developpement",
          },
          {
            label: "Conseil & transformation",
            description:
              "Roadmap digitale, architecture et conduite du changement.",
            href: "/expertises/conseil",
          },
        ],
      },
      "/actus": {
        title: "Actualités",
        intro:
          "Nos dernières annonces, partenariats et initiatives pour rester au plus près de vos enjeux.",
        items: actusItems.length
          ? actusItems
          : [
              {
                label: "Voir toutes les actus",
                description: "Retrouvez toutes nos actualités publiées.",
                href: "/actus",
              },
            ],
      },
      "/formations": {
        title: "Formations",
        intro:
          "Des parcours courts et opérationnels pour faire monter vos équipes en compétence.",
        items: [
          {
            label: "Support & ITSM",
            description: "Process ITIL, outils et bonnes pratiques de run.",
            href: "/formations",
          },
          {
            label: "Cybersécurité",
            description: "Sensibilisation, fondamentaux et réflexes opérationnels.",
            href: "/formations",
          },
          {
            label: "Cloud",
            description: "Architecture, migrations et exploitation cloud.",
            href: "/formations",
          },
        ],
      },
      "/offres": {
        title: "Offres",
        intro:
          "Rejoignez une équipe engagée sur des missions variées et à fort impact.",
        items: offersItems.length
          ? offersItems
          : [
              {
                label: "Voir toutes les offres",
                description: "Découvrez les postes actuellement ouverts.",
                href: "/offres",
              },
            ],
      },
    }),
    [actusItems, offersItems]
  );

  const activePanelKey =
    activeMegaMenu && megaPanels[activeMegaMenu] ? activeMegaMenu : "/expertises";
  const activePanel = megaPanels[activePanelKey];

  return (
    <header
      className={`sticky top-0 z-50 bg-[#f5f5f5] text-black border-b border-black/10 transition-transform duration-300 will-change-transform ${
        hideHeader ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div
        className="relative max-w-6xl mx-auto px-4 lg:px-6 overflow-visible"
        ref={megaMenuRef}
        onMouseLeave={() => { setMegaMenuOpen(false); setActiveMegaMenu(null); }}
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
            {navLinks.map((link) => (
              <React.Fragment key={link.label}>
                {["Expertises", "Contact"].includes(link.label) && (
                  <span className="h-4 w-px bg-black/15" aria-hidden="true" />
                )}
                {["/expertises", "/actus", "/formations", "/offres"].includes(
                  link.href
                ) ? (
                  <div className="relative">
                    <button
                      type="button"
                      onMouseEnter={() => { setMegaMenuOpen(true); setActiveMegaMenu(link.href); }}
                      onFocus={() => { setMegaMenuOpen(true); setActiveMegaMenu(link.href); }}
                      onClick={() => {
                        setMegaMenuOpen(false);
                        setActiveMegaMenu(link.href);
                        const sectionTargets: Record<string, string> = {
                          "/expertises": "/#expertises",
                          "/actus": "/#actualites",
                          "/formations": "/#formations",
                          "/offres": "/#offres",
                        };
                        router.push(sectionTargets[link.href] ?? link.href);
                      }}
                      className="relative inline-flex items-center text-sm text-black/70 hover:text-[#2F5BFF] transition-colors duration-200 transition-all duration-200 after:absolute after:-bottom-2 after:left-1/2 after:h-[2px] after:w-0 after:-translate-x-1/2 after:bg-[#2F5BFF] after:transition-all after:duration-300 hover:after:w-full"
                    >
                      {link.label}
                    </button>
                  </div>
                ) : (
                  <a
                    href={link.href}
                    className="relative inline-flex items-center text-sm text-black/70 hover:text-[#2F5BFF] transition-all duration-200 after:absolute after:-bottom-2 after:left-1/2 after:h-[2px] after:w-0 after:-translate-x-1/2 after:bg-[#2F5BFF] after:transition-all after:duration-300 hover:after:w-full"
                    onMouseEnter={() => { setMegaMenuOpen(false); setActiveMegaMenu(null); }}
                    onClick={(event) => handleAnchorClick(event, link.href)}
                  >
                    {link.label}
                  </a>
                )}
              </React.Fragment>
            ))}
          </nav>

          <div
            onMouseEnter={() => setMegaMenuOpen(true)}
            className={`absolute left-0 top-full w-full bg-white shadow-xl transition-[max-height,opacity,transform] duration-650 ease-out origin-top overflow-hidden ${
              megaMenuOpen
                ? "max-h-[700px] opacity-100 translate-y-0 pointer-events-auto border-t border-black/10"
                : "max-h-0 opacity-0 -translate-y-2 pointer-events-none border-t border-transparent"
            }`}
          >
            <div className="mx-auto max-w-6xl px-6 py-8">
              <div className={`space-y-8 transition-opacity duration-600 ${megaMenuOpen ? "opacity-100" : "opacity-0"}`}
              style={{ transitionDelay: megaMenuOpen ? "120ms" : "0ms" }}>
                
                <div className="grid gap-8 border-b border-black/10 pb-8 md:grid-cols-[1.1fr_1.9fr]">
                  <div
                    className={"space-y-3 transition-all duration-850 "+
                      (megaMenuOpen
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-2")}
                    style={{ transitionDelay: "200ms" }}
                  >
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-black/55">
                      {activePanel.title}
                    </p>
                    <p className="text-base leading-7 text-black/70">{activePanel.intro}</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {activePanel.items.map((item, itemIndex) => (
                      <a
                        key={item.href + item.label}
                        href={item.href}
                        className={
                          "rounded-xl border border-black/10 bg-white px-4 py-3 text-black/85 transition-all duration-850 hover:border-[#2F5BFF]/30 hover:text-[#2F5BFF] hover:shadow-md " +
                          (megaMenuOpen
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 translate-y-2")
                        }
                        style={{ transitionDelay: `${320 + itemIndex * 70}ms` }}
                        onClick={() => {
                          setMegaMenuOpen(false);
                          if (item.href.startsWith("/#")) {
                            window.location.href = item.href;
                            return;
                          }
                          router.push(item.href);
                        }}
                      >
                        <p className="text-base font-semibold text-black">{item.label}</p>
                        <p className="text-sm text-black/60">{item.description}</p>
                      </a>
                    ))}
                  </div>
                </div>

                <div className="grid items-center gap-6 md:grid-cols-[1.4fr_1fr]">
                  <div className={`space-y-3 transition-all duration-850 ${megaMenuOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
                    style={{ transitionDelay: "520ms" }}>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-black/55">{"À la une"}</p>
                    <h3 className="text-xl font-semibold text-black">
                      {latestNews?.title ?? "Dernière actualité"}
                    </h3>
                    <p className="text-base leading-7 text-black/70">
                      {latestNews?.excerpt ??
                        "Découvrez la dernière actualité publiée sur le site."}
                    </p>
                    <a
                      href={latestNews ? `/actus/${latestNews.slug}` : "/actus"}
                      className="inline-flex text-base font-medium text-[#000080] hover:underline"
                    >
                      Lire l'article
                    </a>
                  </div>
                  <div className={`hidden md:block transition-all duration-850 ${megaMenuOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
                    style={{ transitionDelay: "680ms" }}>
                    <div className="border border-black/10 bg-white">
                      <div className={`aspect-[4/3] overflow-hidden bg-slate-100 transition-[clip-path] duration-[1200ms] ease-out ${megaMenuOpen ? "[clip-path:inset(0_0_0_0)]" : "[clip-path:inset(0_0_100%_0)]"}`}>
                        {latestNews?.cover_image ? (
                          <img
                            src={latestNews.cover_image}
                            alt={latestNews.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm text-black/50">
                            {"Image à venir"}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {userLabel ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  onBlur={() => setTimeout(() => setMenuOpen(false), 120)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-black/70 hover:text-[#2F5BFF] hover:bg-black/5 transition-colors"
                >
                  <span className="max-w-[180px] truncate">{userLabel}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white p-2 shadow-lg border border-black/10">
                    <a
                      href={getDashboardPath(userRole)}
                      className="block px-3 py-2 text-sm text-black/80 hover:bg-black/5 hover:text-[#2F5BFF] transition-colors"
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
                  className="p-2 text-black/70 hover:text-[#2F5BFF] hover:bg-black/5 transition-colors"
                >
                  <LogIn className="h-5 w-5" />
                </a>
                <span className="h-4 w-px bg-black/10" aria-hidden="true" />
                <a
                  href="/auth"
                  aria-label="Inscription"
                  className="p-2 text-black/70 hover:text-[#2F5BFF] hover:bg-black/5 transition-colors"
                >
                  <UserPlus className="h-5 w-5" />
                </a>
              </>
            )}
            <button
              type="button"
              className="md:hidden p-2 text-black/70 hover:text-[#2F5BFF] hover:bg-black/5 transition-colors"
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
                        className="rounded-lg px-3 py-2 hover:bg-black/5 hover:text-[#2F5BFF] transition-colors"
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
                    className="rounded-lg px-3 py-2 hover:bg-black/5 hover:text-[#2F5BFF] transition-colors"
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