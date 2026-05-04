"use client";

import {
  HoverSlider,
  HoverSliderImage,
  HoverSliderImageWrap,
  TextStaggerHover,
  useHoverSliderContext,
} from "@/components/animated-slideshow";
import { AnimatePresence, motion } from "motion/react";

interface ConseilSlide {
  title: string;
  image: string;
  summary: string;
  bullets: string[];
}

function HoverSliderDetails({ slides }: { slides: ConseilSlide[] }) {
  const { activeSlide } = useHoverSliderContext();
  const slide = slides[activeSlide] ?? slides[0];

  return (
    <section className="mt-10 border border-slate-200 bg-slate-50/70 px-6 py-4">
      <div className="flex items-center gap-3">
        <span className="h-5 w-1 bg-[#000080]" />
        <p className="text-xs uppercase tracking-[0.3em] text-[#000080]">
          Focus du service
        </p>
      </div>
      <div className="mt-3 min-h-[96px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <h2 className="text-xl font-semibold text-[#0A1A2F]">{slide.title}</h2>
            <p className="mt-3 text-sm text-slate-700">{slide.summary}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="min-h-[64px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${slide.title}-bullets`}
            className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {slide.bullets.map((item) => (
              <div key={item} className="border-t border-slate-200 pt-2 text-[13px] text-slate-700">
                {item}
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

export function ConseilHoverSlider({ slides }: { slides: ConseilSlide[] }) {
  return (
    <HoverSlider className="space-y-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <div className="flex flex-col gap-4 text-lg font-semibold text-[#0A1A2F] md:text-xl">
          {slides.map((slide, index) => (
            <TextStaggerHover
              key={slide.title}
              text={slide.title}
              index={index}
              className="cursor-pointer border border-transparent px-2 py-1 hover:border-[#000080]/30"
            />
          ))}
        </div>
        <HoverSliderImageWrap className="relative aspect-[16/9] overflow-hidden rounded-none border border-[#0A1A2F]/10 bg-[#f8fafc]">
          {slides.map((slide, index) => (
            <HoverSliderImage
              key={slide.title}
              index={index}
              imageUrl={slide.image}
              src={slide.image}
              alt={slide.title}
              className="size-full object-cover"
            />
          ))}
        </HoverSliderImageWrap>
      </div>

      <HoverSliderDetails slides={slides} />
    </HoverSlider>
  );
}
