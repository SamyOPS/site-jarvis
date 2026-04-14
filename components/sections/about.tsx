"use client";

import { motion } from "motion/react";

interface AboutProps {
  title?: string;
  description?: string;
  mainImage?: { src: string; alt: string };
  breakout?: { title?: string; description?: string; extra?: string };
  companiesTitle?: string;
  companies?: Array<{ src: string; alt: string }>;
}

const defaultCompanies = [
  { src: "https://shadcnblocks.com/images/block/logos/company/fictional-company-logo-1.svg", alt: "Arc" },
  { src: "https://shadcnblocks.com/images/block/logos/company/fictional-company-logo-2.svg", alt: "Descript" },
  { src: "https://shadcnblocks.com/images/block/logos/company/fictional-company-logo-3.svg", alt: "Mercury" },
  { src: "https://shadcnblocks.com/images/block/logos/company/fictional-company-logo-4.svg", alt: "Ramp" },
  { src: "https://shadcnblocks.com/images/block/logos/company/fictional-company-logo-5.svg", alt: "Retool" },
  { src: "https://shadcnblocks.com/images/block/logos/company/fictional-company-logo-6.svg", alt: "Watershed" },
];

export const About = ({
  title = "Jarvis Connect, partenaire IT & digital",
  description = "Nous combinons support, développement applicatif et sécurité pour accompagner la croissance des PME et ETI.",
  mainImage = {
    src: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&auto=format&fit=crop&q=80",
    alt: "Équipe au travail",
  },
  breakout = {
    title: "Des équipes engagées pour vos projets IT",
    description: "Support, développement et sécurité assurés par une équipe senior qui s'aligne sur vos enjeux, avec des engagements clairs et une communication transparente.",
  },
  companiesTitle = "Experts transverses pour vos projets",
  companies = defaultCompanies,
}: AboutProps = {}) => {
  return (
    <section className="relative overflow-hidden bg-white pt-16 pb-0 text-[#0A1A2F]">
      <div className="container mx-auto px-6 lg:px-10">

        {/* Header centré */}
        <div className="mb-12 text-center">
          <motion.p
            className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#2aa0dd]"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Qui sommes-nous
          </motion.p>
          <motion.h2
            className="text-4xl font-bold leading-tight text-[#0A1A2F] md:text-5xl"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
          >
            {title}
          </motion.h2>
          <motion.p
            className="mt-4 mx-auto max-w-xl text-base text-[#4B5563]"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            {description}
          </motion.p>
        </div>

        {/* Image + texte */}
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <motion.div
            className="relative overflow-hidden rounded-2xl"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <img
              src={mainImage.src}
              alt={mainImage.alt}
              className="w-full max-h-[380px] rounded-2xl object-cover"
            />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-[#0A1A2F]/30 to-transparent" />
          </motion.div>

          <motion.div
            className="flex flex-col gap-4"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="h-1 w-12 rounded-full bg-[#2aa0dd]" />
            <p className="text-xl font-bold text-[#0A1A2F]">{breakout.title}</p>
            <p className="text-base leading-relaxed text-[#4B5563]">
              {breakout.description}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Section partenaires */}
      <div className="mt-20 bg-[#050B14] px-6 py-12 md:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">

            <motion.div
              className="space-y-4 md:max-w-xs"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2aa0dd]">
                Nos partenaires
              </p>
              <h3 className="text-3xl font-bold leading-tight text-white md:text-4xl">
                {companiesTitle}
              </h3>
              <p className="text-sm text-white/60">
                Une sélection de partenaires qui nous accompagnent sur nos projets clés.
              </p>
            </motion.div>

            <div className="grid flex-1 grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {companies.map((company, idx) => (
                <motion.div
                  key={company.alt + idx}
                  className="flex h-28 items-center justify-center rounded-lg border border-white/20 bg-white px-4 py-3 transition hover:-translate-y-1 hover:border-white/40"
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                >
                  <img
                    src={company.src}
                    alt={company.alt}
                    className="max-h-14 max-w-[80%] object-contain"
                  />
                </motion.div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};