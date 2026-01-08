"use client";

import { Header } from "@/components/sections/header";
import { Footer } from "@/components/sections/footer";
import { ParticlePage } from "@/components/particle-page";

export default function PolitiqueDeConfidentialitePage() {
  return (
    <>
    <ParticlePage className="bg-[#eaedf0] text-[#2f3b42]">
      <Header />

      <main className="particle-readability max-w-6xl mx-auto px-6 pt-16 pb-24 lg:pt-24 lg:pb-32">
        <h1 className="text-2xl font-semibold tracking-tight text-[#3c4e58] lg:text-4xl">
          Politique de confidentialite
        </h1>
        <p className="mt-6 text-base text-[#4f5e66]">Contenu a venir.</p>
      </main>
    </ParticlePage>

    <Footer />
    </>
  );
}
