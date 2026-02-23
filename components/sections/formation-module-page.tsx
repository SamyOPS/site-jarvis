"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, Users, Wrench } from "lucide-react";

import { Header } from "@/components/sections/header";
import { Footer } from "@/components/sections/footer";
import { Button } from "@/components/ui/button";

type ProgramBlock = {
  title: string;
  description: string;
};

interface FormationModulePageProps {
  title: string;
  subtitle: string;
  heroImage: string;
  objectivesImage?: string;
  formatLabel: string;
  durationLabel: string;
  audienceLabel: string;
  objectives: string[];
  program: ProgramBlock[];
}

export function FormationModulePage({
  title,
  subtitle,
  heroImage,
  objectivesImage,
  formatLabel,
  durationLabel,
  audienceLabel,
  objectives,
  program,
}: FormationModulePageProps) {
  return (
    <>
      <div className="min-h-screen bg-[#eaedf0] text-[#2f3b42]">
        <Header />

        <main className="particle-readability mx-auto max-w-6xl px-6 pt-16 pb-24 lg:pt-24 lg:pb-32">
          <section className="grid gap-8 border border-[#d5d9dc] bg-white p-6 shadow-sm lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
            <div className="space-y-4">
              <Button variant="link" className="p-0 text-[#2f3b42]" asChild>
                <a href="/formations" className="inline-flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Retour aux formations
                </a>
              </Button>

              <p className="text-sm uppercase tracking-[0.2em] text-[#3c4e58]/70">
                Formations / Module
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-[#3c4e58] lg:text-4xl">
                {title}
              </h1>
              <p className="max-w-3xl text-base leading-7 text-[#4f5e66]">{subtitle}</p>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="border border-[#d5d9dc] bg-[#f7f9fb] p-4">
                  <div className="mb-2 flex items-center gap-2 text-[#2F5BFF]">
                    <Wrench className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-[0.16em]">Format</span>
                  </div>
                  <p className="text-sm text-[#3f4f58]">{formatLabel}</p>
                </div>
                <div className="border border-[#d5d9dc] bg-[#f7f9fb] p-4">
                  <div className="mb-2 flex items-center gap-2 text-[#2F5BFF]">
                    <Clock3 className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-[0.16em]">Duree</span>
                  </div>
                  <p className="text-sm text-[#3f4f58]">{durationLabel}</p>
                </div>
                <div className="border border-[#d5d9dc] bg-[#f7f9fb] p-4">
                  <div className="mb-2 flex items-center gap-2 text-[#2F5BFF]">
                    <Users className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-[0.16em]">Public</span>
                  </div>
                  <p className="text-sm text-[#3f4f58]">{audienceLabel}</p>
                </div>
              </div>
            </div>

            <div className="overflow-hidden border border-[#d5d9dc] bg-[#f4f6f8] shadow-sm">
              <img
                src={heroImage}
                alt={title}
                className="h-full min-h-[260px] w-full object-cover"
              />
            </div>
          </section>

          <section className="mt-10 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="flex h-full flex-col border border-[#d5d9dc] bg-white p-6 shadow-sm lg:p-8">
              <p className="text-sm uppercase tracking-[0.2em] text-[#3c4e58]/70">
                Objectifs
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[#2f3b42]">
                Ce que vos equipes vont maitriser
              </h2>
              <ul className="mt-6 space-y-4">
                {objectives.map((item) => (
                  <li key={item} className="flex items-start gap-3.5 text-[15px] text-[#4f5e66] leading-7">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#2F5BFF]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {objectivesImage ? (
                <div className="mt-8 overflow-hidden border border-[#d5d9dc] bg-[#f4f6f8]">
                  <img
                    src={objectivesImage}
                    alt={`Illustration ${title}`}
                    className="h-64 w-full object-cover lg:h-full lg:min-h-[260px]"
                  />
                </div>
              ) : null}
            </div>

            <div className="border border-[#d5d9dc] bg-white p-6 shadow-sm lg:p-8">
              <p className="text-sm uppercase tracking-[0.2em] text-[#3c4e58]/70">
                Programme
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[#2f3b42]">
                Parcours detaille
              </h2>
              <div className="mt-5 space-y-4">
                {program.map((block, index) => (
                  <div key={block.title} className="border border-[#d5d9dc] bg-[#f7f9fb] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2F5BFF]">
                      Etape {index + 1}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-[#2f3b42]">{block.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#4f5e66]">{block.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-10 border border-[#d5d9dc] bg-white p-6 shadow-sm lg:p-8">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_auto] lg:items-center">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-[#3c4e58]/70">
                  Mise en oeuvre
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#2f3b42]">
                  Organisation flexible selon vos contraintes
                </h2>
                <p className="mt-3 text-[#4f5e66] leading-7">
                  Le module peut etre anime en format atelier, coaching terrain ou session ciblee. Nous adaptons les exemples a vos outils et a vos procedures internes pour garantir une application immediate des acquis.
                </p>
              </div>
              <a
                href="/contact"
                className="inline-flex items-center justify-center gap-2 border border-[#2F5BFF] px-5 py-3 text-sm font-medium text-[#2F5BFF] transition hover:bg-[#2F5BFF] hover:text-white"
              >
                Demander un programme
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </section>
        </main>
      </div>

      <Footer />
    </>
  );
}
