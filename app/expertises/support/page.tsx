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

const categories = ["Service Desk", "Supervision & MCO", "Infogerance", "Securite", "PRA/PCA"];
const supportImages = [
  "https://images.unsplash.com/photo-1525182008055-f88b95ff7980?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1200&q=80",
];
const slides = categories.map((title, index) => ({
  title,
  image: supportImages[index % supportImages.length],
}));

export const metadata: Metadata = {
  title: "Support & infogerance | Jarvis Connect",
  description: "Apercu visuel de notre expertise support et infogerance.",
};

export default function SupportPage() {
  return (
    <ParticlePage className="bg-white text-[#0A1A2F]">
      <Header />
      <main className="particle-readability">
        <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-20">
          <div className="mb-8 space-y-2">
            <p className="text-sm uppercase tracking-[0.2em] text-[#000080]">Expertise</p>
            <h1 className="text-3xl font-semibold text-[#0A1A2F] md:text-4xl">
              Support & Infogerance
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
      <Footer />
    </ParticlePage>
  );
}

