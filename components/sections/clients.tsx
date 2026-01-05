"use client";

import { ReactNode } from "react";
import { motion } from "motion/react";


interface ClientLogo {
  name: string;
  logo: string;
  url?: string;
}

interface ClientsProps {
  tag?: string;
  title?: string;
  description?: string;
  clients?: ClientLogo[];
  highlightLogo?: string;
  quote?: ReactNode;
  author?: string;
}

export function Clients({
  tag = "Nos Références clients",
  title = "Ils nous font confiance",
  description = "Pour deployer nos solutions numeriques a travers l'Europe.",
  clients = [],
  highlightLogo,
  quote,
  author
}: ClientsProps) {
  return (
    <section className="bg-[#050B14] text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 lg:flex-row lg:items-start lg:gap-12 lg:px-10 lg:py-20">
        <div className="flex-1 space-y-8">
          <div className="space-y-3">
            <motion.p
              className="text-sm font-semibold uppercase tracking-[0.2em] text-[#1557C0]"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, ease: "easeOut", delay: 0.05 }}
            >
              {tag}
            </motion.p>
            <motion.h2
              className="font-display text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 }}
            >
              {title}
            </motion.h2>
            <motion.p
              className="max-w-xl text-base text-white/80"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, ease: "easeOut", delay: 0.1 }}
            >
              {description}
            </motion.p>
          </div>

          {highlightLogo && (
            <motion.div
              className="w-full max-w-xs border border-white/20 bg-white p-6 text-center"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 }}
            >
              <motion.img
                src={highlightLogo}
                alt="Client principal"
                className="mx-auto h-40 w-40 object-contain"
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
              />
            </motion.div>
          )}
        </div>

        <div className="flex-1 space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-3">
            {clients.map((client) => (
              <motion.a
                key={client.name}
                href={client.url || "#"}
                className="flex h-32 items-center justify-center border border-white/15 bg-white text-[#0A1A2F] transition hover:translate-y-[-4px] hover:border-white/40"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.06 }}
              >
                <motion.img
                  src={client.logo}
                  alt={client.name}
                  className="max-h-16 max-w-[70%] object-contain"
                  initial={{ opacity: 0, y: 6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.45, ease: "easeOut", delay: 0.05 }}
                />
              </motion.a>
            ))}
          </div>
        </div>
      </div>

      {quote && (
        <motion.div
          className="mx-auto max-w-6xl px-6 pb-16 lg:px-10 lg:pb-20"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, ease: "easeOut", delay: 0.08 }}
        >
          <blockquote className="w-full text-white/90">
            <div className="text-lg leading-relaxed">{quote}</div>
            {author && (
              <footer className="mt-3 text-sm font-semibold text-white/70">
                {author}
              </footer>
            )}
          </blockquote>
        </motion.div>
      )}
    </section>
  );
}
