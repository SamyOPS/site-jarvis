"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";

interface FeatureItem {
  id: string;
  title: string;
  description: string;
  image: string;
}

interface FormationsSupportProps {
  heading?: string;
  description?: string;
  linkUrl?: string;
  linkText?: string;
  features?: FeatureItem[];
}

export const FormationsSupport = ({
  heading = "Formations Support",
  description =
    "Programmes courts pour former vos équipes support (N1/N2), supervision, ITIL, outils et automatisations pour des interventions plus rapides.",
  linkUrl = "#formations",
  linkText = "Découvrir les formations",
  features = [
    {
      id: "feature-1",
      title: "Parcours support et supervision",
      description:
        "Modules pratiques sur la gestion des incidents, l'escalade, la supervision, la communication et les standards ITIL.",
      image:
        "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=1200&auto=format&fit=crop",
    },
    {
      id: "feature-2",
      title: "Ateliers outillage",
      description:
        "Prise en main des outils de ticketing, supervision, MDM et automatisation pour gagner en efficacité.",
      image:
        "https://images.unsplash.com/photo-1573496774379-b930dba17d8b?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
    {
      id: "feature-3",
      title: "Coaching gestes techniques",
      description:
        "Bonnes pratiques de diagnostic, sécurisation poste, scripts d'intervention et relation utilisateur.",
      image:
        "https://images.unsplash.com/photo-1503428593586-e225b39bddfe?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
  ],
}: FormationsSupportProps) => {
  const primary = features[0];
  const others = features.slice(1);
  if (!primary) return null;

  return (
    <motion.section
      className="relative overflow-hidden bg-white py-14 text-[#0A1A2F] md:py-16"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 md:px-6 lg:px-8">
        <motion.div
          className="space-y-3 text-center"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45, ease: [0.33, 1, 0.68, 1] }}
        >
          <h2 className="text-3xl font-semibold md:text-4xl lg:text-5xl">{heading}</h2>
          <p className="mx-auto max-w-3xl text-base text-muted-foreground md:text-lg">
            {description}
          </p>
          <motion.a
            href={linkUrl}
            className="group inline-flex items-center justify-center text-sm font-medium md:text-base"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.35, ease: [0.33, 1, 0.68, 1], delay: 0.08 }}
          >
            {linkText}
            <ArrowRight className="ml-2 size-4 transition-transform duration-200 group-hover:translate-x-1" />
          </motion.a>
        </motion.div>

        <motion.div
          className="grid gap-8 md:grid-cols-[1.1fr_1fr] md:items-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45, ease: [0.33, 1, 0.68, 1] }}
        >
          <motion.div
            className="overflow-hidden rounded-none"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, ease: [0.33, 1, 0.68, 1] }}
          >
            <motion.img
              src={primary.image}
              alt={primary.title}
              className="h-[240px] w-full object-cover transition duration-500 group-hover:scale-105 md:h-[280px]"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </motion.div>

          <motion.div
            className="flex flex-col gap-4 text-left md:pl-4 lg:pl-8"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, ease: [0.33, 1, 0.68, 1], delay: 0.05 }}
          >
            <h3 className="text-2xl font-semibold md:text-3xl">{primary.title}</h3>
            <p className="text-muted-foreground md:text-lg">{primary.description}</p>
            <div className="inline-flex items-center gap-2 text-sm font-medium text-[#0A1A2F]">
              Découvrir le module
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
            </div>
          </motion.div>
        </motion.div>

        {others.length > 0 && (
          <div className="grid w-full gap-6 md:grid-cols-2">
            {others.map((feature, idx) => (
              <motion.div
                key={feature.id}
                className="group flex flex-col overflow-hidden bg-white"
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1], delay: idx * 0.08 }}
              >
                <div className="overflow-hidden rounded-none mb-3 md:mb-4">
                  <motion.img
                    src={feature.image}
                    alt={feature.title}
                    className="h-[240px] w-full object-cover transition duration-500 group-hover:scale-105 md:h-[280px]"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                  />
                </div>
                <div className="flex flex-col gap-3 text-left px-2 md:px-0">
                  <h4 className="text-xl font-semibold md:text-2xl">{feature.title}</h4>
                  <p className="text-muted-foreground md:text-lg">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.section>
  );
};
