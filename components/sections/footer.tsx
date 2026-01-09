"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { InstagramIcon, LinkedinIcon } from "lucide-react";

const sitemapLinks = [
  { href: "/", label: "Accueil" },
  { href: "/expertises", label: "Expertises" },
  { href: "/#actualites", label: "Actualites" },
  { href: "/#formations", label: "Formations" },
  { href: "/offres", label: "Offres" },
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
  { label: "LinkedIn", href: "#", icon: LinkedinIcon },
  { label: "Instagram", href: "#", icon: InstagramIcon },
];

export function Footer() {
  const footerRef = useRef<HTMLElement | null>(null);
  const [showBrand, setShowBrand] = useState(false);

  useEffect(() => {
    const target = footerRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setShowBrand(entry.isIntersecting);
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <footer ref={footerRef} className="relative overflow-visible sm:overflow-hidden bg-[#f5f5f5] text-black border-t border-black/10">
      <div className="max-w-screen-xl mx-auto px-6 pt-20 pb-48 lg:px-12 lg:pt-24 lg:pb-64 relative">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:justify-between">
          <div className="w-full lg:w-1/3">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-black/80">
              Newsletter
            </h3>
            <form className="flex flex-col gap-3 sm:flex-row" action="#" method="POST">
              <input
                type="email"
                name="newsletterEmail"
                placeholder="Votre email"
                className="h-11 w-full rounded-none border border-black/15 bg-white px-3 text-sm text-black/80 placeholder:text-black/40 focus:outline-none"
                required
              />
              <button
                type="submit"
                className="h-11 border border-black/70 px-4 text-sm font-semibold uppercase tracking-wide text-black/80 transition hover:bg-black hover:text-white"
              >
                S&apos;inscrire
              </button>
            </form>

            <div className="mt-8">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-black/80">
                Suivez-nous
              </h3>
              <ul className="space-y-2 text-sm text-black/70">
                {socialLinks.map((item) => (
                  <li key={item.label} className="flex items-center gap-2">
                    <a
                      href={item.href}
                      className="flex items-center gap-2 text-sm text-black/70 hover:text-black"
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="w-full lg:w-2/3">
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-black/80">
                  Sitemap
                </h3>
                <ul className="space-y-2 text-sm text-black/70">
                  {sitemapLinks.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="hover:text-black">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-black/80">
                  Solutions
                </h3>
                <ul className="space-y-2 text-sm text-black/70">
                  {solutionLinks.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="hover:text-black">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-black/80">
                  Informations
                </h3>
                <ul className="space-y-2 text-sm text-black/70">
                  {legalLinks.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="hover:text-black">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-black/80">
                    Adresse
                  </h4>
                  <div className="mt-2 text-sm text-black/70">
                    Av. de la Liberation, 60160 Montataire
                  </div>
                </div>
                <div className="mt-6">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-black/80">
                    Contact
                  </h4>
                  <a
                    href="mailto:bonjour@jarvis-connect.fr"
                    className="mt-2 inline-block text-sm text-black/70 hover:text-black"
                  >
                    bonjour@jarvis-connect.fr
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-4 pb-6 text-center">
        <div
          className={`select-none text-center font-extrabold uppercase tracking-[0.015em] sm:tracking-[0.05em] leading-[0.9] text-black transition-all duration-700 ease-out flex flex-wrap justify-center text-[clamp(18px,9vw,56px)] sm:text-[clamp(40px,8vw,140px)] ${
            showBrand ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          {"Jarvis Connect".split("").map((char, index) => (
            <motion.span
              key={`${char}-${index}`}
              className="inline-block"
              initial={{ y: "110%" }}
              animate={showBrand ? { y: "0%" } : { y: "110%" }}
              transition={{
                delay: index * 0.025,
                duration: 0.9,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            >
              {char === " " ? "\u00A0" : char}
            </motion.span>
          ))}
        </div>
        <div className="flex w-full max-w-screen-xl flex-col gap-1 text-[11px] uppercase tracking-[0.16em] text-black/60 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
          <div className="text-left">Developement & Design by S</div>
          <div className="text-left sm:text-right">Jarvis Connect - Tous droits reserves</div>
        </div>
      </div>
    </footer>
  );
}
