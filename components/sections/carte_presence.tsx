"use client";

import { motion, Transition, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

const stats = [
  { value: 15, suffix: "+", label: "Villes couvertes" },
  { value: 50, suffix: "+", label: "Clients accompagnés" },
  { value: 250, suffix: "+", label: "Projets délivrés" },
  { value: 98, suffix: "%", label: "Satisfaction client" },
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

function CountUp({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1500;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target]);

  return <span ref={ref}>{count}{suffix}</span>;
}

export function FranceMap() {
  return (
    <section className="bg-black py-6 md:py-8 text-white overflow-hidden">
      <div className="mx-auto max-w-5xl px-6 lg:px-10">

        <div className="mb-6 text-center">
          <motion.p {...fadeUp} className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-[#2aa0dd]">
            Notre présence
          </motion.p>
          <motion.h2
            {...fadeUp}
            transition={{ ...fadeUpTransition, delay: 0.1 }}
            className="text-xl font-bold text-white md:text-2xl"
          >
            Partout en France
          </motion.h2>
        </div>

        <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-center lg:gap-20">

          <motion.div
            className="w-full lg:w-[42%]"
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="relative group">
              <img
                src="/images/block/france_cartebis.jpg"
                alt="Carte de France Jarvis Connect"
                className="relative w-full h-auto max-h-[500px] rounded-2xl object-contain"
              />
            </div>
          </motion.div>

          <motion.div
            className="w-full lg:w-[48%]"
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="grid grid-cols-2 gap-3">
              {stats.map((stat, idx) => (
                <motion.div
                  key={stat.label}
                  className="group relative rounded-xl bg-white/5 p-4 border border-white/10 hover:border-[#2aa0dd]/50 transition-all duration-300 overflow-hidden"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ ...fadeUpTransition, delay: 0.2 + idx * 0.1 }}
                >
                  <div className="absolute inset-0 bg-[#2aa0dd]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="relative block text-2xl font-black text-[#2aa0dd] mb-1">
                    <CountUp target={stat.value} suffix={stat.suffix} />
                  </span>
                  <span className="relative text-xs font-medium text-gray-400">{stat.label}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}