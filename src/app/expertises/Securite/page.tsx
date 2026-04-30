import type { Metadata } from "next";
import { Footer } from "@/components/sections/footer";
import { CybersecuriteHoverSlider } from "./Securitehoverslider";

const cyberSlides = [
  {
    title: "Audit de sécurité",
image: "https://images.unsplash.com/photo-1510511459019-5dda7724fd87?auto=format&fit=crop&w=1200&q=80",
    summary: "Évaluation complète de votre niveau de sécurité : exposition aux risques, cartographie des actifs critiques et plan de remédiation priorisé.",
    bullets: ["Audit organisationnel et technique", "Analyse de risques (ISO 27005)", "Rapport et plan d'action"],
  },
  {
    title: "Tests d'intrusion",
    image: "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&w=1200&q=80",
    summary: "Simulation d'attaques réelles pour identifier les vulnérabilités avant que des acteurs malveillants ne les exploitent.",
    bullets: ["Pentest applicatif (web, mobile, API)", "Pentest infrastructure et réseau", "Red team et ingénierie sociale"],
  },
  {
    title: "SOC Managé",
    image: "https://images.unsplash.com/photo-1590065707046-4fde65275b2e?auto=format&fit=crop&w=1200&q=80",
    summary: "Surveillance continue de votre SI avec détection, qualification et réponse aux incidents de sécurité 24h/24.",
    bullets: ["Détection et corrélation d'alertes", "Réponse à incident (IR)", "Reporting et indicateurs MSSP"],
  },
 
  {
    title: "Sensibilisation",
    image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
    summary: "Formation et sensibilisation de vos équipes aux bonnes pratiques de cybersécurité, premier rempart contre les attaques.",
    bullets: ["Programmes de formation", "Simulations de phishing", "Ateliers et e-learning"],
  },
  {
    title: "Réponse à incident",
    image: "https://images.unsplash.com/photo-1504384764586-bb4cdc1707b0?auto=format&fit=crop&w=1200&q=80",
    summary: "Intervention rapide en cas de cyberattaque : confinement, investigation forensique et remédiation pour limiter l'impact.",
    bullets: ["Confinement et investigation", "Analyse forensique", "Plan de reprise et post-mortem"],
  },
];

export const metadata: Metadata = {
  title: "Cybersécurité | Jarvis Connect",
  description: "Audit, SOC, pentest et conformité pour protéger vos actifs critiques.",
};

export default function CybersecuritePage() {
  return (
    <>
      <div className="min-h-screen bg-white text-[#0A1A2F]">
        <main className="particle-readability">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-20">
            <div className="mb-8 space-y-2">
              <p className="text-sm uppercase tracking-[0.2em] text-[#000080]">Expertise</p>
              <h1 className="text-3xl font-semibold text-[#0A1A2F] md:text-4xl">Cybersécurité</h1>
            </div>

            <CybersecuriteHoverSlider slides={cyberSlides} />

            <section className="mt-14 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-5 text-base text-slate-700">
                <p className="text-lg font-semibold text-[#0A1A2F]">Protégez vos actifs critiques avec une approche outillée et orientée résultats.</p>
                <p>Nous évaluons votre exposition aux risques, détectons les vulnérabilités et mettons en œuvre les contre-mesures adaptées à votre contexte métier et réglementaire.</p>
                <p>De l'audit initial à la surveillance continue, nos experts vous accompagnent sur l'ensemble de la chaîne de sécurité avec des livrables concrets et actionnables.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {["Audit de sécurité", "Tests d'intrusion", "SOC managé",  "Conformité ISO / NIS2", "Réponse à incident"].map((item) => (
                    <div key={item} className="rounded-none border border-slate-200 bg-white/70 px-4 py-3 shadow-sm">
                      <p className="text-sm font-semibold text-[#0A1A2F]">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-none border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm uppercase tracking-[0.2em] text-[#000080]">Notre approche</p>
                <ul className="mt-5 space-y-4 text-sm text-slate-700">
                  <li><span className="font-semibold text-[#0A1A2F]">01. Évaluer</span> : audit, analyse de risques et identification des vulnérabilités.</li>
                  <li><span className="font-semibold text-[#0A1A2F]">02. Protéger</span> : durcissement, conformité et mise en place des contrôles.</li>
                  <li><span className="font-semibold text-[#0A1A2F]">03. Surveiller</span> : SOC, détection continue et réponse aux incidents.</li>
                </ul>
                <div className="mt-6 rounded-none border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-[#0A1A2F]">Indicateurs suivis</p>
                  <p className="mt-2 text-xs text-slate-600">MTTD, MTTR, nombre de vulnérabilités critiques, taux de conformité, couverture SOC.</p>
                </div>
              </div>
            </section>

            <section className="mt-14 grid gap-6 lg:grid-cols-3">
              {[
                { title: "Ce que vous obtenez", items: ["Visibilité sur votre exposition", "Vulnérabilités identifiées et corrigées", "Conformité réglementaire", "Capacité de réponse aux incidents"] },
                { title: "Pour qui", items: ["RSSI et DSI", "Secteurs réglementés (finance, santé, défense)", "ETI exposées aux cyberattaques", "Directions générales et comités de risques"] },
                { title: "Technos & référentiels", items: ["ISO 27001 / 27005", "NIS2, RGPD, DORA", "SIEM (Splunk, Sentinel, QRadar)", "Outils pentest (Burp, Metasploit, Nessus)"] },
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
                  <p className="text-sm uppercase tracking-[0.2em] text-white/70">Prêt à renforcer votre sécurité ?</p>
                  <h2 className="mt-2 text-2xl font-semibold">Évaluons ensemble votre niveau d'exposition.</h2>
                  <p className="mt-2 text-sm text-white/80">Audit flash et rapport de vulnérabilités en 10 jours.</p>
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