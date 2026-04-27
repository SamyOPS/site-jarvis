"use client";

import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";

interface TabContent {
  title: string;
  description: string;
  buttonText: string;
  buttonUrl?: string;
  imageSrc: string;
  imageAlt: string;
  badge?: string;
}

interface Tab {
  value: string;
  icon: React.ReactNode;
  label: string;
  content: TabContent;
}

interface TabsFeaturettesProps {
  heading?: string;
  description?: string;
  tabs?: Tab[];
}

const TabsFeaturettes = ({
  heading = "Nos expertises cles",
  description = "Support & infogerance, developpement applicatif, conseil et transformation digitale pour des SI performants.",
  tabs = [],
}: TabsFeaturettesProps) => {
  const [activeTab, setActiveTab] = useState(tabs[0]?.value ?? "");
  const active = tabs.find((tab) => tab.value === activeTab) ?? tabs[0];

  return (
    <motion.section
      className="relative overflow-hidden py-10 md:py-14 bg-gradient-to-b from-white via-white to-[#f8fbff]"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
    >
      <div style={{ position: "absolute", top: "-15%", right: "-10%", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(42,160,221,0.05) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none", animation: "float 8s ease-in-out infinite" }} />
      <div style={{ position: "absolute", bottom: "-20%", left: "-15%", width: "350px", height: "350px", background: "radial-gradient(circle, rgba(42,160,221,0.03) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none", animation: "float 10s ease-in-out infinite reverse" }} />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(30px); }
        }
      `}</style>

      <div className="container mx-auto px-6 lg:px-10 relative z-10">
        <div className="mb-8 flex flex-col items-center gap-2 text-center max-w-3xl mx-auto">
          <motion.h2
            className="text-3xl md:text-4xl font-bold text-[#0A1A2F] tracking-tight"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.05 }}
          >
            {heading}
          </motion.h2>
          <motion.p
            className="text-base text-gray-600 max-w-2xl leading-relaxed"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.08 }}
          >
            {description}
          </motion.p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col items-center justify-center mb-8">
            <TabsList className="flex flex-col sm:flex-row gap-2 bg-transparent flex-wrap justify-center">
              {tabs.map((tab, index) => (
                <motion.div
                  key={tab.value}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.06 }}
                >
                  <TabsTrigger
                    value={tab.value}
                    className="relative group px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 flex items-center gap-2"
                    style={{
                      background: activeTab === tab.value
                        ? "rgba(10,26,47,0.08)"
                        : "transparent",
                      color: activeTab === tab.value ? "#0A1A2F" : "#64748b",
                      border: activeTab === tab.value
                        ? "1px solid rgba(10,26,47,0.2)"
                        : "1px solid transparent",
                    }}
                  >
                    <span className="text-lg transition-transform group-hover:scale-110">
                      {tab.icon}
                    </span>
                    <span>{tab.label}</span>
                  </TabsTrigger>
                </motion.div>
              ))}
            </TabsList>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 bg-gradient-to-br from-blue-50/50 via-white to-cyan-50/30 rounded-3xl blur-3xl opacity-40 -z-10" />
            <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl shadow-lg overflow-hidden">
              <div className="p-6 lg:p-8">
                <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-8 min-h-[320px]">

                  <motion.div
                    key={`${active.value}-content`}
                    className="flex flex-col gap-5"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.4 }}
                  >
                    <AnimatePresence mode="wait">
                      <motion.h3
                        key={`${active.value}-title`}
                        className="text-2xl md:text-3xl font-bold text-[#0A1A2F] leading-tight"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.35 }}
                      >
                        {active.content.title}
                      </motion.h3>
                    </AnimatePresence>

                    <AnimatePresence mode="wait">
                      <motion.p
                        key={`${active.value}-desc`}
                        className="text-sm leading-relaxed text-gray-600"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.3, delay: 0.05 }}
                      >
                        {active.content.description}
                      </motion.p>
                    </AnimatePresence>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`${active.value}-btn`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                        className="pt-2"
                      >
                        <Link
                          href={active.content.buttonUrl ?? "#"}
                          className="inline-flex items-center gap-2 rounded-full bg-[#0A1A2F] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#2aa0dd] active:scale-95 group"
                        >
                          {active.content.buttonText}
                          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" className="group-hover:translate-x-1 transition-transform">
                            <path d="M3 9h12M11 5l4 4-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </Link>
                      </motion.div>
                    </AnimatePresence>
                  </motion.div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${active.value}-img`}
                      className="relative group"
                      initial={{ opacity: 0, scale: 0.95, x: 20 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95, x: -20 }}
                      transition={{ duration: 0.4 }}
                    >
                      <div className="absolute -inset-1 bg-gradient-to-r from-[#0A1A2F]/10 to-[#2aa0dd]/10 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="relative rounded-xl overflow-hidden border border-white/20 shadow-lg group-hover:shadow-2xl transition-shadow duration-300">
                        <img
                          src={active.content.imageSrc}
                          alt={active.content.imageAlt}
className="w-full h-[320px] object-cover object-center group-hover:scale-110 transition-transform duration-500"                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                    </motion.div>
                  </AnimatePresence>

                </div>
              </div>
            </div>
          </div>
        </Tabs>
      </div>
    </motion.section>
  );
};

export { TabsFeaturettes };