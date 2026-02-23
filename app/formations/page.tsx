"use client";

import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

import { Header } from "@/components/sections/header";
import { Footer } from "@/components/sections/footer";
import { Button } from "@/components/ui/button";

const modules = [
  {
    title: "Parcours support et supervision",
    href: "/formations/parcours-support",
    image:
      "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=1400&auto=format&fit=crop",
    description:
      "Modules pratiques sur la gestion des incidents, l'escalade, la supervision, la communication et les standards ITIL.",
    bullets: ["Support N1/N2", "Supervision et MCO", "SLA / ITIL"],
  },
  {
    title: "Ateliers outillage",
    href: "/formations/ateliers-outillage",
    image:
      "https://images.unsplash.com/photo-1573496774379-b930dba17d8b?q=80&w=1400&auto=format&fit=crop",
    description:
      "Prise en main des outils de ticketing, supervision, MDM et automatisation pour gagner en efficacite et standardiser les interventions.",
    bullets: ["Ticketing", "Dashboards", "Automatisation"],
  },
  {
    title: "Coaching gestes techniques",
    href: "/formations/coaching-gestes-techniques",
    image:
      "https://images.unsplash.com/photo-1503428593586-e225b39bddfe?q=80&w=1400&auto=format&fit=crop",
    description:
      "Renforcement des bons gestes de diagnostic, de securisation et de communication utilisateur pour des interventions plus fiables.",
    bullets: ["Diagnostic", "Securisation", "Posture de service"],
  },
];

export default function FormationsPage() {
  return (
    <>
      <div className="min-h-screen bg-[#eaedf0] text-[#2f3b42]">
        <Header />

        <main className="particle-readability mx-auto max-w-6xl px-6 pt-16 pb-24 lg:pt-24 lg:pb-32">
          <section className="grid gap-8 border border-[#d5d9dc] bg-white p-6 shadow-sm lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
            <div className="space-y-4">
              <Button variant="link" className="p-0 text-[#2f3b42]" asChild>
                <a href="/#formations" className="inline-flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Retour a l'accueil
                </a>
              </Button>

              <p className="text-sm uppercase tracking-[0.2em] text-[#3c4e58]/70">
                Formations
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-[#3c4e58] lg:text-4xl">
                Formations Support
              </h1>
              <p className="max-w-3xl text-base leading-7 text-[#4f5e66]">
                Programmes courts pour former les equipes support (N1/N2), la supervision, ITIL, les outils et les automatisations afin d'ameliorer la qualite de service et la rapidite d'intervention.
              </p>
            </div>

            <div className="overflow-hidden border border-[#d5d9dc] bg-[#f5f7f9]">
              <img
                src="https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=1400&auto=format&fit=crop"
                alt="Session de formation support"
                className="h-full min-h-[220px] w-full object-cover"
              />
            </div>
          </section>

          <section className="mt-10 space-y-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-[#3c4e58]/70">
                  Modules disponibles
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#2f3b42] lg:text-3xl">
                  Parcours et ateliers pour vos equipes
                </h2>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {modules.map((module) => (
                <article
                  key={module.href}
                  className="group flex h-full flex-col overflow-hidden border border-[#d5d9dc] bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="overflow-hidden border-b border-[#d5d9dc] bg-[#f4f6f8]">
                    <img
                      src={module.image}
                      alt={module.title}
                      className="h-44 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-xl font-semibold text-[#2f3b42]">{module.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-[#4f5e66]">{module.description}</p>

                    <ul className="mt-4 space-y-2 text-sm text-[#3f4f58]">
                      {module.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#2F5BFF]" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>

                    <a
                      href={module.href}
                      className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#0A1A2F] transition hover:text-[#000080]"
                    >
                      Decouvrir le module
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="border border-[#d5d9dc] bg-white p-6 shadow-sm lg:p-8">
              <p className="text-sm uppercase tracking-[0.2em] text-[#3c4e58]/70">
                Sur mesure
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[#2f3b42]">
                Sessions adaptees a votre contexte
              </h2>
              <p className="mt-3 text-[#4f5e66] leading-7">
                Nous adaptons les contenus a vos outils, vos procedures internes et au niveau de maturite de vos equipes. Les sessions peuvent etre organisees en presentiel ou a distance, en format atelier, coaching terrain ou parcours progressif.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 text-sm text-[#3f4f58]">
                <div className="border border-[#d5d9dc] bg-[#f7f9fb] p-4">Audit rapide des besoins</div>
                <div className="border border-[#d5d9dc] bg-[#f7f9fb] p-4">Supports pedagogiques personnalises</div>
                <div className="border border-[#d5d9dc] bg-[#f7f9fb] p-4">Exercices pratiques et cas reels</div>
                <div className="border border-[#d5d9dc] bg-[#f7f9fb] p-4">Suivi de progression</div>
              </div>
            </div>

            <div className="overflow-hidden border border-[#d5d9dc] bg-white shadow-sm">
              <img
                src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1400&auto=format&fit=crop"
                alt="Equipe en atelier de formation"
                className="h-full min-h-[280px] w-full object-cover"
              />
            </div>
          </section>
        </main>
      </div>

      <Footer />
    </>
  );
}
