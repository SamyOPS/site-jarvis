"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePageTransition } from "@/components/vitrine/page-transition";

// Révélation masquée lettre par lettre au chargement (même effet que la citation).
function RevealText({
  text,
  base = 0,
  step = 0.03,
  className,
}: {
  text: string;
  base?: number;
  step?: number;
  className?: string;
}) {
  let idx = -1;
  const words = text.split(" ");
  return (
    <span className={className} aria-label={text}>
      {words.map((word, wi) => (
        <span
          key={wi}
          className={`inline-block whitespace-nowrap${
            wi < words.length - 1 ? " mr-[0.25em]" : ""
          }`}
        >
          {[...word].map((char, ci) => {
            idx += 1;
            return (
              <span key={ci} aria-hidden className="reveal-mask">
                <span
                  className="reveal-inner"
                  style={{ animationDelay: `${base + idx * step}s` }}
                >
                  {char}
                </span>
              </span>
            );
          })}
        </span>
      ))}
    </span>
  );
}

export default function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ignited, setIgnited] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const { navigate } = usePageTransition();

  // Bascule sur l'image du réacteur allumé pour simuler un allumage constant.
  const ignite = () => setIgnited(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Accessibilité : si l'utilisateur préfère réduire les animations, on
    // affiche directement le réacteur allumé. Sinon, filet de sécurité au cas
    // où la vidéo ne se charge pas (autoplay bloqué, erreur réseau…).
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const delay = reduceMotion ? 0 : 12000;
    const timer = window.setTimeout(ignite, delay);
    return () => window.clearTimeout(timer);
  }, []);

  // Sur l'accueil, scroller vers le bas déclenche la même transition que le
  // bouton « Nous découvrir » (le hero ne défile pas de lui-même).
  useEffect(() => {
    let triggered = false;
    const go = () => {
      // Ne rien faire si le menu est ouvert (scroll verrouillé) ou déjà lancé.
      if (document.documentElement.style.overflow === "hidden") return;
      if (triggered) return;
      triggered = true;
      navigate("/decouvrir", "down");
    };
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY > 15) go();
    };
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (startY - (e.touches[0]?.clientY ?? 0) > 40) go();
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [navigate]);

  // Parallaxe : le réacteur s'incline légèrement en suivant le curseur (3D).
  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const { innerWidth, innerHeight } = window;
    const x = (e.clientX / innerWidth - 0.5) * 2; // -1 → 1
    const y = (e.clientY / innerHeight - 0.5) * 2; // -1 → 1
    setTilt({ x, y });
  };

  const resetTilt = () => setTilt({ x: 0, y: 0 });

  // Citation : animée lettre par lettre (cascade verticale) après le titre.
  const quote = "Records are made to be broken!";
  const quoteBaseDelay = 1.3; // s, après l'apparition du titre
  const quoteStep = 0.04; // s entre chaque lettre
  const quoteLetterCount = quote.replace(/\s/g, "").length;
  const captionDelay = quoteBaseDelay + quoteLetterCount * quoteStep + 0.25;
  let letterIndex = -1; // incrémenté uniquement sur les caractères visibles

  return (
    <section
      onMouseMove={handleMouseMove}
      onMouseLeave={resetTilt}
      className="relative h-dvh w-full overflow-hidden bg-white"
      style={{ perspective: "1200px" }}
    >
      {/* Réacteur (vidéo puis image) avec parallaxe 3D au curseur.
          Sur portable (écran court) : léger retrait vertical pour dégager le titre. */}
      <div
        className="absolute inset-0 transition-transform duration-300 ease-out laptop:inset-y-[6%]"
        style={{
          transform: `rotateY(${tilt.x * 4}deg) rotateX(${-tilt.y * 4}deg) translateX(${tilt.x * 8}px) translateY(${tilt.y * 8}px)`,
        }}
      >
        {/* Vidéo d'allumage du réacteur en fond plein écran.
            Elle s'efface une fois l'image allumée prête (le ratio de la vidéo
            diffère du PNG, sa lueur dépasserait sinon les bords de l'image). */}
        <video
          ref={videoRef}
          className={`absolute inset-0 h-full w-full object-contain mix-blend-multiply transition-opacity duration-1000 ${
            ignited ? "opacity-0" : "opacity-100"
          }`}
          src="/Video/allumage_reacteur_v1.mp4"
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={ignite}
        />

        {/* Image du réacteur allumé : prend le relais à la fin de la vidéo (fixe) */}
        <div
          className={`absolute inset-0 transition-opacity duration-1000 ${
            ignited ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src="/Image/reacteur_ark_allume_de_fasse.png"
            alt="Réacteur Ark allumé"
            fill
            priority
            draggable={false}
            sizes="100vw"
            className="object-contain mix-blend-multiply"
          />

          {/* Halo lumineux qui respire au centre du réacteur */}
          <div
            aria-hidden
            className="animate-core pointer-events-none absolute left-[58%] top-[62%] h-[28vmin] w-[28vmin] -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
            style={{
              background:
                "radial-gradient(circle, rgba(220,240,255,0.95) 0%, rgba(150,210,255,0.55) 45%, rgba(255,255,255,0) 70%)",
            }}
          />
        </div>
      </div>

      {/* Flash de bloom au moment exact de l'allumage */}
      {ignited && (
        <div
          aria-hidden
          className="animate-bloom pointer-events-none absolute left-1/2 top-[46%] h-[50vmin] w-[50vmin] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(160,220,255,0.6) 40%, rgba(255,255,255,0) 70%)",
          }}
        />
      )}

      {/*
        Phrase d'accroche + mots clés, centrés en haut de page.

        `top-20` (80 px) sur mobile, et non `top-10` : c'est exactement le bas de la
        barre de navigation, dont les enfants sont `fixed top-8` (32 px) et dont la
        hauteur est donnée par le burger, `h-12` (48 px). À 40 px, ce bloc passait
        sous le bouton « Contactez nous » et sous le burger — invisible sur desktop,
        où il reste large et centré loin des coins, mais franc sur un écran étroit.

        `inset-x-0 mx-auto` et non `left-1/2 -translate-x-1/2` : un bloc absolu posé
        à `left: 50%` sans `right` se dimensionne au plus sur la moitié restante du
        conteneur, soit 50vw. Sur mobile, l'accroche se retrouvait pliée dans ~195 px
        — d'où des lignes supplémentaires qui la faisaient déborder d'autant plus sur
        la barre. Cadré sur toute la largeur, le bloc reste centré à l'identique sur
        desktop, où `max-w-2xl` le bornait déjà bien avant les 50vw.
      */}
      <div className="pointer-events-none absolute inset-x-0 top-20 z-20 mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 text-center sm:top-12">
        <p
          className="animate-fade-in text-2xl font-semibold leading-snug text-zinc-800 sm:text-4xl"
          style={{ animationDelay: "0.5s" }}
        >
          Propulsez vos projets IT &amp; digital.
        </p>
        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500 sm:text-sm">
          <RevealText text="Support" base={1.5} step={0.03} />
          <span className="text-zinc-300">·</span>
          <RevealText text="Développement" base={1.7} step={0.03} />
          <span className="text-zinc-300">·</span>
          <RevealText text="Sécurité" base={2} step={0.03} />
        </div>
      </div>

      {/* « VI » (6 en chiffres romains), style hachuré, en haut à droite */}
      <span
        aria-hidden
        /*
          Masque sur mobile. Il partageait la bande du reacteur avec la citation, sur une
          largeur ou les trois ne tiennent pas. Un element absolu voit de toute facon son
          `display` calcule en `block` : `sm:block` ne change donc rien au rendu, il ne
          fait que defaire le `hidden`.
        */
        className="pointer-events-none absolute right-8 top-[32%] z-20 hidden -translate-y-1/2 select-none font-sans text-8xl font-bold leading-none tracking-tight sm:right-12 sm:block sm:text-[12rem] laptop:top-[42%]"
      >
        {["V", "I"].map((char, i) => (
          <span key={i} className="reveal-mask">
            <span
              className="reveal-inner bg-clip-text text-transparent"
              style={{
                animationDelay: `${quoteBaseDelay + i * 0.12}s`,
                backgroundImage:
                  "repeating-linear-gradient(45deg, #18181b 0, #18181b 1.5px, transparent 1.5px, transparent 7px)",
              }}
            >
              {char}
            </span>
          </span>
        ))}
      </span>

      {/* Citation, à gauche, centrée verticalement, animée lettre par lettre */}
      {/*
        MOBILE : la citation se pose SOUS le reacteur, plus au milieu de lui.

        La position est CALCULEE, pas devinee. Le visuel du reacteur est en 3:2 et rendu en
        `object-contain` : en portrait il est donc borne par la largeur, haut de 100vw/1,5
        = 66,66vw, et centre verticalement. Son bord bas tombe a `50dvh + 33,33vw`, quelle
        que soit la taille du telephone. La citation demarre 1rem plus bas.

        Pas de `-translate-y-1/2` sur mobile : ce calage donne le bord HAUT du bloc, il ne
        faut donc pas le recentrer sur lui-meme.

        `sm:laptop:` et non `laptop:` : la variante `laptop` est une hauteur d'ecran
        (max-height 900px), que la plupart des telephones satisfont — elle ecrasait le
        placement mobile. La restreindre a `sm:` lui rend son sens, « large ET court ».

        Le raisonnement ne vaut qu'en portrait, seul cas ou l'image est bornee par la
        largeur ; au-dela de 640px de large, les regles d'origine reprennent la main.
      */}
      <figure className="pointer-events-none absolute left-8 top-[calc(50dvh_+_33.33vw_+_1rem)] z-20 max-w-xs sm:left-12 sm:top-[32%] sm:max-w-sm sm:-translate-y-1/2 sm:laptop:top-[42%]">
        <span
          aria-hidden
          className="animate-fade-in block font-sans text-5xl font-bold leading-none text-zinc-900"
          style={{ animationDelay: `${quoteBaseDelay - 0.2}s` }}
        >
          “
        </span>
        <blockquote
          aria-label={quote}
          className="mt-1 font-sans text-xl font-bold uppercase leading-snug tracking-tight text-zinc-900 sm:text-2xl"
        >
          {quote.split(" ").map((word, wi, words) => (
            <span
              key={wi}
              className={`inline-block whitespace-nowrap${
                wi < words.length - 1 ? " mr-[0.25em]" : ""
              }`}
            >
              {[...word].map((char, ci) => {
                letterIndex += 1;
                return (
                  <span key={ci} aria-hidden className="reveal-mask">
                    <span
                      className="reveal-inner"
                      style={{
                        animationDelay: `${quoteBaseDelay + letterIndex * quoteStep}s`,
                      }}
                    >
                      {char}
                    </span>
                  </span>
                );
              })}
            </span>
          ))}
        </blockquote>
        <figcaption
          className="animate-fade-in mt-4 text-sm font-normal text-zinc-500"
          style={{ animationDelay: `${captionDelay}s` }}
        >
          T.S.
        </figcaption>
      </figure>

      {/* Titre de marque, en bas de page, fondu à l'arrivée */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center px-2 pb-8 sm:pb-12 laptop:pb-6">
        <h1 className="animate-fade-in whitespace-nowrap font-sans text-center text-[10vw] font-bold uppercase leading-none tracking-tight text-zinc-900 laptop:text-[8vw]">
          Jarvis Connect
        </h1>
      </div>
    </section>
  );
}
