"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { InstagramIcon, LinkedinIcon } from "lucide-react";

const footerLinks = [
  {
    title: "Navigation",
    links: [
      { href: "#", label: "Accueil" },
      { href: "#about", label: "A propos" },
      { href: "#expertises", label: "Expertises" },
      { href: "#actualites", label: "Actualites" },
      { href: "#formations", label: "Formations" },
      { href: "/contact", label: "Contact" },
    ],
  },
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
    <footer ref={footerRef} className="relative overflow-hidden bg-[#f5f5f5] text-black border-t border-black/10">
      <div className="max-w-screen-xl mx-auto px-6 pt-20 pb-48 lg:px-12 lg:pt-24 lg:pb-64 relative">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:gap-12 md:justify-between">
          <div className="w-full md:w-2/3 lg:w-3/4">
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 text-left">
              {footerLinks.map((item, i) => (
                <div key={i}>
                  <h3 className="mb-4 flex items-center gap-2 text-xs uppercase tracking-wide text-black/80">
                    <span aria-hidden="true">↳</span> {item.title}
                  </h3>
                  <ul className="space-y-2 text-sm text-black/70">
                    {item.links.map((link) => (
                      <li key={link.label}>
                        <a href={link.href} className="hover:text-black">
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="md:w-1/3 lg:w-1/4">
            <h3 className="mb-4 flex items-center gap-2 text-xs uppercase tracking-wide text-black/80">
              <span aria-hidden="true">↳</span> Suivez-nous
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
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-4 pb-6 text-center">
        <div
          className={`select-none text-center font-extrabold uppercase tracking-[0.05em] leading-none text-black transition-all duration-700 ease-out flex flex-wrap justify-center ${
            showBrand ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
          style={{ fontSize: "clamp(40px, 8vw, 140px)" }}
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
