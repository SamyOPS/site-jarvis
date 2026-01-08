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

const categories = ["Discovery", "UX/UI", "Front/Back/API", "Qualite & Tests", "CI/CD", "Observabilite"];
const devImages = [
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1526378722484-cc1ab70f1d0f?auto=format&fit=crop&w=1200&q=80",
];
const slides = categories.map((title, index) => ({
  title,
  image: devImages[index % devImages.length],
}));

export const metadata: Metadata = {
  title: "Developpement applicatif | Jarvis Connect",
  description: "Apercu visuel de notre expertise developpement.",
};

export default function DeveloppementPage() {
  return (
    <>
    <ParticlePage className="bg-white text-[#0A1A2F]">
      <Header />
      <main className="particle-readability">
        <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-20">
          <div className="mb-8 space-y-2">
            <p className="text-sm uppercase tracking-[0.2em] text-[#000080]">Expertise</p>
            <h1 className="text-3xl font-semibold text-[#0A1A2F] md:text-4xl">
              Developpement applicatif
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

