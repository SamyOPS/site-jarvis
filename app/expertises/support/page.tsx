import type { Metadata } from "next";

import { Header } from "@/components/sections/header";

import { Footer } from "@/components/sections/footer";

import { SupportHoverSlider } from "./SupportHoverSlider";



const supportSlides = [

  {

    title: "Service Desk",

    image:

      "https://images.unsplash.com/photo-1525182008055-f88b95ff7980?auto=format&fit=crop&w=1200&q=80",

    summary:

      "Un point d'entrée unique pour vos utilisateurs, avec une prise en charge rapide et des communications claires.",

    bullets: [

      "Accueil et qualification des demandes",

      "Résolution au premier contact et escalade maîtrisée",

      "Suivi SLA, satisfaction et reporting mensuel",

    ],

  },

  {

    title: "Supervision & MCO",

    image:

      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",

    summary:

      "Une supervision proactive pour garantir disponibilité, performance et continuité de service.",

    bullets: [

      "Monitoring applicatif et infrastructure 24/7",

      "Traitement des incidents et actions préventives",

      "Pilotage MTTR, incidents majeurs et post-mortem",

    ],

  },

  {

    title: "Infogérance",

    image:

      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80",

    summary:

      "Un partenaire opérationnel pour la gestion quotidienne de vos environnements IT.",

    bullets: [

      "Gestion des postes, serveurs et services cloud",

      "Gestion des changements et mises à jour",

      "Documentation et transfert de compétences",

    ],

  },

  {

    title: "Sécurité",

    image:

      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",

    summary:

      "Sécurisez vos opérations avec des procédures et un suivi continu des risques.",

    bullets: [

      "Patching, durcissement et surveillance des alertes",

      "Gestion des accès et conformité",

      "Plan d'action sécurité et recommandations",

    ],

  },

  {

    title: "PRA/PCA",

    image:

      "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1200&q=80",

    summary:

      "Assurez la résilience de vos systèmes critiques et la reprise d'activité.",

    bullets: [

      "Plans de reprise et de continuité testés",

      "Sauvegardes, réplications et procédures d'urgence",

      "Simulations régulières et amélioration continue",

    ],

  },

];

export const metadata: Metadata = {

  title: "Support & infogérance | Jarvis Connect",

  description: "Aperçu visuel de notre expertise support et infogérance.",

};



export default function SupportPage() {

  return (

    <>

    <div className="min-h-screen bg-white text-[#0A1A2F]">

      <Header />

      <main className="particle-readability">

        <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-20">

          <div className="mb-8 space-y-2">

            <p className="text-sm uppercase tracking-[0.2em] text-[#000080]">Expertise</p>

            <h1 className="text-3xl font-semibold text-[#0A1A2F] md:text-4xl">

              Support & Infogérance

            </h1>

          </div>

          <SupportHoverSlider slides={supportSlides} />

          <section className="mt-14 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">

            <div className="space-y-5 text-base text-slate-700">

              <p className="text-lg font-semibold text-[#0A1A2F]">Un support IT piloté, fiable et orienté métier.</p>

              <p>

                Nous prenons en charge l'exploitation quotidienne de vos environnements IT et applicatifs avec une logique

                de continuité, de priorisation et de qualité de service. Notre équipe couvre l'ensemble de la chaîne support

                (N1 à N3), avec des runbooks clairs, une supervision proactive et des escalades rapides.

              </p>

              <p>

                L'objectif : réduire les interruptions, fluidifier la résolution et sécuriser vos opérations, tout en

                offrant une expérience utilisateur solide et mesurable.

              </p>

              <div className="grid gap-4 sm:grid-cols-2">

                {[

                  "Service Desk N1 à N3 (FR/EN)",

                  "Supervision 24/7 et MCO",

                  "Gestion des incidents majeurs",

                  "Infogérance poste & infrastructure",

                  "Sécurité opérationnelle et patching",

                  "PRA/PCA et tests réguliers",

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

                  <span className="font-semibold text-[#0A1A2F]">01. Cadrage & SLA</span> : définition des priorités, des

                  engagements et des niveaux de service.

                </li>

                <li>

                  <span className="font-semibold text-[#0A1A2F]">02. Run & supervision</span> : monitoring, alerting et

                  traitements automatisés des incidents.

                </li>

                <li>

                  <span className="font-semibold text-[#0A1A2F]">03. Amélioration continue</span> : post-mortem, backlog

                  d'améliorations et suivi des KPI.

                </li>

              </ul>

              <div className="mt-6 rounded-none border border-slate-200 bg-white p-4">

                <p className="text-sm font-semibold text-[#0A1A2F]">Indicateurs suivis</p>

                <p className="mt-2 text-xs text-slate-600">SLA, MTTR, taux de résolution au premier contact, satisfaction utilisateur, disponibilité.</p>

              </div>

            </div>

          </section>



          <section className="mt-14 grid gap-6 lg:grid-cols-3">

            {[

              {

                title: "Ce que vous obtenez",

                items: [

                  "Support structuré avec process ITIL",

                  "Reporting mensuel et comités de pilotage",

                  "Gestion des changements et des releases",

                  "Documentation vivante et transfert de compétences",

                ],

              },

              {

                title: "Pour qui",

                items: [

                  "ETI/PME en croissance",

                  "Directions IT en transformation",

                  "DSI recherchant un partenaire réactif",

                  "Equipes produit avec besoin de run",

                ],

              },

              {

                title: "Technos & outils",

                items: [

                  "ITSM (Jira Service, Freshservice, GLPI)",

                  "Supervision (Datadog, Zabbix, Grafana)",

                  "Cloud & infra (Azure, AWS, GCP)",

                  "Sécurité (EDR, SIEM, sauvegardes)",

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

                <p className="text-sm uppercase tracking-[0.2em] text-white/70">Prêt à industrialiser votre support ?</p>

                <h2 className="mt-2 text-2xl font-semibold">Parlons de votre organisation et de vos priorités.</h2>

                <p className="mt-2 text-sm text-white/80">Nous proposons un audit flash et un plan d'action sur 30 jours.</p>

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



