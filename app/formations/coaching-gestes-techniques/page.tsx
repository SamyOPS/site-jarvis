"use client";

import { ArrowLeft } from "lucide-react";

import { Header } from "@/components/sections/header";
import { Footer } from "@/components/sections/footer";
import { Button } from "@/components/ui/button";

export default function CoachingGestesTechniquesPage() {
  return (
    <>
      <div className="min-h-screen bg-[#eaedf0] text-[#2f3b42]">
        <Header />

        <main className="particle-readability mx-auto max-w-6xl px-6 pt-16 pb-24 lg:pt-24 lg:pb-32">
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
              Coaching gestes techniques
            </h1>
            <p className="max-w-3xl text-base text-[#4f5e66]">
              Renforcement terrain des bons gestes de diagnostic, de securisation et de communication utilisateur pour des interventions plus fiables.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="border border-[#d5d9dc] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-[#2f3b42]">Module 1 - Diagnostic methodique</h2>
              <p className="mt-2 text-[#4f5e66]">
                Analyse de symptomes, collecte d'informations utiles, reproduction du probleme et priorisation des hypotheses.
              </p>
            </div>
            <div className="border border-[#d5d9dc] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-[#2f3b42]">Module 2 - Gestes de securisation</h2>
              <p className="mt-2 text-[#4f5e66]">
                Bonnes pratiques poste de travail, verification des acces, hygiene de base et reflexes de protection pendant l'intervention.
              </p>
            </div>
            <div className="border border-[#d5d9dc] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-[#2f3b42]">Module 3 - Scripts et outillage de depannage</h2>
              <p className="mt-2 text-[#4f5e66]">
                Utilisation de scripts de diagnostic, commandes standardisees et checklists pour reduire les erreurs de manipulation.
              </p>
            </div>
            <div className="border border-[#d5d9dc] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-[#2f3b42]">Module 4 - Relation utilisateur</h2>
              <p className="mt-2 text-[#4f5e66]">
                Communication claire, cadrage des attentes, explication des actions realisees et posture de service en situation sensible.
              </p>
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </>
  );
}
