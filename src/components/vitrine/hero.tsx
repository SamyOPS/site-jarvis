"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { PILL_PRIMARY, TEXT_LINK, TRACE } from "@/components/auth/auth-styles";
import { CLIENT_LOGOS } from "@/features/vitrine/client-logos";

/**
 * Hero de l'accueil, mise en page editoriale :
 *  - a gauche, les mots-cles, le titre, une phrase sur ce que fait Jarvis Connect et deux
 *    appels a l'action — texte fixe, sans animation d'apparition ;
 *  - a droite, le reacteur (video d'allumage, puis image du reacteur allume) ;
 *  - en bas, une bande de logos clients qui defile en continu.
 *
 * Il etait compose d'elements epars autour du reacteur (accroche, citation, « VI », nom de
 * marque en bas) et ne disait ni quoi faire ni pour qui : il paraissait vide.
 *
 * LE REACTEUR EST CADRE EN CARRE (`object-cover`). La video et l'image sont toutes deux en
 * 3:2, reacteur centre sur 42 % de la largeur : rognees a l'identique, le passage de l'une
 * a l'autre reste invisible. Et ce cadrage ecarte le filigrane « KlingAI » incruste dans
 * le coin bas-droit de la video (a partir de 85 % de la largeur), qui sort du carre.
 */
export default function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ignited, setIgnited] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  // Bascule sur l'image du réacteur allumé pour simuler un allumage constant.
  const ignite = () => setIgnited(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Mouvement réduit : réacteur allumé d'emblée. Sinon, filet de sécurité au cas où la
    // vidéo ne se charge pas (lecture automatique bloquée, erreur réseau…).
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(ignite, reduceMotion ? 0 : 12000);
    return () => window.clearTimeout(timer);
  }, []);

  // Le réacteur s'incline légèrement en suivant le curseur (3D).
  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const { innerWidth, innerHeight } = window;
    setTilt({ x: (e.clientX / innerWidth - 0.5) * 2, y: (e.clientY / innerHeight - 0.5) * 2 });
  };
  const resetTilt = () => setTilt({ x: 0, y: 0 });

  return (
    <section
      onMouseMove={handleMouseMove}
      onMouseLeave={resetTilt}
      className="relative flex min-h-dvh w-full flex-col overflow-hidden bg-white text-zinc-900"
    >
      {/*
        `pt-28 sm:pt-36` : la barre du haut est fixe et ne reserve aucune place. Sur un
        ecran peu haut (`laptop:`, 900 px et moins), marge et titre se resserrent pour que
        la bande de logos reste dans le premier ecran.
      */}
      <div className="grid w-full flex-1 items-center gap-10 px-6 pb-10 pt-28 sm:px-12 sm:pt-36 sm:laptop:pt-28 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16 lg:pb-12">
        {/* Texte */}
        <div className="flex min-w-0 flex-col items-start">
          {/* Resserree sur mobile pour tenir sur une ligne. */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 sm:gap-x-3 sm:text-sm sm:tracking-[0.25em]">
            <span>Support</span>
            <span className="text-zinc-300">·</span>
            <span>Développement</span>
            <span className="text-zinc-300">·</span>
            <span>Sécurité</span>
          </div>

          <h1 className="mt-6 text-[clamp(2.75rem,6vw,6rem)] font-bold uppercase leading-[0.92] tracking-tight sm:laptop:text-[clamp(2.5rem,5.2vw,5rem)]">
            Propulsez vos projets IT &amp; digital.
          </h1>

          <p className="mt-6 max-w-xl font-quote text-xl leading-snug text-zinc-500 sm:text-2xl">
            Support informatique, développement, cybersécurité et infogérance : une ESN engagée aux
            côtés de vos équipes, au quotidien.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <a href="#expertises" className={PILL_PRIMARY}>
              Nos expertises
            </a>
            <a href="#contact" className={TEXT_LINK}>
              <span>Nous contacter</span>
              <ArrowRight
                aria-hidden
                className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none"
              />
              <span aria-hidden className={TRACE} />
            </a>
          </div>
        </div>

        {/*
          Réacteur, cadré en carré (voir plus haut), incliné au curseur.
          - Bords fondus en cercle : le fond de la vidéo et de l'image n'est pas d'un blanc
            pur (≈ #f8f8f8) et dessinait un carré gris pâle. Le réacteur, qui tient dans
            63 % du carré, reste entièrement dans la zone nette (70 % du rayon).
          - Sur grand écran, le carré est borné par la HAUTEUR de l'écran (moins la barre,
            les marges et la bande de logos) : sur un portable 1366×768, il poussait la
            bande de logos hors du premier écran.
        */}
        <div
          className="relative mx-auto aspect-square w-full max-w-sm transition-transform duration-300 ease-out [mask-image:radial-gradient(closest-side,black_70%,transparent)] sm:max-w-md lg:max-w-[min(100%,calc(100dvh-18rem))]"
          style={{
            transform: `perspective(1200px) rotateY(${tilt.x * 4}deg) rotateX(${-tilt.y * 4}deg) translateX(${tilt.x * 8}px) translateY(${tilt.y * 8}px)`,
          }}
        >
          {/* Vidéo d'allumage, puis image du réacteur allumé qui prend le relais. */}
          <video
            ref={videoRef}
            className={`absolute inset-0 h-full w-full object-cover mix-blend-multiply transition-opacity duration-1000 ${
              ignited ? "opacity-0" : "opacity-100"
            }`}
            src="/Video/allumage_reacteur_v1.mp4"
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={ignite}
          />
          <div className={`absolute inset-0 transition-opacity duration-1000 ${ignited ? "opacity-100" : "opacity-0"}`}>
            <Image
              src="/Image/reacteur_ark_allume_de_fasse.png"
              alt="Réacteur Ark allumé"
              fill
              priority
              draggable={false}
              sizes="(min-width: 1024px) 45vw, (min-width: 640px) 28rem, 24rem"
              className="object-cover mix-blend-multiply"
            />
            {/*
              Halo lumineux qui respire au centre du réacteur. Centré par l'animation
              elle-même (`core-pulse` porte un translate(-50%, -50%)) : une classe de
              translation s'y ajouterait. Sans animation (mouvement réduit), la classe
              `motion-reduce:` reprend le centrage.
            */}
            <div
              aria-hidden
              className="animate-core pointer-events-none absolute left-1/2 top-1/2 h-[28%] w-[28%] rounded-full blur-2xl motion-reduce:-translate-x-1/2 motion-reduce:-translate-y-1/2"
              style={{
                background:
                  "radial-gradient(circle, rgba(220,240,255,0.95) 0%, rgba(150,210,255,0.55) 45%, rgba(255,255,255,0) 70%)",
              }}
            />
          </div>

          {/* Flash de bloom au moment exact de l'allumage (centré par son animation ;
              masqué en mouvement réduit, où il resterait affiché sans s'éteindre). */}
          {ignited && (
            <div
              aria-hidden
              className="animate-bloom pointer-events-none absolute left-1/2 top-1/2 h-[55%] w-[55%] rounded-full motion-reduce:hidden"
              style={{
                background:
                  "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(160,220,255,0.6) 40%, rgba(255,255,255,0) 70%)",
              }}
            />
          )}
        </div>
      </div>

      {/*
        Bande de logos clients : defilement continu, au temps. La liste est posee deux fois ;
        la seconde copie est masquee aux lecteurs d'ecran. Bords fondus par un masque.

        C'est desormais le SEUL endroit ou figurent les clients (la section « Ils nous font
        confiance » plus bas dans la page a ete retiree). Son intitule s'affiche donc a cote
        de la bande sur grand ecran — sur la meme ligne, pour ne pas allonger le hero, qui
        tient tout juste dans un ecran.
      */}
      <div className="flex items-center border-t border-zinc-900/15 py-5 sm:py-6">
        {/* `font-quote` sans variante : c'est une classe de globals.css, pas un utilitaire
            Tailwind — `lg:font-quote` n'existerait pas. Masque sous `lg` de toute facon. */}
        <p className="sr-only font-quote text-xl italic text-zinc-500 lg:not-sr-only lg:shrink-0 lg:pl-12 lg:pr-8">
          Ils nous font confiance
        </p>
        <div className="min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <div className="animate-marquee flex w-max items-center gap-14 sm:gap-20">
            {[...CLIENT_LOGOS, ...CLIENT_LOGOS].map((logo, index) => (
              <Image
                key={index}
                src={logo.src}
                alt={index < CLIENT_LOGOS.length ? logo.alt : ""}
                aria-hidden={index >= CLIENT_LOGOS.length || undefined}
                width={logo.w}
                height={logo.h}
                sizes="120px"
                draggable={false}
                className={`w-auto max-w-[120px] object-contain opacity-70 ${logo.big ? "h-9 sm:h-11" : "h-6 sm:h-8"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
