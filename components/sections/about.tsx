"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

interface AboutProps {
  title?: string;
  description?: string;
  mainImage?: {
    src: string;
    alt: string;
  };
  breakout?: {
    title?: string;
    description?: string;
    extra?: string;
  };
  companiesTitle?: string;
  companies?: Array<{
    src: string;
    alt: string;
  }>;
  achievementsTitle?: string;
  achievementsDescription?: string;
  achievements?: Array<{
    label: string;
    value: string;
  }>;
}

const defaultCompanies = [
  {
    src: "https://shadcnblocks.com/images/block/logos/company/fictional-company-logo-1.svg",
    alt: "Arc",
  },
  {
    src: "https://shadcnblocks.com/images/block/logos/company/fictional-company-logo-2.svg",
    alt: "Descript",
  },
  {
    src: "https://shadcnblocks.com/images/block/logos/company/fictional-company-logo-3.svg",
    alt: "Mercury",
  },
  {
    src: "https://shadcnblocks.com/images/block/logos/company/fictional-company-logo-4.svg",
    alt: "Ramp",
  },
  {
    src: "https://shadcnblocks.com/images/block/logos/company/fictional-company-logo-5.svg",
    alt: "Retool",
  },
  {
    src: "https://shadcnblocks.com/images/block/logos/company/fictional-company-logo-6.svg",
    alt: "Watershed",
  },
];

const defaultAchievements = [
  { label: "Companies Supported", value: "300+" },
  { label: "Projects Finalized", value: "800+" },
  { label: "Happy Customers", value: "99%" },
  { label: "Recognized Awards", value: "10+" },
];

const AnimatedNumber = ({
  value,
  duration = 1400,
  className = "",
}: {
  value: string;
  duration?: number;
  className?: string;
}) => {
  const [displayValue, setDisplayValue] = useState<string>(value);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const target = ref.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hasStarted) return;

    const slashMatch = value.match(/^(\d+(?:[.,]\d+)?)(\/.+)$/);
    const match = slashMatch ?? value.match(/^(\d+(?:[.,]\d+)?)([^\d]*)$/);
    if (!match) {
      setDisplayValue(value);
      return;
    }

    const numericPart = parseFloat(match[1].replace(",", "."));
    const suffix = match[2] ?? "";

    if (Number.isNaN(numericPart)) {
      setDisplayValue(value);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const current = Math.round(progress * numericPart);
      setDisplayValue(`${current}${suffix}`);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, hasStarted, value]);

  return (
    <span ref={ref} className={className}>
      {displayValue}
    </span>
  );
};

export const About = ({
  title = "About Us",
  description = "Shadcnblocks is a passionate team dedicated to creating innovative solutions that empower businesses to thrive in the digital age.",
  mainImage = {
    src: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&auto=format&fit=crop&q=80",
    alt: "Équipe au travail",
  },
  breakout = {
    title: "Des €÷quipes engag€÷es pour vos projets IT",
    description:
      "Support, dÇ¸veloppement et sÇ¸curitÇ¸ assurÇ¸s par une Ç¸quipe senior qui s'aligne sur vos enjeux.",
  },
  companiesTitle = "Valued by clients worldwide",
  companies = defaultCompanies,
  achievementsTitle = "Our Achievements in Numbers",
  achievementsDescription = "Providing businesses with effective tools to improve workflows, boost efficiency, and encourage growth.",
  achievements = defaultAchievements,
}: AboutProps = {}) => {
  const extraBreakoutText =
    breakout.extra ??
    "Nous pilotons les incidents, la supervision et l'industrialisation des d€÷ploiements pour que vos utilisateurs restent productifs.";

  return (
    <section className="relative overflow-hidden bg-white pt-16 pb-10 text-[#0A1A2F] md:pt-20 md:pb-12">
      <div className="container relative z-10 mx-auto px-6 lg:px-10">
        <div className="mb-10 flex flex-col gap-4 text-center md:text-left">
          <motion.h1
            className="w-full text-4xl font-semibold leading-tight md:text-5xl"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
          >
            {title}
          </motion.h1>
          <motion.p
            className="text-base text-[#4B5563] md:text-lg"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.45, ease: [0.33, 1, 0.68, 1], delay: 0.05 }}
          >
            {description}
          </motion.p>
        </div>
        <div className="grid gap-7 lg:grid-cols-2 lg:items-start">
          <motion.div
            className="relative"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
          >
            <img
              src={mainImage.src}
              alt={mainImage.alt}
              className="relative z-10 size-full max-h-[360px] rounded-none object-cover"
            />
          </motion.div>
          <div className="flex flex-col gap-6">
            <motion.div
              className="text-left"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.45, ease: [0.33, 1, 0.68, 1], delay: 0.05 }}
            >
              <p className="mb-4 text-lg font-semibold text-[#0A1A2F]">
                {breakout.title}
              </p>
              <p className="text-base leading-relaxed text-[#4B5563] md:text-lg md:leading-8">
                {breakout.description}
              </p>
              <p className="mt-3 text-base leading-relaxed text-[#4B5563] md:text-lg md:leading-8">
                {extraBreakoutText}
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="relative mt-12 md:mt-16">
        <div className="relative z-10 bg-[#050B14] px-6 py-12 text-white md:px-10 md:py-16">
          <div className="mx-auto flex max-w-6xl flex-col gap-10 md:flex-row md:items-start md:justify-between">
            <motion.div
              className="space-y-4 md:max-w-xl"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1A73E8]">
                Nos partenaires
              </p>
              <h3 className="font-display text-3xl font-semibold leading-tight text-white md:text-4xl">
                {companiesTitle}
              </h3>
              <p className="text-sm text-white/75">
                Une sélection de partenaires qui nous accompagnent sur nos projets clés.
              </p>
            </motion.div>
            <div className="grid flex-1 grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {companies.map((company, idx) => (
                <motion.div
                  className="flex h-28 items-center justify-center border border-white/20 bg-white px-4 py-3 transition hover:-translate-y-1 hover:border-white/40"
                  key={company.alt + idx}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1], delay: idx * 0.05 }}
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
        <div className="relative z-10">
          <div className="container mx-auto px-6 lg:px-10">
            <div className="relative overflow-hidden rounded-none bg-[#F4F7FA] p-8 md:p-12">
              <motion.div
                className="flex flex-col gap-4 text-center md:text-left"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
              >
                <h2 className="text-3xl font-semibold md:text-4xl">
                  {achievementsTitle}
                </h2>
                <p className="max-w-screen-sm text-[#4B5563]">
                  {achievementsDescription}
                </p>
              </motion.div>
              <div className="mt-8 grid grid-cols-1 gap-6 text-center md:flex md:flex-wrap md:justify-between md:gap-8">
                {achievements.map((item, idx) => (
                  <motion.div
                    className="flex flex-col items-center gap-2 text-center"
                    key={item.label + idx}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1], delay: idx * 0.05 }}
                  >
                    <AnimatedNumber
                      value={item.value}
                      className="text-4xl font-semibold md:text-5xl"
                    />
                    <p className="text-sm text-[#4B5563]">{item.label}</p>
                  </motion.div>
                ))}
              </div>
              <div className="pointer-events-none absolute -top-1 right-1 z-10 hidden h-full w-full bg-[linear-gradient(to_right,#d1d5db_1px,transparent_1px),linear-gradient(to_bottom,#d1d5db_1px,transparent_1px)] bg-[size:80px_80px] opacity-20 [mask-image:linear-gradient(to_bottom_right,#000,transparent,transparent)] md:block"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
