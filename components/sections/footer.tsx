"use client";

import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  TwitterIcon,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

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
  {
    title: "Ressources",
    links: [
      { href: "#actualites", label: "Actualites" },
      { href: "#formations", label: "Formations support" },
      { href: "#offres", label: "Offres d'emploi" },
    ],
  },
  {
    title: "Plateforme",
    links: [
      { href: "/register", label: "Espace salarie" },
      { href: "/register", label: "Espace entreprise" },
      { href: "#offres", label: "Rejoindre l'equipe" },
    ],
  },
];

const socialLinks = [
  { icon: FacebookIcon, href: "#" },
  { icon: LinkedinIcon, href: "#" },
  { icon: TwitterIcon, href: "#" },
];

export function Footer() {
  return (
    <footer className="bg-black text-white border-t border-white/10">
      <div className="max-w-6xl mx-auto px-4 lg:px-6">
        <div className="flex flex-col gap-8 py-8 md:flex-row md:items-start">
          <div className="md:w-[220px]">
            <img
              src="/logo%20jarvis.png"
              alt="Jarvis Connect"
              className="h-16 w-auto object-contain"
            />
            <p className="mt-4 max-w-xs text-sm text-white/70">
              Jarvis Connect — Support, développement et sécurité.
            </p>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-8 md:ml-auto md:grid-cols-3">
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
        <div className="h-px bg-white/10" />
        <div className="py-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2 items-center">
            {socialLinks.map(({ icon: Icon, href }, i) => (
              <a
                href={href}
                className={buttonVariants({
                  variant: "secondary",
                  size: "icon",
                  className:
                    "rounded-none bg-white text-black hover:bg-white/90 border border-white",
                })}
                key={i}
              >
                <Icon className="size-5" />
              </a>
            ))}
          </div>

          <div className="flex gap-4" />
        </div>
        <div className="h-px bg-white/10" />
        <div className="text-center text-xs text-white/60 py-4">
          <p>
            (c) {new Date().getFullYear()} Jarvis Connect. Tous droits reserves.
          </p>
        </div>
      </div>
    </footer>
  );
}
