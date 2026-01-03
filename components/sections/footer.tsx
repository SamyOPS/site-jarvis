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
    <footer ref={footerRef} className="relative overflow-hidden bg-black text-white border-t border-white/10">
      <div className="max-w-screen-xl mx-auto px-6 pt-20 pb-48 lg:px-12 lg:pt-24 lg:pb-64 relative">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:gap-12 md:justify-between">
          <div className="w-full md:w-2/3 lg:w-3/4">
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 text-left">
              {footerLinks.map((item, i) => (
                <div key={i}>
                  <h3 className="mb-4 flex items-center gap-2 text-xs uppercase tracking-wide text-white/80">
                    <span aria-hidden="true">↳</span> {item.title}
                  </h3>
                  <ul className="space-y-2 text-sm text-white/70">
                    {item.links.map((link) => (
                      <li key={link.label}>
                        <a href={link.href} className="hover:text-white">
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
            <h3 className="mb-4 flex items-center gap-2 text-xs uppercase tracking-wide text-white/80">
              <span aria-hidden="true">↳</span> Suivez-nous
            </h3>
            <ul className="space-y-2 text-sm text-white/70">
              {socialLinks.map((item) => (
                <li key={item.label} className="flex items-center gap-2">
                  <a
                    href={item.href}
                    className="flex items-center gap-2 text-sm text-white/70 hover:text-white"
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

      <div
        className={`pointer-events-none absolute inset-x-0 bottom-[-4%] block select-none whitespace-nowrap text-center font-extrabold uppercase tracking-[0.05em] leading-none text-white transition-all duration-700 ease-out ${
          showBrand ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
        }`}
        style={{ fontSize: "clamp(56px, 10vw, 160px)" }}
      >
        {"Jarvis Connect".split("").map((char, index) => (
          <span key={`${char}-${index}`} className="relative inline-block overflow-hidden leading-none">
            <motion.span
              className="inline-block opacity-0"
              initial={{ y: "0%" }}
              animate={showBrand ? { y: "-110%", opacity: 0 } : { y: "0%", opacity: 0 }}
              transition={{
                delay: index * 0.24,
                duration: 0.9,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              {char === " " ? "\u00A0" : char}
            </motion.span>
            <motion.span
              className="absolute left-0 top-0 inline-block opacity-100"
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
          </span>
        ))}
      </div>
    </footer>
  );
}
