import { ParticleSphere } from "@/components/particle-sphere";

export const metadata = {
  title: "Page de test",
  description: "Espace vide pour experimenter des designs.",
};

export default function TestDesignPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-[45vh] w-[45vh] max-h-[70vw] max-w-[70vw]">
          <ParticleSphere />
        </div>
      </div>
    </div>
  );
}
