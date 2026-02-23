"use client";

import { FormationModulePage } from "@/components/sections/formation-module-page";

export default function AteliersOutillagePage() {
  return (
    <FormationModulePage
      title="Ateliers outillage"
      subtitle="Prise en main des outils de ticketing, supervision, MDM et automatisation pour standardiser les gestes d'exploitation et gagner en efficacite."
      heroImage="https://images.unsplash.com/photo-1573496774379-b930dba17d8b?q=80&w=1400&auto=format&fit=crop"
      objectivesImage="https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1400&auto=format&fit=crop"
      formatLabel="Ateliers pratiques sur outils"
      durationLabel="0.5 a 2 jours"
      audienceLabel="Support N1/N2, admins, team leads"
      objectives={[
        "Configurer les usages essentiels de l'outil de ticketing",
        "Structurer les dashboards et alertes de supervision",
        "Automatiser les taches recurrentes a faible valeur",
        "Formaliser les runbooks et la base de connaissance",
      ]}
      program={[
        {
          title: "Ticketing et priorisation",
          description:
            "Files de traitement, categories, SLA, macros et tableaux de bord pour piloter l'activite support.",
        },
        {
          title: "Supervision et alerting",
          description:
            "Seuils, notifications, escalades et routines de verification pour des alertes plus actionnables.",
        },
        {
          title: "Automatisation",
          description:
            "Templates, scripts simples et automatisations repetitives pour accelerer les traitements N1/N2.",
        },
        {
          title: "Documentation et runbooks",
          description:
            "Structure de la documentation, fiches reflexes et capitalisation des resolutions pour la transmission des savoirs.",
        },
      ]}
    />
  );
}
