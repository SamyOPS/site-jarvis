"use client";

import { buttonVariants } from "@/components/ui/button";

const navLinks = [
  { label: "Accueil", href: "#" },
  { label: "Expertises", href: "#expertises" },
  { label: "Clients", href: "#clients" },
  { label: "Actualites", href: "#actualites" },
  { label: "Offres", href: "#offres" },
  { label: "Contact", href: "#contact" },
];

export function Header2() {
  return (
    <header className="sticky top-0 z-50 bg-black text-white border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center bg-white text-black font-semibold tracking-tight rounded-none">
              JC
            </div>
            <span className="text-sm font-semibold tracking-wide uppercase text-white">
              Jarvis Connect
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-white/80">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="hover:text-white transition-all duration-200 hover:[text-shadow:0_0_12px_#1A73E8]"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="#"
              className={buttonVariants({
                variant: "secondary",
                size: "default",
                className:
                  "rounded-none bg-white text-black hover:bg-white/90 border border-white",
              })}
            >
              Connexion
            </a>
            <a
              href="#"
              className={buttonVariants({
                variant: "secondary",
                size: "default",
                className:
                  "rounded-none bg-white text-black hover:bg-white/90 border border-white",
              })}
            >
              Inscription
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
