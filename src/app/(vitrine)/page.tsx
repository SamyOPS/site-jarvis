import Hero from "@/components/vitrine/hero";
import Menu from "@/components/vitrine/menu";

export default function Home() {
  return (
    <main>
      {/* Menu au premier plan, hors du hero (le perspective 3D du hero
          piégerait sinon les éléments fixes de la barre) */}
      <Menu />

      {/* Hero seul : le bouton « Nous découvrir » mène à la page /decouvrir */}
      <Hero />
    </main>
  );
}
