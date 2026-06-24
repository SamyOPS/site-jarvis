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
  buttonText = "Decouvrir les opportunites",
  buttonUrl = "/offres",
}: OffresEmploiProps) {
  return (
    <section className="relative overflow-hidden bg-[#F4F7FA] py-10 text-[#0A1A2F] sm:py-12 lg:py-16">
      <div className="absolute inset-x-0 top-0 h-px bg-[#0A1A2F]/10" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-[#0A1A2F]/10" />
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 xl:px-16">
        <motion.div
          className="relative overflow-hidden rounded-3xl border border-[#0A1A2F]/20 bg-white px-5 py-7 shadow-[0_24px_70px_rgba(10,26,47,0.10)] sm:px-7 sm:py-8 md:px-10 md:py-10"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
        >
          <div className="absolute inset-y-0 left-0 w-1.5 bg-[#0A1A2F]" />
          <div className="flex min-w-0 flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 max-w-3xl space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#0A1A2F]">
                Recrutement
              </p>
              <h2 className="break-words text-4xl font-bold leading-tight text-[#0A1A2F] sm:text-5xl lg:text-6xl">
                {heading}
              </h2>
              <p className="max-w-2xl text-base leading-relaxed text-[#0A1A2F]/70 sm:text-lg">
                {description}
              </p>
            </div>

            <Button
              className="group h-auto w-full max-w-full rounded-full bg-[#0A1A2F] px-5 py-4 text-sm font-bold leading-snug text-white hover:bg-[#0d2a4b] sm:w-fit sm:px-6 sm:text-base lg:shrink-0"
              asChild
            >
              <Link href={buttonUrl} className="min-w-0 justify-center text-center">
                <span className="min-w-0 break-words">{buttonText}</span>
                <ArrowRight className="ml-2 size-5 shrink-0 transition-transform group-hover:translate-x-2" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default OffresEmploi;
