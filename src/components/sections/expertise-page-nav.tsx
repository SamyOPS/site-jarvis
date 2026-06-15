const navItems = [
  { href: "#expertise-detail", label: "Approche" },
  { href: "#resultats", label: "Resultats" },
  { href: "#contact", label: "Contact" },
];

export function ExpertisePageNav() {
  return (
    <nav className="mb-8 flex flex-wrap gap-2" aria-label="Navigation de l'expertise">
      {navItems.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className="rounded-full border border-[#0A1A2F]/10 bg-[#F4F7FA] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#0A1A2F]/70 transition hover:border-[#2aa0dd]/50 hover:text-[#0A1A2F]"
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
