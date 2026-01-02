"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

const footerLinks = [
  {
    title: "Navigation",
    links: [
      { href: "#", label: "Accueil" },
      { href: "#about", label: "A propos" },
      { href: "#expertises", label: "Expertises" },
      { href: "#clients", label: "Clients" },
    ],
  },
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
      <div className="max-w-7xl mx-auto px-4 pt-16 pb-32 lg:px-8 lg:pt-20 lg:pb-40 relative">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3">
          {footerLinks.map((item, i) => (
            <div key={i}>
              <h3 className="mb-4 text-xs uppercase tracking-wide text-white/80">
                {item.title}
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
