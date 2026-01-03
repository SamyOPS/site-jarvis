import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";

import { Header } from "@/components/sections/header";
import { Footer } from "@/components/sections/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  HoverSlider,
  HoverSliderImage,
  HoverSliderImageWrap,
  TextStaggerHover,
} from "@/components/animated-slideshow";

export type ExpertiseKey = "support" | "developpement" | "conseil";

type Card = {
  title: string;
  description: string;
  items?: string[];
};

type Slide = {
  title: string;
  image: string;
  caption?: string;
};

export type ExpertiseContent = {
  badge: string;
  heroTitle: string;
  heroDescription: string;
  heroNote: string;
  actions: { label: string; href: string; variant?: "primary" | "secondary" }[];
  highlights: { value: string; label: string; detail: string }[];
  services: Card[];
  differentiators: Card[];
  steps: { title: string; detail: string }[];
  deliverables: string[];
  seoDescription: string;
  slides?: Slide[];
};

export const expertises: Record<ExpertiseKey, ExpertiseContent> = {
  support: {
    badge: "Support & infogerance",
    heroTitle: "Support et infogerance IT sans rupture",
    heroDescription:
      "Assistance utilisateurs, supervision proactive et securite operationnelle pour garder votre SI disponible.",
    heroNote: "Equipe francophone/anglophone, astreinte et pilote dedie.",
    actions: [
      { label: "Parler a un expert", href: "/contact", variant: "primary" },
      { label: "Voir nos offres", href: "/offres", variant: "secondary" },
    ],
    highlights: [
      { value: "24/7", label: "Centre support", detail: "Astreinte, runbooks et escalade N1 a N3" },
      { value: "98%", label: "Satisfaction", detail: "CSAT mesure sur les tickets resolus" },
      { value: "15 min", label: "Prise en charge", detail: "Moyenne sur incident critique" },
    ],
    services: [
      {
        title: "Support utilisateurs N1 a N3",
        description:
          "Service desk, diagnostic et resolution avec connaissance metier partagee.",
        items: [
          "Service desk FR/EN et ITSM documente",
          "Base de connaissance et scripts",
          "Gestion des habilitations et des assets",
        ],
      },
      {
        title: "Supervision et MCO",
        description:
          "Monitoring reseau, infra et applicatif avec remediations automatisees.",
        items: [
          "Patch management, sauvegardes, PRA/PCA",
          "Alerting temps reel et filtrage du bruit",
          "Securisation reseau et poste de travail",
        ],
      },
      {
        title: "Infogerance securisee",
        description:
          "Pilotage du run, conformite et securite operationnelle sur la duree.",
        items: [
          "Gestion identites, MFA, acces a privilege",
          "Inventaire, CMDB et gestion du cycle de vie",
          "Tests de reprise et plans de continuites",
        ],
      },
    ],
    differentiators: [
      {
        title: "Gouvernance et SLA visibles",
        description:
          "Reporting mensuel, comites et plans d'action bases sur des indicateurs cles.",
      },
      {
        title: "Onboarding rapide et structure",
        description:
          "Reprise du run en moins de 4 semaines avec runbooks, scripts et inventaires a jour.",
      },
    ],
    steps: [
      {
        title: "Audit express",
        detail:
          "Cartographie des flux, inventaire des assets et verification des niveaux de service actuels.",
      },
      {
        title: "Mise a niveau",
        detail:
          "Runbooks, patchs prioritaires, renforcement des alertes et continuites critiques.",
      },
      {
        title: "Supervision active",
        detail:
          "Pilotage quotidien, escalade structuree et communication continue avec vos equipes.",
      },
      {
        title: "Amelioration continue",
        detail:
          "Tableaux de bord, revues de tendance et automatisations pour reduire MTTD et MTTR.",
      },
    ],
    deliverables: [
      "Runbooks et processus d'escalade documentes",
      "Tableaux de bord support et MCO (SLA, CSAT, MTTR)",
      "Plan de continuites et consignes PRA/PCA a jour",
      "Rapport trimestriel de securite et actions correctives",
    ],
    seoDescription:
      "Support utilisateurs, supervision, infogerance et securite operationnelle pour des SI disponibles 24/7.",
    slides: [
      {
        title: "Support utilisateur 24/7",
        image:
          "https://images.unsplash.com/photo-1525182008055-f88b95ff7980?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "Supervision et MCO",
        image:
          "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "Securite operationnelle",
        image:
          "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80",
      },
    ],
  },
  developpement: {
    badge: "Developpement",
    heroTitle: "Developpement applicatif et produit",
    heroDescription:
      "Squads seniors pour livrer vos produits web et mobiles, de la discovery au run en production.",
    heroNote: "Design, dev, QA et securite integrees avec accompagnement produit.",
    actions: [
      { label: "Lancer un projet", href: "/contact", variant: "primary" },
      { label: "Decouvrir nos roles", href: "/offres", variant: "secondary" },
    ],
    highlights: [
      { value: "12 sem.", label: "MVP cible", detail: "Discovery + build industrialise" },
      { value: "CI/CD", label: "Industrialisation", detail: "Tests, securite et observabilite natives" },
      { value: "Senior", label: "Equipe core", detail: "Tech lead, product et design embarques" },
    ],
    services: [
      {
        title: "Discovery et cadrage produit",
        description:
          "Ateliers metier, priorisation et KPI pour aligner solution et enjeux business.",
        items: [
          "Backlog priorise et roadmap 90 jours",
          "User journeys, maquettes et design system",
          "Business case et capacite de delivery",
        ],
      },
      {
        title: "Engineering full stack",
        description:
          "Architecture evolutive, developpement front/back et APIs ouvertes.",
        items: [
          "React/Next, Node/TypeScript, architectures API first",
          "Performances, accessibilite et securite par defaut",
          "Environnements de test, preprod et prod separes",
        ],
      },
      {
        title: "Qualite, securite et run",
        description:
          "CI/CD, observabilite et support applicatif pour tenir la promesse produit.",
        items: [
          "Tests auto (unitaires, e2e) et revues de code",
          "SLO, alerting et journaux centralises",
          "Handover vers vos equipes ou run conjoint",
        ],
      },
    ],
    differentiators: [
      {
        title: "Design to delivery",
        description:
          "La meme equipe couvre discovery, UX/UI, build et mise en production sans rupture.",
      },
      {
        title: "Culture produit",
        description:
          "Pilotage par la valeur, increments courts, mesure continue de l'adoption et des usages.",
      },
    ],
    steps: [
      {
        title: "Immersion",
        detail: "Entretiens metier, diagnostic technique et cadrage des objectifs mesurables.",
      },
      {
        title: "Architecture et backlog",
        detail: "Choix techniques, plan de release et creation du backlog priorise.",
      },
      {
        title: "Sprints de build",
        detail: "Sprints courts, demos frequentes, tests auto et mises en production controlees.",
      },
      {
        title: "Run et transfert",
        detail: "Pilotage post-lancement, optimisation et transfert de competences.",
      },
    ],
    deliverables: [
      "Backlog priorise, roadmap et KPI produit",
      "Maquettes, design system et guidelines UI",
      "CI/CD, jeux de tests et observabilite",
      "Dossier d'exploitation et support applicatif",
    ],
    seoDescription:
      "Equipes produit pour concevoir et livrer vos applications web et mobiles avec un run industrialise.",
    slides: [
      {
        title: "Discovery produit",
        image:
          "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "Engineering full stack",
        image:
          "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "Run et observabilite",
        image:
          "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=80",
      },
    ],
  },
  conseil: {
    badge: "Conseil",
    heroTitle: "Conseil et transformation digitale",
    heroDescription:
      "Architecture cible, modernisation cloud, cyber et gouvernance pour un SI plus robuste et agile.",
    heroNote: "Une approche pragmatique, pilotee par la valeur et le risque.",
    actions: [
      { label: "Planifier un cadrage", href: "/contact", variant: "primary" },
      { label: "Voir nos expertises", href: "/#expertises", variant: "secondary" },
    ],
    highlights: [
      { value: "8-12 sem.", label: "Roadmap cible", detail: "Diagnostic, priorisation et plan d'action" },
      { value: "Cloud/FinOps", label: "Modernisation", detail: "Gains de cout, securite et performance" },
      { value: "Cyber", label: "Resilience", detail: "Plans PRA/PCA et gestion du risque" },
    ],
    services: [
      {
        title: "Audit et cible SI",
        description:
          "Etat des lieux, risques, debt technique et trajectoire cible alignee metier.",
        items: [
          "Cartographie des applications et dependances",
          "Analyse de maturite ITSM, SecOps et data",
          "Plan de reduction du risque et des couts",
        ],
      },
      {
        title: "Architecture cloud et data",
        description:
          "Blueprints cloud, securite, reseau et data pour industrialiser vos produits.",
        items: [
          "Landing zone, IAM, reseau et observabilite",
          "Strategie data, gouvernance et conformite",
          "FinOps et optimisation des ressources",
        ],
      },
      {
        title: "Pilotage et conduite du changement",
        description:
          "PMO, gouvernance, coaching des equipes et accompagnement a l'adoption.",
        items: [
          "Comites et indicateurs operationnels",
          "Plan de communication et formations cibles",
          "Transfert de competences et coaching",
        ],
      },
    ],
    differentiators: [
      {
        title: "Alignement metier",
        description:
          "Trajectoire fondee sur la valeur business, les risques et la capacite de delivery de vos equipes.",
      },
      {
        title: "Execution pragmatique",
        description:
          "Feuilles de route actionnables, priorisation par paliers et accompagnement jusqu'au run.",
      },
    ],
    steps: [
      {
        title: "Diagnostic 360",
        detail: "Interviews, analyse des usages, securite et operations pour quantifier les risques.",
      },
      {
        title: "Roadmap et business case",
        detail: "Trajectoire 12-18 mois, gains attendus, capacite et budget cible.",
      },
      {
        title: "Pilotes et migrations",
        detail: "Chantiers pilotes, preuves de valeur et plan de deploiement etape.",
      },
      {
        title: "Transition et transfert",
        detail: "Gouvernance, playbooks et passage de relais vers vos equipes internes.",
      },
    ],
    deliverables: [
      "Roadmap cible 12-18 mois et plan d'action priorise",
      "Cartographie des risques et plans de remediations",
      "Kit de gouvernance (comites, indicateurs, budget)",
      "Playbooks securite, PRA/PCA et transferts de competences",
    ],
    seoDescription:
      "Conseil, architecture cible, modernisation cloud et securite pour transformer votre SI en maitrisant le risque.",
    slides: [
      {
        title: "Diagnostic 360",
        image:
          "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "Architecture cloud & data",
        image:
          "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=1200&q=80",
      },
      {
        title: "Gouvernance et pilotage",
        image:
          "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
      },
    ],
  },
};

export const getMetadata = (key: ExpertiseKey): Metadata => {
  const expertise = expertises[key];
  return {
    title: `${expertise.heroTitle} | Jarvis Connect`,
    description: expertise.seoDescription,
  };
};

export const ExpertisePageView = ({ expertise }: { expertise: ExpertiseContent }) => {
  return (
    <div className="bg-white text-[#0A1A2F]">
      <Header />
      <main className="min-h-screen">
        <section className="bg-white text-[#0A1A2F]">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-16 lg:px-8 lg:py-20">
            <div className="flex items-center gap-3 text-sm text-[#0A1A2F]/80">
              <Link href="/">
                <span className="inline-flex items-center gap-2 hover:text-[#000080]">
                  <ArrowLeft className="h-4 w-4 text-[#000080]" />
                  Accueil
                </span>
              </Link>
              <span className="h-px w-8 bg-[#0A1A2F]/20" aria-hidden />
              <span className="text-[#000080]">{expertise.badge}</span>
            </div>

            <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-center">
              <div className="space-y-5">
                <Badge className="bg-[#000080]/10 text-[#000080]">{expertise.badge}</Badge>
                <h1 className="text-4xl font-semibold leading-tight text-[#0A1A2F] md:text-5xl">
                  {expertise.heroTitle}
                </h1>
                <p className="text-lg text-[#0A1A2F]/80 md:text-xl">{expertise.heroDescription}</p>
                <p className="text-sm uppercase tracking-[0.22em] text-[#000080]">
                  {expertise.heroNote}
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-4">
                  {expertise.actions.map((action) => (
                    <Button
                      key={action.label}
                      asChild
                      size="lg"
                      className={
                        action.variant === "secondary"
                          ? "rounded-none border border-[#000080]/30 bg-transparent text-[#000080] hover:bg-[#000080]/5"
                          : "rounded-none bg-[#000080] text-white hover:bg-[#000080]/90"
                      }
                    >
                      <Link href={action.href} className="inline-flex items-center gap-2">
                        {action.label}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 rounded-none border border-[#0A1A2F]/10 bg-[#0A1A2F]/02 p-5 sm:grid-cols-2">
                {expertise.highlights.map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-col gap-2 border border-[#0A1A2F]/10 bg-white px-4 py-3 shadow-sm"
                  >
                    <span className="text-3xl font-semibold text-[#0A1A2F]">{item.value}</span>
                    <span className="text-sm font-semibold uppercase tracking-[0.14em] text-[#000080]">
                      {item.label}
                    </span>
                    <p className="text-sm text-[#0A1A2F]/80">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-black/5 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-20">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#000080]">
              <Sparkles className="h-4 w-4" />
              Ce que nous faisons
            </div>
            <h2 className="mt-3 text-3xl font-semibold text-[#0A1A2F] md:text-4xl">
              Des services concrets et immediatement actionnables
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {expertise.services.map((service) => (
                <div
                  key={service.title}
                  className="flex h-full flex-col gap-4 border border-[#0A1A2F]/10 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-xl font-semibold text-[#0A1A2F]">{service.title}</h3>
                  </div>
                  <p className="text-[#0A1A2F]/80">{service.description}</p>
                  {service.items && (
                    <ul className="space-y-2 text-sm text-[#0A1A2F]">
                      {service.items.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <Check className="mt-1 h-4 w-4 text-[#000080]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {expertise.slides && expertise.slides.length > 0 && (
          <section className="bg-white">
            <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-20">
              <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
                <div className="space-y-4">
                  <p className="text-sm uppercase tracking-[0.2em] text-[#000080]">En images</p>
                  <h2 className="text-3xl font-semibold text-[#0A1A2F] md:text-4xl">
                    Apercu de nos interventions
                  </h2>
                  <p className="text-[#0A1A2F]/80">
                    Passez la souris sur chaque ligne pour faire defiler les visuels. Nous affinerons
                    ces contenus pour chaque page.
                  </p>
                </div>
                <HoverSlider className="grid gap-6">
                  <div className="flex flex-wrap gap-3 text-lg font-semibold text-[#0A1A2F] md:text-xl">
                    {expertise.slides.map((slide, index) => (
                      <TextStaggerHover
                        key={slide.title}
                        text={slide.title}
                        index={index}
                        className="cursor-pointer border border-transparent px-2 py-1 hover:border-[#000080]/30"
                      />
                    ))}
                  </div>
                  <HoverSliderImageWrap className="relative aspect-[16/9] overflow-hidden rounded-none border border-[#0A1A2F]/10 bg-[#f8fafc]">
                    {expertise.slides.map((slide, index) => (
                      <HoverSliderImage
                        key={slide.title}
                        index={index}
                        src={slide.image}
                        alt={slide.title}
                        className="size-full object-cover"
                      />
                    ))}
                  </HoverSliderImageWrap>
                </HoverSlider>
              </div>
            </div>
          </section>
        )}

        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-20">
            <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-start">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#000080]">
                  <Sparkles className="h-4 w-4" />
                  Differenciation Jarvis
                </div>
                <h2 className="text-3xl font-semibold text-[#0A1A2F] md:text-4xl">
                  Gouvernance, transparence et execution senior
                </h2>
                <p className="text-[#0A1A2F]/80">
                  Nous intervenons avec des equipes seniors, des indicateurs clairs et une communication
                  reguliere pour que vos projets avancent sans friction.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  {expertise.differentiators.map((item) => (
                    <div
                      key={item.title}
                      className="border border-[#0A1A2F]/10 bg-white p-5 shadow-sm"
                    >
                      <h3 className="text-lg font-semibold text-[#0A1A2F]">{item.title}</h3>
                      <p className="mt-2 text-sm text-[#0A1A2F]/80">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-[#0A1A2F]/10 bg-white p-6 shadow-sm">
                <p className="text-sm uppercase tracking-[0.16em] text-[#000080]">Approche</p>
                <h3 className="mt-2 text-2xl font-semibold text-[#0A1A2F]">Notre maniere de faire</h3>
                <div className="mt-6 space-y-4">
                  {expertise.steps.map((step, index) => (
                    <div key={step.title} className="flex gap-3">
                      <div className="flex h-9 w-9 items-center justify-center bg-[#000080] text-white">
                        {index + 1}
                      </div>
                      <div className="space-y-1">
                        <p className="text-base font-semibold text-[#0A1A2F]">{step.title}</p>
                        <p className="text-sm text-[#0A1A2F]/80">{step.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-20">
            <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-start">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#000080]">
                  <Sparkles className="h-4 w-4" />
                  Livrables
                </div>
                <h2 className="text-3xl font-semibold text-[#0A1A2F] md:text-4xl">
                  Ce que vous obtenez
                </h2>
                <p className="text-[#0A1A2F]/80">
                  Des livrables concrets, reutilisables par vos equipes et aligne sur vos objectifs
                  business.
                </p>
              </div>
              <div className="grid gap-3">
                {expertise.deliverables.map((deliverable) => (
                  <div
                    key={deliverable}
                    className="flex items-start gap-3 rounded-none border border-[#0A1A2F]/10 bg-[#0A1A2F]/5 px-4 py-3"
                  >
                    <Check className="mt-1 h-5 w-5 text-[#000080]" />
                    <span className="text-[#0A1A2F]">{deliverable}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 border-t border-[#0A1A2F]/10 px-6 py-14 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.2em] text-[#000080]">Parlons-en</p>
              <h2 className="text-3xl font-semibold text-[#0A1A2F] md:text-4xl">
                Planifions un point avec un expert Jarvis
              </h2>
              <p className="text-[#0A1A2F]/80">
                Partagez vos enjeux, nous revenons avec une proposition ciblee et un premier plan
                d'action.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="rounded-none bg-[#000080] text-white hover:bg-[#000080]/90"
              >
                <Link href="/contact" className="inline-flex items-center gap-2">
                  Etre contacte
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                className="rounded-none border border-[#000080]/30 bg-transparent text-[#000080] hover:bg-[#000080]/5"
              >
                <Link href="/#expertises">Retour aux expertises</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};
