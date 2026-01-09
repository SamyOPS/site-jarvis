"use client";

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
    buttonHref,
    onButtonClick,
    showScrollIcon = false,
    scrollText = "Decouvrir notre expertise",
    scrollIconLabel = "Scroll",
    className = "",
    titleClassName = "",
    descriptionClassName = "",
    buttonClassName = "",
    maxWidth = "max-w-4xl",
    veilOpacity = "",
    fontFamily,
    fontWeight,
  } = props;

  const resolvedButtonText = showScrollIcon ? undefined : buttonText;
  const resolvedButtonHref = showScrollIcon ? undefined : buttonHref;
  const typographyStyle =
    fontFamily || fontWeight
      ? { fontFamily, fontWeight }
      : undefined;

  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D)",
        }}
        aria-hidden
      />
      <div className={`absolute inset-0 ${veilOpacity}`} aria-hidden />
      <div className="relative mx-auto flex min-h-screen w-full items-center px-6">
        <div className={`mx-auto w-full ${maxWidth} text-center`} style={typographyStyle}>
          <h1
            className={`text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl hero-text-reveal ${titleClassName}`}
          >
            {title}
            {highlightText ? <span className="opacity-90"> {highlightText}</span> : null}
          </h1>

          {description ? (
            <p
              className={`mt-6 text-base sm:text-lg hero-text-reveal ${descriptionClassName}`}
              style={{ animationDelay: "120ms" }}
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
              <div className="flex flex-col items-center gap-2 text-sm">
                <span
                  aria-label={scrollIconLabel}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/30 animate-bounce"
                >
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
                {scrollText ? <span>{scrollText}</span> : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
