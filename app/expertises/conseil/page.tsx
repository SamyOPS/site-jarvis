import type { Metadata } from "next";
import { Header } from "@/components/sections/header";
import { Footer } from "@/components/sections/footer";
import { ConseilHoverSlider } from "./ConseilHoverSlider";

const conseilSlides = [
  {
    title: "Diagnostic",
    image:
      "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80",
    summary:
      "Un état des lieux clair pour identifier les priorités, les risques et les leviers de transformation.",
    bullets: [
      "Audit applicatif et infra",
      "Cartographie SI et dépendances",
      "Quick wins et recommandations",
    ],
  },
  {
    title: "Architecture cible",
    image:
      "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=1200&q=80",
    summary:
      "Conception d'une architecture alignée sur vos objectifs métiers et votre trajectoire digitale.",
    bullets: [
      "Urbanisation et trajectoire",
      "Schémas d'architecture",
      "Roadmap de migration",
    ],
  },
  {
    title: "Cloud & FinOps",
    image:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
    summary:
      "Optimiser vos coûts et votre performance cloud sans compromis sur la sécurité.",
    bullets: [
      "Optimisation des coûts",
      "Gouvernance et tagging",
      "Sécurité et conformité",
    ],
  },
  {
    title: "Data & Gouvernance",
    image:
      "https://images.unsplash.com/photo-1483478550801-ceba5fe50e8e?auto=format&fit=crop&w=1200&q=80",
    summary:
      "Structurer la donnée pour accélérer la décision et fiabiliser le pilotage.",
    bullets: [
      "Stratégie data et MDM",
      "Qualité et catalogage",
      "Modèles de gouvernance",
    ],
  },
  {
    title: "Cyber",
    image:
      "https://images.unsplash.com/photo-1590065707046-4fde65275b2e?q=80&w=1330&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    summary:
      "Sécurisation des SI et accompagnement sur les risques et la conformité.",
    bullets: [
      "Évaluation des risques",
      "Politiques et procédures",
      "Plan de remédiation",
    ],
  },
  {
    title: "Pilotage",
    image:
      "https://images.unsplash.com/photo-1504384764586-bb4cdc1707b0?auto=format&fit=crop&w=1200&q=80",
    summary:
      "Un pilotage clair des programmes de transformation, avec une vision ROI.",
    bullets: [
      "Gouvernance et comités",
      "Suivi KPI et budget",
      "PMO et conduite du changement",
    ],
  },
];
export const metadata: Metadata = {
  title: "Conseil & transformation | Jarvis Connect",
  description: "Aperçu visuel de notre expertise conseil et transformation.",
};

export default function ConseilPage() {
  return (
    <>
    <div className="min-h-screen bg-white text-[#0A1A2F]">
      <Header />
      <main className="particle-readability">
        <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-20">
          <div className="mb-8 space-y-2">
            <p className="text-sm uppercase tracking-[0.2em] text-[#000080]">Expertise</p>
            <h1 className="text-3xl font-semibold text-[#0A1A2F] md:text-4xl">
              Conseil & transformation
            </h1>
          </div>
          <ConseilHoverSlider slides={conseilSlides} />

          <section className="mt-14 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5 text-base text-slate-700">
              <p className="text-lg font-semibold text-[#0A1A2F]">Une trajectoire claire pour transformer votre SI.</p>
              <p>
                Nous accompagnons les directions IT et métiers dans la définition de la cible, la priorisation et la
                conduite du changement. Notre rôle : éclairer les décisions et sécuriser la valeur créée.
              </p>
              <p>
                L'objectif : gagner en agilité, maîtriser les coûts et accélérer la transformation digitale.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  "Diagnostic & audit",
                  "Architecture cible",
                  "Cloud & FinOps",
                  "Data & gouvernance",
                  "Cyber & conformité",
                  "Pilotage & PMO",
                ].map((item) => (
                  <div key={item} className="rounded-none border border-slate-200 bg-white/70 px-4 py-3 shadow-sm">
                    <p className="text-sm font-semibold text-[#0A1A2F]">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-none border border-slate-200 bg-slate-50 p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-[#000080]">Notre approche</p>
              <ul className="mt-5 space-y-4 text-sm text-slate-700">
                <li>
                  <span className="font-semibold text-[#0A1A2F]">01. Diagnostic</span> : état des lieux, risques et
                  opportunités.
                </li>
                <li>
                  <span className="font-semibold text-[#0A1A2F]">02. Trajectoire</span> : cible, roadmap et business case.
                </li>
                <li>
                  <span className="font-semibold text-[#0A1A2F]">03. Pilotage</span> : gouvernance, KPI et conduite du
                  changement.
                </li>
              </ul>
              <div className="mt-6 rounded-none border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-[#0A1A2F]">Indicateurs suivis</p>
                <p className="mt-2 text-xs text-slate-600">ROI, budget, risques, maturité digitale, adoption.</p>
              </div>
            </div>
          </section>

          <section className="mt-14 grid gap-6 lg:grid-cols-3">
            {[
              {
                title: "Ce que vous obtenez",
                items: [
                  "Vision claire et actionnable",
                  "Roadmap réaliste et priorisée",
                  "Optimisation coûts/risques",
                  "Accompagnement au changement",
                ],
              },
              {
                title: "Pour qui",
                items: [
                  "Comités de direction",
                  "DSI en transformation",
                  "Directions métiers",
                  "PMO et responsables programmes",
                ],
              },
              {
                title: "Technos & outils",
                items: [
                  "Cloud (AWS, Azure, GCP)",
                  "Data/BI (Power BI, Snowflake)",
                  "Gouvernance & FinOps",
                  "Cybersécurité (ISO, NIS2)",
                ],
              },
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
                <p className="text-sm uppercase tracking-[0.2em] text-white/70">Prêt à sécuriser votre transformation ?</p>
                <h2 className="mt-2 text-2xl font-semibold">Alignons votre organisation, vos outils et votre roadmap.</h2>
                <p className="mt-2 text-sm text-white/80">Audit flash et plan d'action sur 6 semaines.</p>
              </div>
              <a
                href="/contact"
                className="inline-flex items-center justify-center rounded-none border border-white/50 px-6 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
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

