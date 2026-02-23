"use client";

import { FormationModulePage } from "@/components/sections/formation-module-page";

export default function CoachingGestesTechniquesPage() {
  return (
    <FormationModulePage
      title="Coaching gestes techniques"
      subtitle="Renforcement terrain des bons gestes de diagnostic, de securisation et de communication utilisateur pour des interventions plus fiables et mieux documentees."
      heroImage="https://images.unsplash.com/photo-1503428593586-e225b39bddfe?q=80&w=1400&auto=format&fit=crop"
      formatLabel="Coaching terrain / cas reels"
      durationLabel="Sessions courtes recurrentes"
      audienceLabel="Techniciens support et proximite"
      objectives={[
        "Adopter une methode de diagnostic reproductible",
        "Securiser l'intervention poste et les acces associes",
        "Utiliser scripts, checklists et commandes standardisees",
        "Ameliorer la relation utilisateur en situation sensible",
      ]}
      program={[
        {
          title: "Diagnostic methodique",
          description:
            "Analyse des symptomes, collecte d'informations utiles, reproduction du probleme et priorisation des hypotheses.",
        },
        {
          title: "Gestes de securisation",
          description:
            "Bonnes pratiques poste de travail, verification des acces et hygiene de base pendant l'intervention.",
        },
        {
          title: "Scripts et outillage de depannage",
          description:
            "Usage de scripts de diagnostic, commandes standardisees et checklists pour reduire les erreurs de manipulation.",
        },
        {
          title: "Relation utilisateur",
          description:
            "Communication claire, cadrage des attentes et explication des actions realisees pour renforcer la confiance.",
        },
      ]}
    />
  );
}
