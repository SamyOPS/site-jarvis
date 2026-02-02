"use client";

import {
  HoverSlider,
  HoverSliderImage,
  HoverSliderImageWrap,
  TextStaggerHover,
  useHoverSliderContext,
} from "@/components/animated-slideshow";

interface SupportSlide {
  title: string;
  image: string;
  summary: string;
  bullets: string[];
}

function HoverSliderDetails({ slides }: { slides: SupportSlide[] }) {
  const { activeSlide } = useHoverSliderContext();
  const slide = slides[activeSlide] ?? slides[0];

  return (
    <section className="mt-10 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm">
      <p className="text-sm uppercase tracking-[0.2em] text-[#000080]">Focus du service</p>
      <h2 className="mt-3 text-xl font-semibold text-[#0A1A2F]">{slide.title}</h2>
      <p className="mt-3 text-sm text-slate-700">{slide.summary}</p>
      <ul className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
        {slide.bullets.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="mt-1 size-1.5 rounded-full bg-[#000080]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SupportHoverSlider({ slides }: { slides: SupportSlide[] }) {
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
