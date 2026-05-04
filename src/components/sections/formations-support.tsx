"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";

interface FeatureItem {
  id: string;
  title: string;
  description: string;
  image: string;
  moduleUrl?: string;
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
  linkUrl = "/formations",
  linkText = "Découvrir toutes les formations",
  features = [
    {
      id: "feature-1",
      title: "Parcours support et supervision",
      description:
        "Modules pratiques sur la gestion des incidents, l'escalade, la supervision, la communication et les standards ITIL.",
      moduleUrl: "/formations/parcours-support",
      image:
        "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=1200&auto=format&fit=crop",
    },
    {
      id: "feature-2",
      title: "Ateliers outillage",
      moduleUrl: "/formations/ateliers-outillage",
      description:
        "Prise en main des outils de ticketing, supervision, MDM et automatisation pour gagner en efficacité.",
      image:
        "https://images.unsplash.com/photo-1573496774379-b930dba17d8b?q=80&w=1169&auto=format&fit=crop",
    },
    {
      id: "feature-3",
      title: "Coaching gestes techniques",
      moduleUrl: "/formations/coaching-gestes-techniques",
      description:
        "Bonnes pratiques de diagnostic, sécurisation poste, scripts d'intervention et relation utilisateur.",
      image:
        "https://images.unsplash.com/photo-1503428593586-e225b39bddfe?q=80&w=1170&auto=format&fit=crop",
    },
  ],
}: FormationsSupportProps) => {
  return (
    <section className="bg-white py-16 md:py-20 overflow-hidden">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6 lg:px-8">

        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 1.2, ease: [0.33, 1, 0.68, 1] }}
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-[#0A1A2F] md:text-4xl lg:text-5xl">
            {heading}
          </h2>
          <div className="mt-4 mx-auto w-12 h-1 rounded-full bg-[#0A1A2F]" />
          <p className="mx-auto mt-5 max-w-2xl text-base text-[#4f5e66] md:text-lg leading-relaxed">
            {description}
          </p>
        </motion.div>

        <div className="space-y-16">
          {features.map((feature, index) => {
            const isRight = index % 2 !== 0;
            return (
              <motion.div
                key={feature.id}
                className={`flex flex-col md:flex-row items-center gap-8 md:gap-0 ${
                  isRight ? "md:flex-row-reverse" : ""
                }`}
                initial={{ opacity: 0, x: isRight ? 120 : -120 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 1.6, ease: [0.33, 1, 0.68, 1] }}
              >
                <div className="w-full md:w-5/12 flex justify-center relative">
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 w-[320px] h-[320px] md:w-[400px] md:h-[400px] rounded-full bg-[#e8f4fb] -z-0 ${
                      isRight ? "right-4 md:right-6" : "left-4 md:left-6"
                    }`}
                  />
                  <motion.div
                    className="relative z-10 w-[280px] h-[280px] md:w-[340px] md:h-[340px] rounded-full overflow-hidden"
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 1.4, ease: [0.33, 1, 0.68, 1], delay: 0.2 }}
                    style={{
                      boxShadow: "0 0 0 8px white, 0 20px 60px rgba(10,26,47,0.12)",
                    }}
                  >
                    <img
                      src={feature.image}
                      alt={feature.title}
                      className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                    />
                    <div
                      className="absolute inset-0 rounded-full pointer-events-none"
                      style={{ boxShadow: "inset 0 0 0 24px rgba(255,255,255,0.1)" }}
                    />
                  </motion.div>
                </div>

                <motion.div
                  className={`w-full md:w-7/12 px-4 md:px-12 ${isRight ? "md:text-right" : ""}`}
                  initial={{ opacity: 0, x: isRight ? -60 : 60 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 1.4, ease: [0.33, 1, 0.68, 1], delay: 0.25 }}
                >
                  <span className="text-[10px] font-bold tracking-widest text-[#2aa0dd] uppercase">
                    Module {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 text-2xl font-extrabold text-[#0A1A2F] tracking-tight uppercase md:text-3xl">
                    {feature.title}
                  </h3>
                  <p className="mt-4 text-[#4f5e66] leading-relaxed text-sm md:text-base">
                    {feature.description}
                  </p>
                  <a
                    href={feature.moduleUrl ?? "/formations"}
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#0A1A2F] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2aa0dd] active:scale-95"
                  >
                    Découvrir le module
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 5.0, ease: [0.33, 1, 0.68, 1] }}
        >
          <a
            href={linkUrl}
            className="inline-flex items-center gap-2 rounded-full bg-[#0A1A2F] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#2aa0dd] active:scale-95"
          >
            {linkText}
            <ArrowRight className="h-4 w-4" />
          </a>
        </motion.div>

      </div>
    </section>
  );
};