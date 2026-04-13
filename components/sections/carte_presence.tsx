"use client";

import { motion, Transition } from "framer-motion";

const stats = [
  { value: "15+", label: "Villes couvertes" },
  { value: "20+", label: "Clients en France" },
  { value: "98%", label: "Satisfaction client" },
  { value: "24/7", label: "Support disponible" },
];

const fadeUpTransition: Transition = {
  duration: 0.5,
  ease: "easeOut",
};

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: fadeUpTransition
};

export function FranceMap() {
  return (
    <section className="bg-black py-2 md:py-2 text-white">
      <div className="mx-auto max-w-4xl px-6 lg:px-10">

        <div className="mb-4 text-center">
          <motion.p {...fadeUp} className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-[#2aa0dd]">
            {"Notre presence"}
          </motion.p>
          <motion.h2 {...fadeUp} transition={{ ...fadeUpTransition, delay: 0.1 }} className="text-xl font-bold text-white md:text-2xl">
            {"Partout en France"}
          </motion.h2>
        </div>
        <div className="flex flex-col items-center gap-4 lg:flex-row lg:justify-between">

          <motion.div
            className="w-full lg:max-w-[260px]"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <img
              src="/images/block/france_carte.jpg"
              alt="Carte de France Jarvis Connect"
              className="w-full max-h-[330px] h-auto rounded-xl transition-transform duration-500 hover:scale-[1.02] object-cover"
            />
          </motion.div>

          <div className="w-full lg:max-w-sm space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {stats.map((stat, idx) => (
                <motion.div
                  key={stat.label}
                  className="rounded-xl bg-white/5 p-3 border border-white/10"
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ ...fadeUpTransition, delay: 0.3 + idx * 0.1 }}
                >
                  <span className="block text-xl font-black text-[#2aa0dd]">{stat.value}</span>
                  <span className="text-xs font-medium text-gray-500">{stat.label}</span>
                </motion.div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}