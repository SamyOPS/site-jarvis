import type { Metadata } from "next";
import { Footer } from "@/components/sections/footer";
import { ReseauxHoverSlider } from "./Reseauhoverslider";

const reseauxSlides = [
  {
    title: "Conception & Architecture",
    image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80",
    summary: "Conception d'architectures réseau robustes et évolutives, adaptées à vos contraintes de performance, de sécurité et de budget.",
    bullets: ["Architecture LAN/WAN/SD-WAN", "Segmentation et VLAN", "Plans d'adressage IP"],
  },
  {
    title: "Déploiement",
    image: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1200&q=80",
    summary: "Mise en œuvre des infrastructures réseau sur site, multi-sites ou hybrides, avec une gestion rigoureuse des phases de bascule.",
    bullets: ["Câblage et baies", "Switching & routing", "Wi-Fi entreprise"],
  },
  {
    title: "Administration Système",
    image: "https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&w=1200&q=80",
    summary: "Administration quotidienne des serveurs, des annuaires et des middlewares pour garantir la disponibilité et la performance de vos SI.",
    bullets: ["Active Directory & GPO", "Virtualisation VMware / Hyper-V", "Gestion des patchs et mises à jour"],
  },
  {
    title: "Supervision & Monitoring",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
    summary: "Mise en place de solutions de supervision pour détecter les incidents avant qu'ils n'impactent les utilisateurs.",
    bullets: ["Monitoring réseau (Zabbix, PRTG)", "Alerting et escalades", "Tableaux de bord temps réel"],
  },
 
];

export const metadata: Metadata = {
  title: "Réseaux & Systèmes | Jarvis Connect",
  description: "Déploiement, administration et supervision d'infrastructures réseau et systèmes.",
};

export default function ReseauxPage() {
  return (
    <>
      <div className="min-h-screen bg-white text-[#0A1A2F]">
        <main className="particle-readability">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-20">
            <div className="mb-8 space-y-2">
              <p className="text-sm uppercase tracking-[0.2em] text-[#000080]">Expertise</p>
              <h1 className="text-3xl font-semibold text-[#0A1A2F] md:text-4xl">Réseaux & Systèmes</h1>
            </div>

            <ReseauxHoverSlider slides={reseauxSlides} />

            <section className="mt-14 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-5 text-base text-slate-700">
                <p className="text-lg font-semibold text-[#0A1A2F]">Une infrastructure réseau fiable, sécurisée et adaptée à votre organisation.</p>
                <p>Nos équipes interviennent sur l'ensemble du cycle de vie de vos infrastructures réseau et systèmes : de la conception à l'exploitation quotidienne, en passant par le déploiement et la supervision.</p>
                <p>Que vous soyez un grand compte avec des contraintes de haute disponibilité ou une PME qui cherche à structurer son SI, nous adaptons notre approche à votre réalité.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {["Architecture LAN/WAN", "Switching & routing", "Administration système", "Virtualisation", "Supervision & monitoring", "Consulting réseau"].map((item) => (
                    <div key={item} className="rounded-none border border-slate-200 bg-white/70 px-4 py-3 shadow-sm">
                      <p className="text-sm font-semibold text-[#0A1A2F]">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-none border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm uppercase tracking-[0.2em] text-[#000080]">Notre approche</p>
                <ul className="mt-5 space-y-4 text-sm text-slate-700">
                  <li><span className="font-semibold text-[#0A1A2F]">01. Audit</span> : cartographie de l'existant, identification des risques et axes d'amélioration.</li>
                  <li><span className="font-semibold text-[#0A1A2F]">02. Conception</span> : architecture cible, choix technologiques et planification.</li>
                  <li><span className="font-semibold text-[#0A1A2F]">03. Exploitation</span> : déploiement, supervision et amélioration continue.</li>
                </ul>
                <div className="mt-6 rounded-none border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-[#0A1A2F]">Indicateurs suivis</p>
                  <p className="mt-2 text-xs text-slate-600">Disponibilité, latence, taux d'incidents, temps de résolution, couverture Wi-Fi.</p>
                </div>
              </div>
            </section>

            <section className="mt-14 grid gap-6 lg:grid-cols-3">
              {[
                { title: "Ce que vous obtenez", items: ["Infrastructure stable et performante", "Supervision proactive", "Documentation à jour", "Réduction des incidents"] },
                { title: "Pour qui", items: ["DSI et responsables infrastructure", "PME sans équipe réseau dédiée", "ETI en croissance ou migration", "Grands comptes multi-sites"] },
                { title: "Technos & outils", items: ["Cisco, Juniper, HP Aruba", "VMware, Hyper-V, Proxmox", "Zabbix, PRTG, Nagios", "Active Directory, Azure AD"] },
              ].map((block) => (
                <div key={block.title} className="rounded-none border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm uppercase tracking-[0.2em] text-[#000080]">{block.title}</p>
                  <ul className="mt-4 space-y-2 text-sm text-slate-700">
                    {block.items.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-1 size-1.5 rounded-none bg-[#000080]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>

            <section className="mt-14 rounded-none border border-[#0A1A2F]/10 bg-[#0A1A2F] p-8 text-white">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-white/70">Besoin d'un expert réseau ?</p>
                  <h2 className="mt-2 text-2xl font-semibold">Structurons votre infrastructure ensemble.</h2>
                  <p className="mt-2 text-sm text-white/80">Audit flash et recommandations en 2 semaines.</p>
                </div>
                <a href="/contact" className="inline-flex items-center justify-center rounded-none border border-white/50 px-6 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
                  Nous contacter
                </a>
              </div>
            </section>
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}