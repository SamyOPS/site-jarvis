"use client";

import { ArrowDown } from "lucide-react";

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
}

export function Hero(props: HeroProps) {
  const {
    title = "Jarvis propulse vos projets",
    highlightText = "IT & digital",
    description = "Support, developpement applicatif et securite reunis dans une equipe senior qui intervient vite et bien.",
    buttonText = "Nous contacter",
    onButtonClick,
    buttonHref,
    showScrollIcon = false,
    scrollText = "Decouvrir notre expertise",
    scrollIconLabel = "Scroll",
    className = "",
    titleClassName = "",
    descriptionClassName = "",
    buttonClassName = "",
    maxWidth = "max-w-6xl",
    fontFamily = "Satoshi, sans-serif",
    fontWeight = 600,
  } = props;

  const handleButtonClick = () => {
    if (onButtonClick) {
      onButtonClick();
    }
  };

  return (
    <section
      className={`relative flex min-h-screen w-full items-center justify-center bg-blue-700 px-6 py-24 text-white ${className}`}
    >
      <div className={`relative z-10 mx-auto w-full ${maxWidth}`}>
        <div className="space-y-6 text-center">
          <h1
            className={`text-balance text-3xl font-bold leading-tight sm:text-4xl md:text-5xl lg:text-6xl ${titleClassName}`}
            style={{ fontFamily, fontWeight }}
          >
            {title}{" "}
            {highlightText && <span className="text-blue-100">{highlightText}</span>}
          </h1>
          <p
            className={`mx-auto max-w-3xl text-base text-white/90 sm:text-lg md:text-xl ${descriptionClassName}`}
          >
            {description}
          </p>
          {showScrollIcon ? (
            <div className="flex flex-col items-center gap-3">
              <span
                aria-label={scrollIconLabel}
                className={`inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white ${buttonClassName}`}
              >
                <ArrowDown className="h-4 w-4" aria-hidden />
              </span>
              {scrollText && <p className="text-sm text-white/80">{scrollText}</p>}
            </div>
          ) : buttonHref ? (
            <a
              href={buttonHref}
              className={`inline-flex items-center justify-center rounded-full border border-white/60 bg-white px-6 py-3 text-sm font-semibold text-blue-800 transition-colors hover:bg-blue-100 sm:px-8 sm:py-4 sm:text-base ${buttonClassName}`}
            >
              {buttonText}
            </a>
          ) : (
            <button
              onClick={handleButtonClick}
              className={`rounded-full border border-white/60 bg-white px-6 py-3 text-sm font-semibold text-blue-800 transition-colors hover:bg-blue-100 sm:px-8 sm:py-4 sm:text-base ${buttonClassName}`}
            >
              {buttonText}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
