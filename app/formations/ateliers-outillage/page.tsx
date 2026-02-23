"use client";

import { ArrowLeft } from "lucide-react";

import { Header } from "@/components/sections/header";
import { Footer } from "@/components/sections/footer";
import { Button } from "@/components/ui/button";

export default function AteliersOutillagePage() {
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
              Ateliers outillage
            </h1>
            <p className="max-w-3xl text-base text-[#4f5e66]">
              Prise en main des outils de ticketing, supervision, MDM et automatisation pour gagner en efficacite et standardiser les interventions.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="border border-[#d5d9dc] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-[#2f3b42]">Atelier 1 - Ticketing et priorisation</h2>
              <p className="mt-2 text-[#4f5e66]">
                Configuration des files, typologies de demandes, regles de priorite et suivi SLA dans l'outil de support.
              </p>
            </div>
            <div className="border border-[#d5d9dc] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-[#2f3b42]">Atelier 2 - Supervision et alerting</h2>
              <p className="mt-2 text-[#4f5e66]">
                Mise en place de dashboards, seuils d'alerte, escalades et routines de controle pour les equipes support.
              </p>
            </div>
            <div className="border border-[#d5d9dc] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-[#2f3b42]">Atelier 3 - Automatisation</h2>
              <p className="mt-2 text-[#4f5e66]">
                Scripts simples, templates de reponse et automatisations repetitives pour accelerer les traitements N1/N2.
              </p>
            </div>
            <div className="border border-[#d5d9dc] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-[#2f3b42]">Atelier 4 - Documentation et runbooks</h2>
              <p className="mt-2 text-[#4f5e66]">
                Structuration des procedures, fiches reflexes et capitalisation des resolutions dans une base de connaissance exploitable.
              </p>
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </>
  );
}
