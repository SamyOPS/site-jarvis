"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";

interface OffresEmploiProps {
  heading?: string;
  description?: string;
  buttonText?: string;
  buttonUrl?: string;
}

export function OffresEmploi({
  heading = "Offres d'emploi",
  description = "Découvrez les opportunités ouvertes chez Jarvis Connect et rejoignez une équipe technique qui fait bouger les SI.",
  buttonText = "Voir toutes les offres d'emploi",
  buttonUrl = "/offres",
}: OffresEmploiProps) {
  return (
    <section className="relative overflow-hidden bg-[#F4F7FA] py-16 text-[#0A1A2F]">
      <div className="absolute inset-x-0 top-0 h-px bg-[#0A1A2F]/10" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-[#0A1A2F]/10" />
      <div className="container mx-auto px-6 lg:px-10 xl:px-16">
        <motion.div
          className="relative overflow-hidden rounded-[28px] border border-[#0A1A2F]/20 bg-white px-6 py-8 shadow-[0_24px_70px_rgba(10,26,47,0.10)] md:px-10 md:py-10"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
        >
          <div className="absolute inset-y-0 left-0 w-1.5 bg-[#0A1A2F]" />
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#0A1A2F]">
                Recrutement
              </p>
              <h2 className="text-4xl font-bold tracking-tight text-[#0A1A2F] lg:text-6xl">
                {heading}
              </h2>
              <p className="max-w-2xl text-base leading-relaxed text-[#0A1A2F]/70 md:text-lg">
                {description}
              </p>
            </div>

            <Button
              className="group w-fit rounded-full bg-[#0A1A2F] px-6 py-6 text-base font-bold text-white hover:bg-[#0d2a4b]"
              asChild
            >
              <Link href={buttonUrl}>
                {buttonText}
                <ArrowRight className="ml-2 size-5 transition-transform group-hover:translate-x-2" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default OffresEmploi;
