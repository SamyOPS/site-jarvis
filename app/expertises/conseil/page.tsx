import type { Metadata } from "next";
import {
  HoverSlider,
  HoverSliderImage,
  HoverSliderImageWrap,
  TextStaggerHover,
} from "@/components/animated-slideshow";
import { Header } from "@/components/sections/header";
import { Footer } from "@/components/sections/footer";
import { ParticlePage } from "@/components/particle-page";

const categories = ["Diagnostic", "Architecture cible", "Cloud & FinOps", "Data & Gouvernance", "Cyber", "Pilotage"];
const conseilImages = [
  "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1483478550801-ceba5fe50e8e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1554260570-233d82ca7456?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1504384764586-bb4cdc1707b0?auto=format&fit=crop&w=1200&q=80",
];
const slides = categories.map((title, index) => ({
  title,
  image: conseilImages[index % conseilImages.length],
}));

export const metadata: Metadata = {
  title: "Conseil & transformation | Jarvis Connect",
  description: "Apercu visuel de notre expertise conseil et transformation.",
};

export default function ConseilPage() {
  return (
    <>
    <ParticlePage className="bg-white text-[#0A1A2F]">
      <Header />
      <main className="particle-readability">
        <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-20">
          <div className="mb-8 space-y-2">
            <p className="text-sm uppercase tracking-[0.2em] text-[#000080]">Expertise</p>
            <h1 className="text-3xl font-semibold text-[#0A1A2F] md:text-4xl">
              Conseil & Transformation
            </h1>
          </div>
          <HoverSlider className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
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
          </HoverSlider>
        </div>
      </main>
    </ParticlePage>

    <Footer />
    </>
  );
}

