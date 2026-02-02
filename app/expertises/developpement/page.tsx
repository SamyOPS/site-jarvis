import type { Metadata } from "next";
import { Header } from "@/components/sections/header";
import { Footer } from "@/components/sections/footer";
import { DeveloppementHoverSlider } from "./DeveloppementHoverSlider";

const devSlides = [
  {
    title: "Discovery",
    image:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80",
    summary:
      "Nous cadrons le besoin métier, les risques et les priorités pour sécuriser le delivery dès le départ.",
    bullets: [
      "Ateliers produit & roadmap",
      "Cadrage fonctionnel et technique",
      "User stories et backlog priorisé",
    ],
  },
  {
    title: "UX/UI",
    image:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
    summary:
      "Des parcours fluides et des interfaces efficaces, alignées sur vos objectifs business.",
    bullets: [
      "Audit UX et wireframes",
      "Design system et prototypage",
      "Tests utilisateurs et itérations",
    ],
  },
  {
    title: "Front/Back/API",
    image:
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=80",
    summary:
      "Développement robuste et scalable, avec des API fiables et documentées.",
    bullets: [
      "Front web et mobile",
      "Back‑end modulaires",
      "API REST/GraphQL sécurisées",
    ],
  },
  {
    title: "Qualité & Tests",
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
    summary:
      "Nous industrialisons la qualité pour éviter les régressions et garantir la stabilité.",
    bullets: [
      "Tests unitaires et E2E",
      "Stratégie QA et coverage",
      "Recette et validation métier",
    ],
  },
  {
    title: "CI/CD",
    image:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
    summary:
      "Des déploiements rapides, sûrs et automatisés pour accélérer le time‑to‑market.",
    bullets: [
      "Pipelines et déploiement continu",
      "Infrastructure as Code",
      "Monitoring post‑release",
    ],
  },
  {
    title: "Observabilité",
    image:
      "https://images.unsplash.com/photo-1526378722484-cc1ab70f1d0f?auto=format&fit=crop&w=1200&q=80",
    summary:
      "Suivi complet des performances et de la disponibilité pour anticiper les incidents.",
    bullets: [
      "Logs, metrics et traces",
      "Alerting et dashboards",
      "Amélioration continue",
    ],
  },
];
export const metadata: Metadata = {
  title: "Développement applicatif | Jarvis Connect",
  description: "Aperçu visuel de notre expertise développement.",
};

export default function DeveloppementPage() {
  return (
    <>
    <div className="min-h-screen bg-white text-[#0A1A2F]">
      <Header />
      <main className="particle-readability">
        <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-20">
          <div className="mb-8 space-y-2">
            <p className="text-sm uppercase tracking-[0.2em] text-[#000080]">Expertise</p>
            <h1 className="text-3xl font-semibold text-[#0A1A2F] md:text-4xl">
              Développement applicatif
            </h1>
          </div>
          <DeveloppementHoverSlider slides={devSlides} />

          <section className="mt-14 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5 text-base text-slate-700">
              <p className="text-lg font-semibold text-[#0A1A2F]">Des produits robustes, pensés pour scaler.</p>
              <p>
                Nous concevons et développons des applications fiables, maintenables et alignées sur vos objectifs
                métiers. De la phase de discovery jusqu'à la mise en production, nos équipes sécurisent la qualité et
                accélèrent le time-to-market.
              </p>
              <p>
                L'objectif : livrer vite, avec une architecture propre, des interfaces claires et une performance mesurée.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  "Cadrage produit & UX",
                  "Développement front/back",
                  "API sécurisées et documentées",
                  "Qualité & tests automatisés",
                  "CI/CD et déploiements",
                  "Observabilité & performance",
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
                  <span className="font-semibold text-[#0A1A2F]">01. Discovery & cadrage</span> : objectifs, périmètre,
                  risques et backlog priorisé.
                </li>
                <li>
                  <span className="font-semibold text-[#0A1A2F]">02. Build & delivery</span> : sprints, qualité et
                  déploiements continus.
                </li>
                <li>
                  <span className="font-semibold text-[#0A1A2F]">03. Run & optimisation</span> : monitoring, performance
                  et itérations produit.
                </li>
              </ul>
              <div className="mt-6 rounded-none border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-[#0A1A2F]">Indicateurs suivis</p>
                <p className="mt-2 text-xs text-slate-600">Vélocité, qualité, disponibilité, temps de réponse, taux d'erreur.</p>
              </div>
            </div>
          </section>

          <section className="mt-14 grid gap-6 lg:grid-cols-3">
            {[
              {
                title: "Ce que vous obtenez",
                items: [
                  "Architecture claire et scalable",
                  "Code maintenable et testé",
                  "Déploiements fiables et rapides",
                  "Documentation et transfert de compétences",
                ],
              },
              {
                title: "Pour qui",
                items: [
                  "PME/ETI avec produit digital",
                  "Directions IT en modernisation",
                  "Startups en phase de scale",
                  "Équipes produit exigeantes",
                ],
              },
              {
                title: "Technos & outils",
                items: [
                  "React, Next.js, Node, .NET",
                  "API REST/GraphQL",
                  "CI/CD (GitHub Actions, GitLab)",
                  "Observabilité (Datadog, Grafana)",
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
                <p className="text-sm uppercase tracking-[0.2em] text-white/70">Prêt à accélérer votre delivery ?</p>
                <h2 className="mt-2 text-2xl font-semibold">Construisons une roadmap produit claire et réaliste.</h2>
                <p className="mt-2 text-sm text-white/80">Audit flash et plan d'action sur 4 à 6 semaines.</p>
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

