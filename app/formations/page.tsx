"use client";

import { ArrowLeft } from "lucide-react";

import { Header } from "@/components/sections/header";
import { Footer } from "@/components/sections/footer";
import { Button } from "@/components/ui/button";

export default function FormationsPage() {
  return (
    <>
      <div className="min-h-screen bg-[#eaedf0] text-[#2f3b42]">
        <Header />

        <main className="particle-readability mx-auto max-w-6xl px-6 pt-16 pb-24 lg:pt-24 lg:pb-32">
          <div className="space-y-4">
            <Button variant="link" className="p-0 text-[#2f3b42]" asChild>
              <a href="/#formations" className="inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Retour à l'accueil
              </a>
            </Button>
            <p className="text-sm uppercase tracking-[0.2em] text-[#3c4e58]/70">
              Formations
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-[#3c4e58] lg:text-4xl">
              Formations Support
            </h1>
            <p className="max-w-3xl text-base text-[#4f5e66]">
              Programmes courts pour former les equipes support (N1/N2), la
              supervision, ITIL, outils et automatisations pour des
              interventions plus rapides.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="border border-[#d5d9dc] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-[#2f3b42]">
                Parcours support et supervision
              </h2>
              <p className="mt-2 text-[#4f5e66]">
                Modules pratiques sur la gestion des incidents, l&apos;escalade,
                la supervision, la communication et les standards ITIL.
              </p>
            </div>
            <div className="border border-[#d5d9dc] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-[#2f3b42]">
                Ateliers outillage
              </h2>
              <p className="mt-2 text-[#4f5e66]">
                Prise en main des outils de ticketing, supervision, MDM et
                automatisation pour gagner en efficacite.
              </p>
            </div>
            <div className="border border-[#d5d9dc] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-[#2f3b42]">
                Coaching gestes techniques
              </h2>
              <p className="mt-2 text-[#4f5e66]">
                Bonnes pratiques de diagnostic, securisation poste, scripts
                d&apos;intervention et relation utilisateur.
              </p>
            </div>
            <div className="border border-[#d5d9dc] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-[#2f3b42]">
                Sur mesure
              </h2>
              <p className="mt-2 text-[#4f5e66]">
                Sessions adaptees a votre organisation, vos outils et vos
                priorites.
              </p>
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </>
  );
}
