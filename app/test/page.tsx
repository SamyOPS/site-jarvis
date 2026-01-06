import { Header } from "@/components/sections/header";
import { Footer } from "@/components/sections/footer";
import ParticleField from "./ParticleField";

export const metadata = {
  title: "Page de test",
  description: "Espace vide pour experimenter des designs.",
};

export default function TestDesignPage() {
  return (
    <div className="min-h-screen bg-white text-[#1f2933]">
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="relative min-h-[70vh] overflow-hidden rounded-2xl bg-white">
          <ParticleField />
        </div>
      </main>
      <Footer />
    </div>
  );
}
