"use client";

import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import { Layout, Pointer, Zap } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";

import { clipPathVariants } from "@/components/animated-slideshow";

import { Button } from "@/components/ui/button";

interface TabContent {
  title: string;
  description: string;
  buttonText: string;
  buttonUrl?: string;
  imageSrc: string;
  imageAlt: string;
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
  heading = "A Collection of Components Built With Shadcn & Tailwind",
  description = "Join us to build flawless web solutions.",
  tabs = [
    {
      value: "tab-1",
      icon: <Zap className="h-auto w-4 shrink-0" />,
      label: "Boost Revenue",
      content: {
        title: "Make your site a true standout.",
        description:
          "Discover new web trends that help you craft sleek, highly functional sites that drive traffic and convert leads into customers.",
        buttonText: "See Plans",
        imageSrc:
          "https://shadcnblocks.com/images/block/placeholder-dark-1.svg",
        imageAlt: "placeholder",
      },
    },
    {
      value: "tab-2",
      icon: <Pointer className="h-auto w-4 shrink-0" />,
      label: "Higher Engagement",
      content: {
        title: "Boost your site with top-tier design.",
        description:
          "Use stellar design to easily engage users and strengthen their loyalty. Create a seamless experience that keeps them coming back for more.",
        buttonText: "See Tools",
        imageSrc:
          "https://shadcnblocks.com/images/block/placeholder-dark-2.svg",
        imageAlt: "placeholder",
      },
    },
    {
      value: "tab-3",
      icon: <Layout className="h-auto w-4 shrink-0" />,
      label: "Stunning Layouts",
      content: {
        title: "Build an advanced web experience.",
        description:
          "Lift your brand with modern tech that grabs attention and drives action. Create a digital experience that stands out from the crowd.",
        buttonText: "See Options",
        imageSrc:
          "https://shadcnblocks.com/images/block/placeholder-dark-3.svg",
        imageAlt: "placeholder",
      },
    },
  ],
}: TabsFeaturettesProps) => {
  const [activeTab, setActiveTab] = useState(tabs[0].value);
  const active = tabs.find((tab) => tab.value === activeTab) ?? tabs[0];

  const AnimatedText = ({
    text,
    className,
    delay = 0,
  }: {
    text: string;
    className?: string;
    delay?: number;
  }) => (
    <span className={`inline-block overflow-hidden ${className ?? ""}`}>
      {text.split("").map((char, index) => (
        <motion.span
          key={`${char}-${index}`}
          className="inline-block"
          initial={{ y: "110%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          whileInView={{ y: "0%", opacity: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{
            delay: delay + index * 0.015,
            duration: 0.4,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </span>
  );

  return (
    <motion.section
      className="relative overflow-hidden bg-white py-16 md:py-20"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
    >
      <div className="container mx-auto">
        <div className="flex flex-col items-center gap-3 text-center">
          <motion.h1
            className="max-w-2xl text-3xl font-semibold md:text-4xl"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
          >
            {heading}
          </motion.h1>
          <motion.p
            className="text-muted-foreground"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, ease: [0.33, 1, 0.68, 1], delay: 0.05 }}
          >
            {description}
          </motion.p>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="container flex flex-col items-center justify-center gap-3 sm:flex-row md:gap-8">
            {tabs.map((tab, index) => (
              <motion.div
                key={tab.value}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1], delay: index * 0.08 }}
              >
                <TabsTrigger
                  value={tab.value}
                  className="flex items-center gap-2 rounded-none px-4 py-3 text-sm font-semibold text-muted-foreground data-[state=active]:bg-muted data-[state=active]:text-primary"
                >
                  {tab.icon} {tab.label}
                </TabsTrigger>
              </motion.div>
            ))}
          </TabsList>
          <div className="mx-auto mt-6 max-w-screen-xl rounded-none bg-[#F4F7FA] p-6 lg:p-12">
            <div className="grid items-stretch gap-12 lg:grid-cols-2 lg:gap-8 min-h-[360px] lg:min-h-[420px]">
              <div className="flex h-full flex-col justify-between gap-5 min-h-[260px] lg:min-h-[320px]">
                <h3 className="text-xl font-semibold md:text-2xl lg:text-3xl">
                  <AnimatedText text={active.content.title} />
                </h3>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={`${active.value}-desc`}
                    className="text-sm text-muted-foreground md:text-base"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3, ease: [0.33, 1, 0.68, 1], delay: 0.05 }}
                  >
                    {active.content.description}
                  </motion.p>
                </AnimatePresence>
                <Button className="mt-auto w-fit gap-2 rounded-none" size="lg" asChild>
                  <Link href={active.content.buttonUrl ?? "/expertises/support"} prefetch={false}>
                    {active.content.buttonText}
                  </Link>
                </Button>
              </div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.img
                  key={`${active.value}-img`}
                  src={active.content.imageSrc}
                  alt={active.content.imageAlt}
                  className="rounded-none"
                  variants={clipPathVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  transition={{ ease: [0.33, 1, 0.68, 1], duration: 0.8 }}
                />
              </AnimatePresence>
            </div>
          </div>
        </Tabs>
      </div>
    </motion.section>
  );
};

export { TabsFeaturettes };
