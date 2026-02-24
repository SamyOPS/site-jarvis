"use client";

import { ReactNode } from "react";
import { motion } from "motion/react";


interface ClientLogo {
  name: string;
  logo: string;
  url?: string;
  logoScale?: number;
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
  const splitIndex = Math.ceil(clients.length / 2);
  const topRowClients = clients.slice(0, splitIndex);
  const bottomRowClients = clients.slice(splitIndex);

  return (
    <section className="bg-[#050B14] text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 lg:flex-row lg:items-start lg:gap-12 lg:px-10 lg:py-20">
        <div className="flex-1">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="space-y-6">
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

              {quote && (
                <motion.div
                  className="max-w-2xl border-l border-white/15 pl-4 sm:pl-5"
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
            </div>

            {highlightLogo && (
              <motion.div
                className="w-full max-w-sm border border-white/20 bg-white p-6 text-center lg:mt-28 lg:w-[320px]"
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
        </div>
      </div>


      <div className="mx-auto max-w-6xl px-6 pb-16 lg:px-10 lg:pb-20">
        <motion.div
          className="relative overflow-hidden p-1 sm:p-2"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, ease: "easeOut", delay: 0.08 }}
        >
          <div className="relative group space-y-4">
            {([
              { items: topRowClients, animationClass: "clients-row-left", row: "top" },
              { items: bottomRowClients.length ? bottomRowClients : topRowClients, animationClass: "clients-row-right", row: "bottom" },
            ] as const).map(({ items, animationClass, row }) => (
              <div key={row} className="overflow-hidden">
                <div className={`flex w-max gap-4 ${animationClass}`}>
                  {[...items, ...items].map((client, index) => (
                    <motion.div
                      key={`${row}-${client.name}-${index}`}
                      className="flex h-24 w-36 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white p-3 text-[#0A1A2F] shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition hover:-translate-y-1 hover:border-white/30 sm:h-28 sm:w-40"
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.45, ease: "easeOut", delay: 0.05 }}
                    >
                      <motion.img
                        src={client.logo}
                        alt={client.name}
                        className="max-h-14 max-w-[80%] object-contain sm:max-h-16"
                        style={{
                          ...(client.logoScale ? { maxWidth: `${80 * client.logoScale}%`, maxHeight: `${56 * client.logoScale}px` } : {}),
                          filter:
                            client.name === "Aramis" || client.name === "Ricco"
                              ? "drop-shadow(0 1px 1px rgba(0,0,0,0.45)) drop-shadow(0 0 6px rgba(0,0,0,0.22))"
                              : "drop-shadow(0 1px 1px rgba(0,0,0,0.35))",
                        }}
                        initial={{ opacity: 0, y: 6 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{ duration: 0.4, ease: "easeOut", delay: 0.04 }}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#050B14] via-[#050B14]/70 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#050B14] via-[#050B14]/70 to-transparent" />
        </motion.div>
      </div>
      <style jsx>{`
        @keyframes clientsMarqueeLeft {
          from { transform: translateX(0); }
          to { transform: translateX(calc(-50% - 0.5rem)); }
        }

        @keyframes clientsMarqueeRight {
          from { transform: translateX(calc(-50% - 0.5rem)); }
          to { transform: translateX(0); }
        }

        .clients-row-left {
          animation: clientsMarqueeLeft 42s linear infinite;
          will-change: transform;
        }

        .clients-row-right {
          animation: clientsMarqueeRight 46s linear infinite;
          will-change: transform;
        }
      `}</style>
    </section>
  );
}
