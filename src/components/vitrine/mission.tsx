import Image from "next/image";

// Paragraphes de la section mission (le premier sert d'accroche).
const paragraphs = [
  "Chez Jarvis Connect, la technologie n’a de valeur que lorsqu’elle rapproche les idées, les talents et les ambitions.",
  "ESN engagée, nous accompagnons votre transformation numérique avec des solutions fiables, agiles et humaines, au service de vos projets et de votre croissance.",
];

const CLOSING = "Bienvenue chez Jarvis Connect.";

/**
 * Discours de l'accueil : texte fixe, sans animation d'apparition (retirees le
 * 19/11/2026, a la demande, sur tous les textes de la vitrine). Composant serveur :
 * plus rien n'y reagit a l'ecran.
 */
export default function Mission() {
  return (
    <section className="flex min-h-dvh flex-col justify-center bg-white pb-16 pt-24 text-zinc-900 sm:pb-20 sm:pt-32 lg:pb-24 lg:pt-40 2xl:pt-48">
      <div className="font-quote mx-auto w-full max-w-3xl px-6 sm:px-12">
        {paragraphs.map((text, i) => (
          <p
            key={i}
            className={
              i === 0
                ? "text-xl leading-snug text-zinc-900 sm:text-2xl lg:text-3xl 2xl:text-4xl"
                : "mt-4 text-base leading-relaxed text-zinc-500 sm:mt-6 sm:text-lg lg:text-xl 2xl:text-2xl"
            }
          >
            {text}
          </p>
        ))}

        <p className="mt-6 text-xl tracking-tight text-zinc-900 sm:mt-10 sm:text-2xl lg:text-3xl 2xl:text-4xl">
          {CLOSING}
        </p>

        {/* Signature manuscrite, a l'encre noire sur le fond blanc.
            `signature-noir.png` et non `signature.png` : l'original a un fond blanc
            OPAQUE, qui, compresse puis tourne de 12°, dessinait un rectangle grise sur
            la page. La copie est derivee de l'original (encre noire, fond transparent). */}
        <Image
          src="/Image/signature-noir.png"
          alt="Signature"
          width={1000}
          height={250}
          className="mt-6 ml-auto block h-auto w-48 -rotate-[12deg] sm:mt-8 sm:w-64 lg:w-80 2xl:w-96"
        />
      </div>
    </section>
  );
}
