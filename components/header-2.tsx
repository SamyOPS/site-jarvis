"use client";

import { LogIn, UserPlus } from "lucide-react";

const navLinks = [
  { label: "Accueil", href: "#" },
  { label: "Dashboard", href: "/dashboard" },
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
          <div className="flex items-center">
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

          <div className="flex items-center gap-2">
            <a
              href="/login"
              aria-label="Connexion"
              className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <LogIn className="h-5 w-5" />
            </a>
            <span className="h-4 w-px bg-white/20" aria-hidden="true" />
            <a
              href="/register"
              aria-label="Inscription"
              className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <UserPlus className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
