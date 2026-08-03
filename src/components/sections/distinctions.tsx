"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { Award, Trophy } from "lucide-react";

const distinctions = [
  {
    icon: Trophy,
    title: "Top 50 des ESN",
    description: "Classé parmi les 50 meilleures ESN",
  },
  {
    icon: Award,
    title: "1er prix Satisfaction Client",
    description: "Pour la réactivité et la qualité de notre accompagnement",
  },
];

interface DistinctionsProps {
  tag?: string;
  awardedByLabel?: string;
  className?: string;
}

/**
 * Bloc compact des distinctions Opteamis, pensé pour s'insérer dans une
 * colonne sur fond clair (section About) plutôt qu'en bandeau pleine largeur.
 */
export const Distinctions = ({
  tag = "Nos distinctions",
  awardedByLabel = "Décernées par",
  className = "",
}: DistinctionsProps = {}) => {
  return (
    <motion.div
      className={`rounded-2xl border border-[#2aa0dd]/20 bg-[#F4F7FA] p-5 ${className}`}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.15 }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#2aa0dd]">
        {tag}
      </p>

      <ul className="mt-4 space-y-3">
        {distinctions.map(({ icon: Icon, title, description }) => (
          <li key={title} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2aa0dd]/12 text-[#2aa0dd]">
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
            </span>
            <span>
              <span className="block text-sm font-bold text-[#0A1A2F]">
                {title}
              </span>
              <span className="block text-xs leading-relaxed text-[#4B5563]">
                {description}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[#2aa0dd]/15 pt-4">
        <span className="text-xs font-medium text-[#4B5563]">
          {awardedByLabel}
        </span>
        <span className="flex items-center rounded-lg bg-white px-3 py-1.5 ring-1 ring-[#2aa0dd]/15">
          <Image
            src="/partenaire/opteamis.png"
            alt="Opteamis"
            width={300}
            height={169}
            className="h-11 w-auto object-contain"
          />
        </span>
      </div>
    </motion.div>
  );
};
