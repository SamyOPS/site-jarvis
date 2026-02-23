"use client";

import { FormationModulePage } from "@/components/sections/formation-module-page";

export default function ParcoursSupportPage() {
  return (
    <FormationModulePage
      title="Parcours support et supervision"
      subtitle="Modules pratiques sur la gestion des incidents, l'escalade, la supervision, la communication et les standards ITIL pour structurer un support N1/N2 solide."
      heroImage="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=1400&auto=format&fit=crop"
      objectivesImage="https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=1400&auto=format&fit=crop"
      formatLabel="Atelier + mise en situation"
      durationLabel="1 a 2 jours"
      audienceLabel="Equipes support / supervision"
      objectives={[
        "Qualifier et prioriser les demandes selon impact et urgence",
        "Mettre en place une logique d'escalade claire entre N1, N2 et N3",
        "Piloter la supervision et le MCO avec des alertes utiles",
        "Ameliorer la communication utilisateur pendant le traitement",
      ]}
      program={[
        {
          title: "Service desk et priorisation",
          description:
            "Qualification, typologies de demandes, criticite, SLA et routines de tri pour fluidifier la prise en charge.",
        },
        {
          title: "Supervision et MCO",
          description:
            "Monitoring, alerting, traitement des incidents recurrents et bonnes pratiques de maintien en condition operationnelle.",
        },
        {
          title: "Escalade et coordination",
          description:
            "Workflow d'escalade, coordination entre equipes, suivi des actions et reduction des temps de resolution.",
        },
        {
          title: "ITIL et qualite de service",
          description:
            "Process essentiels, KPI, reporting et demarche d'amelioration continue pour piloter la qualite de service.",
        },
      ]}
    />
  );
}
