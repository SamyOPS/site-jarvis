"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { InstagramIcon, LinkedinIcon, Mail, MapPin } from "lucide-react";

const sitemapLinks = [
  { href: "/#top", label: "Accueil" },
  { href: "/#expertises", label: "Expertises" },
  { href: "/#actualites", label: "Actualites" },
  { href: "/#formations", label: "Formations" },
  { href: "/#offres", label: "Offres" },
  { href: "/contact", label: "Contact" },
];

const legalLinks = [
  { href: "/mentions-legales", label: "Mentions legales" },
  { href: "/politique-de-confidentialite", label: "Politique de confidentialite" },
  { href: "/cgv", label: "CGV" },
];

const solutionLinks = [
  { href: "/expertises/support", label: "Support" },
  { href: "/expertises/developpement", label: "Developpement" },
  { href: "/expertises/conseil", label: "Conseil" },
];

const socialLinks = [
  { label: "LinkedIn", href: "https://www.linkedin.com/company/jarvis-connect/posts/?feedView=all", icon: LinkedinIcon },
  { label: "Instagram", href: "https://www.instagram.com/jarvisconnect/", icon: InstagramIcon },
];

function Link3D({ href, children, onClick, className }: {
  href: string;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  className?: string;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={className}
      style={{
        display: "inline-block",
        transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1), text-shadow 0.25s ease, letter-spacing 0.25s ease",
        transformStyle: "preserve-3d",
        perspective: "300px",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = "perspective(300px) rotateX(20deg) rotateY(-6deg) translateY(-4px) scale(1.08)";
        el.style.textShadow = "2px 6px 0px rgba(0,0,0,0.25), 4px 12px 20px rgba(0,0,0,0.15)";
        el.style.letterSpacing = "0.04em";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = "none";
        el.style.textShadow = "none";
        el.style.letterSpacing = "normal";
      }}
    >
      {children}
    </a>
  );
}

export function Footer() {
  const footerRef = useRef<HTMLElement | null>(null);
  const [showBrand, setShowBrand] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const target = footerRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => setShowBrand(e.isIntersecting)),
      { threshold: 0.2 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const handleAnchorClick = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith("/#")) return;
    event.preventDefault();
    const hash = href.replace("/#", "");
    if (pathname !== "/") { router.push(href); return; }
    const target = document.getElementById(hash);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.pushState(null, "", `/#${hash}`);
    }
  };

  return (
    <footer ref={footerRef} className="relative overflow-hidden bg-[#f5f5f5] text-black border-t border-black/10">

      <div className="h-px w-full bg-gradient-to-r from-transparent via-black/20 to-transparent" />

      <div className="max-w-screen-xl mx-auto px-6 pt-16 pb-52 lg:px-12 lg:pt-20 lg:pb-64 relative z-10">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.2fr_2fr]">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
          >
            <div className="mb-8">
              <span className="text-xl font-bold tracking-tight text-black">Jarvis Connect</span>
              <p className="mt-2 text-sm text-black/50 leading-relaxed max-w-xs">
Support, développement et sécurité pour les PME, ETI et organisations à grande échelle qui veulent aller plus vite.              </p>
            </div>

            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-black">Newsletter</h3>
            <form className="flex gap-2" action="#" method="POST">
              <input
                type="email"
                name="newsletterEmail"
                placeholder="Votre email"
                className="h-10 flex-1 rounded-lg border border-black/15 bg-white px-3 text-sm text-black placeholder:text-black/40 focus:outline-none focus:border-black/40 transition-colors"
                required
              />
              <button
                type="submit"
                className="h-10 rounded-lg bg-black px-4 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-black/80"
              >
                OK
              </button>
            </form>

            <div className="mt-8">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-black">Suivez-nous</h3>
              <div className="flex gap-3">
                {socialLinks.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 bg-white text-black/50 hover:border-black/30 hover:bg-black/5 hover:text-black"
                    style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)", transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease" }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.transform = "perspective(300px) rotateX(15deg) rotateY(-8deg) translateY(-3px) scale(1.1)";
                      el.style.boxShadow = "4px 10px 24px rgba(0,0,0,0.18)";
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.transform = "none";
                      el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
                    }}
                  >
                    <item.icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1], delay: 0.1 }}
            className="grid grid-cols-2 gap-8 sm:grid-cols-3"
          >
            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-black">Sitemap</h3>
              <ul className="space-y-2">
                {sitemapLinks.map((link) => (
                  <li key={link.label}>
                    <Link3D
                      href={link.href}
                      className="text-sm text-black/60 hover:text-black"
                      onClick={(e) => handleAnchorClick(e, link.href)}
                    >
                      {link.label}
                    </Link3D>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-black">Solutions</h3>
              <ul className="space-y-2">
                {solutionLinks.map((link) => (
                  <li key={link.label}>
                    <Link3D href={link.href} className="text-sm text-black/60 hover:text-black">
                      {link.label}
                    </Link3D>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-black">Informations</h3>
              <ul className="space-y-2 mb-6">
                {legalLinks.map((link) => (
                  <li key={link.label}>
                    <Link3D href={link.href} className="text-sm text-black/60 hover:text-black">
                      {link.label}
                    </Link3D>
                  </li>
                ))}
              </ul>

              <div className="space-y-3">
                <div className="flex items-start gap-2 text-sm text-black/60">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-black" />
                  <span>Av. de la Liberation,<br />60160 Montataire</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-black/60">
                  <Mail className="h-4 w-4 shrink-0 text-black" />
                  <Link3D href="mailto:am@jarvis-connect.fr" className="hover:text-black">
                    am@jarvis-connect.fr
                  </Link3D>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-[72px] left-0 right-0 h-px bg-black/10 z-10" />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 px-4 pb-5 text-center z-10">
        <div
          className="select-none text-center font-extrabold uppercase leading-none flex flex-wrap justify-center"
          style={{ fontSize: "clamp(28px, 6vw, 90px)", perspective: "800px" }}
        >
          {"Jarvis Connect".split("").map((char, index) => (
            <motion.span
              key={`${char}-${index}`}
              className="inline-block text-black"
              style={{ textShadow: "0 4px 8px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)" }}
              initial={{ y: "110%", rotateX: -40, opacity: 0 }}
              animate={showBrand ? { y: "0%", rotateX: 0, opacity: 1 } : { y: "110%", rotateX: -40, opacity: 0 }}
              transition={{ delay: index * 0.025, duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {char === " " ? "\u00A0" : char}
            </motion.span>
          ))}
        </div>
        <div className="flex w-full max-w-screen-xl flex-col gap-1 text-[10px] uppercase tracking-[0.16em] text-black/40 sm:flex-row sm:items-center sm:justify-between">
          <div>Developpement & Design by S</div>
          <div>Jarvis Connect — Tous droits reserves</div>
        </div>
      </div>
    </footer>
  );
}