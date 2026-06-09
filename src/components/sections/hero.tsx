"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { JarvisHeroBackdrop } from "@/components/sections/jarvis-hero-backdrop";
import { useLaunchContext } from "@/components/launch-context";

interface HeroProps {
  title?: string;
  highlightText?: string;
  description?: string;
  buttonText?: string;
  onButtonClick?: () => void;
  buttonHref?: string;
  showScrollIcon?: boolean;
  scrollText?: string;
  scrollIconLabel?: string;
  scrollTargetId?: string;
  colors?: string[];
  distortion?: number;
  swirl?: number;
  speed?: number;
  offsetX?: number;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  buttonClassName?: string;
  maxWidth?: string;
  veilOpacity?: string;
  fontFamily?: string;
  fontWeight?: number;
  cinematicBackground?: boolean;
}

export function Hero(props: HeroProps) {
  const {
    title = "Jarvis propulse vos projets",
    highlightText = "IT & digital",
    description = "Support, developpement applicatif et securite reunis dans une equipe senior qui intervient vite et bien.",
    buttonText = "Nous contacter",
    buttonHref,
    onButtonClick,
    showScrollIcon = false,
    scrollText = "Decouvrir notre expertise",
    scrollIconLabel = "Scroll",
    scrollTargetId,
    className = "",
    titleClassName = "",
    descriptionClassName = "",
    buttonClassName = "",
    maxWidth = "max-w-4xl",
    veilOpacity = "",
    fontFamily,
    fontWeight,
    cinematicBackground = false,
  } = props;

  const resolvedButtonText = showScrollIcon ? undefined : buttonText;
  const resolvedButtonHref = showScrollIcon ? undefined : buttonHref;
  const { introActive, introTransitioning } = useLaunchContext();
  const typographyStyle =
    fontFamily || fontWeight
      ? { fontFamily, fontWeight }
      : undefined;

  const handleScrollClick = () => {
    if (!scrollTargetId) return;
    const target = document.getElementById(scrollTargetId);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.pushState(null, "", `#${scrollTargetId}`);
    }
  };

  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      {cinematicBackground ? (
        <JarvisHeroBackdrop transitionActive={introTransitioning} />
      ) : (
        <>
          <Image
            className="absolute inset-0 h-full w-full object-cover"
            src="https://i.pinimg.com/1200x/4b/b3/33/4bb333a0a54c0f5b7dae507119527a30.jpg"
            alt=""
            aria-hidden="true"
            fill
            sizes="100vw"
            unoptimized
          />
          {veilOpacity && (
            <div className={`absolute inset-0 ${veilOpacity}`} aria-hidden />
          )}
        </>
      )}

      <div className="relative mx-auto flex min-h-screen w-full items-center px-6">
        <motion.div
          className={`mx-auto w-full ${maxWidth} text-center ${cinematicBackground ? "jarvis-hero-copy" : ""}`}
          style={typographyStyle}
          initial={
            cinematicBackground
              ? { opacity: introActive ? 0 : 0, y: introActive ? 28 : 24, filter: "blur(14px)" }
              : false
          }
          animate={
            cinematicBackground
              ? introActive
                ? introTransitioning
                  ? { opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }
                  : { opacity: 0, y: 18, filter: "blur(12px)", scale: 0.99 }
                : { opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }
              : undefined
          }
          transition={{ duration: 1.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className={cinematicBackground ? "jarvis-hero-eyebrow" : "sr-only"}>
            Jarvis Connect
          </div>

          <h1
            className={`text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl ${titleClassName} ${cinematicBackground ? "jarvis-hero-title" : ""}`}
          >
            {title}
            {highlightText ? (
              <span className="opacity-90"> {highlightText}</span>
            ) : null}
          </h1>

          {description ? (
            <p
              className={`mt-6 text-base sm:text-lg ${descriptionClassName} ${cinematicBackground ? "jarvis-hero-description" : ""}`}
            >
              {description}
            </p>
          ) : null}

          <div className="mt-8 flex flex-col items-center gap-4">
            {resolvedButtonText ? (
              resolvedButtonHref ? (
                <a
                  href={resolvedButtonHref}
                  className={`rounded-full border border-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] transition hover:border-white/40 ${buttonClassName}`}
                >
                  {resolvedButtonText}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={onButtonClick}
                  className={`rounded-full border border-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] transition hover:border-white/40 ${buttonClassName}`}
                >
                  {resolvedButtonText}
                </button>
              )
            ) : null}

            {showScrollIcon ? (
              <button
                type="button"
                onClick={handleScrollClick}
                className="flex flex-col items-center gap-2 text-sm"
                aria-label={scrollIconLabel}
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/30 animate-bounce">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 5v14" />
                    <path d="m19 12-7 7-7-7" />
                  </svg>
                </span>
                {scrollText ? (
                  <span className="cursor-pointer">{scrollText}</span>
                ) : null}
              </button>
            ) : null}
          </div>
        </motion.div>
      </div>

      {cinematicBackground ? (
        <style>{`
          .jarvis-hero-copy {
            max-width: 900px;
            color: #f2fbff;
            text-shadow: 0 0 30px rgba(70, 214, 255, 0.12);
          }

          .jarvis-hero-eyebrow {
            margin-bottom: 1rem;
            font-family: "Chakra Petch", "Inter", system-ui, sans-serif;
            font-size: clamp(0.74rem, 1.1vw, 0.88rem);
            font-weight: 700;
            letter-spacing: 0.42em;
            text-transform: uppercase;
            color: #46d6ff;
            opacity: 0.95;
          }

          .jarvis-hero-title {
            font-family: "Chakra Petch", "Inter", system-ui, sans-serif;
            text-transform: none;
            line-height: 0.98;
            letter-spacing: -0.02em;
            text-shadow: 0 0 36px rgba(70, 214, 255, 0.22);
          }

          .jarvis-hero-title span {
            color: transparent;
            -webkit-text-stroke: 1.35px rgba(159, 239, 255, 0.92);
          }

          .jarvis-hero-description {
            max-width: 760px;
            margin-left: auto;
            margin-right: auto;
            color: rgba(210, 231, 245, 0.9);
          }

          @media (max-width: 640px) {
            .jarvis-hero-copy {
              max-width: 100%;
            }

            .jarvis-hero-eyebrow {
              letter-spacing: 0.26em;
            }
          }
        `}</style>
      ) : null}
    </div>
  );
}
