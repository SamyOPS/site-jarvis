"use client";

import { ArrowLeft } from "lucide-react";

import { Header } from "@/components/sections/header";
import { Footer } from "@/components/sections/footer";
import { Button } from "@/components/ui/button";

export default function ParcoursSupportPage() {
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
              Parcours support et supervision
            </h1>
            <p className="max-w-3xl text-base text-[#4f5e66]">
              Modules pratiques sur la gestion des incidents, lescalade, la
              supervision, la communication et les standards ITIL.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="border border-[#d5d9dc] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-[#2f3b42]">
                Module 1 - Service desk et priorisation
              </h2>
              <p className="mt-2 text-[#4f5e66]">
                Qualification, priorites, SLA et bonnes pratiques de
                communication avec les utilisateurs.
              </p>
            </div>
            <div className="border border-[#d5d9dc] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-[#2f3b42]">
                Module 2 - Supervision et MCO
              </h2>
              <p className="mt-2 text-[#4f5e66]">
                Alerting, monitoring applicatif et infrastructure, et
                procedures de reprise.
              </p>
            </div>
            <div className="border border-[#d5d9dc] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-[#2f3b42]">
                Module 3 - Escalade et coordination
              </h2>
              <p className="mt-2 text-[#4f5e66]">
                Workflow des escalades, communication interne et suivi des
                actions correctives.
              </p>
            </div>
            <div className="border border-[#d5d9dc] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-[#2f3b42]">
                Module 4 - ITIL et qualite de service
              </h2>
              <p className="mt-2 text-[#4f5e66]">
                Process ITIL essentiels, indicateurs et reporting pour piloter
                la qualite de service.
              </p>
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </>
  );
}
