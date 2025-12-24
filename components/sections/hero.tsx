"use client"

import { MeshGradient } from "@paper-design/shaders-react"
import { ArrowDown } from "lucide-react"
import { useEffect, useRef, useState } from "react"

interface HeroProps {
  title?: string
  highlightText?: string
  description?: string
  buttonText?: string
  onButtonClick?: () => void
  buttonHref?: string
  showScrollIcon?: boolean
  scrollText?: string
  scrollIconLabel?: string
  colors?: string[]
  distortion?: number
  swirl?: number
  speed?: number
  offsetX?: number
  className?: string
  titleClassName?: string
  descriptionClassName?: string
  buttonClassName?: string
  maxWidth?: string
  veilOpacity?: string
  fontFamily?: string
  fontWeight?: number
}

export function Hero({
  title = "Intelligent AI Agents for",
  highlightText = "Smart Brands",
  description = "Transform your brand and evolve it through AI-driven brand guidelines and always up-to-date core components.",
  buttonText = "Join Waitlist",
  onButtonClick,
  colors = ["#72b9bb", "#b5d9d9", "#ffd1bd", "#ffebe0", "#8cc5b8", "#dbf4a4"],
  distortion = 0.8,
  swirl = 0.6,
  speed = 0.42,
  offsetX = 0.08,
  className = "",
  titleClassName = "",
  descriptionClassName = "",
  buttonClassName = "",
  showScrollIcon = false,
  scrollText = "Decouvrir notre expertise",
  scrollIconLabel = "Scroll",
  maxWidth = "max-w-6xl",
  veilOpacity = "bg-white/20 dark:bg-black/25",
  fontFamily = "Satoshi, sans-serif",
  fontWeight = 500,
  buttonHref,
}: HeroProps) {
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 })
  const [mounted, setMounted] = useState(false)
  const sectionRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    setMounted(true)
    const update = () => {
      const el = sectionRef.current
      if (el) {
        const rect = el.getBoundingClientRect()
        setDimensions({
          width: rect.width || window.innerWidth,
          height: rect.height || window.innerHeight,
        })
      }
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  const handleButtonClick = () => {
    if (onButtonClick) {
      onButtonClick()
    }
  }

  return (
    <section ref={sectionRef} className={`relative w-full min-h-screen overflow-hidden bg-background flex items-center justify-center ${className}`}>
      <div className="absolute inset-0 w-full h-full">
        {mounted && (
          <>
            <MeshGradient
              width={dimensions.width}
              height={dimensions.height}
              colors={colors}
              distortion={distortion}
              swirl={swirl}
              grainMixer={0}
              grainOverlay={0}
              speed={speed}
              offsetX={offsetX}
            />
            <div className={`absolute inset-0 pointer-events-none ${veilOpacity}`} />
          </>
        )}
      </div>
      
      <div className={`relative z-10 ${maxWidth} mx-auto px-6 w-full`}>
        <div className="text-center">
          <h1
            className={`font-bold text-foreground text-balance text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl leading-[1.1] sm:leading-[1.1] md:leading-[1.1] lg:leading-[1.05] xl:leading-[1.05] mb-6 ${titleClassName}`}
            style={{ fontFamily, fontWeight }}
          >
            {title} <span className="text-primary">{highlightText}</span>
          </h1>
          <p className={`text-base sm:text-lg text-white text-pretty max-w-2xl mx-auto leading-relaxed mb-8 px-4 ${descriptionClassName}`}>
            {description}
          </p>
          {showScrollIcon ? (
            <div className="flex flex-col items-center gap-3">
              <span
                aria-label={scrollIconLabel}
                className={`inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white animate-bounce ${buttonClassName}`}
              >
                <ArrowDown className="h-4 w-4" aria-hidden />
              </span>
              {scrollText && <p className="text-sm text-white/80">{scrollText}</p>}
            </div>
          ) : buttonHref ? (
            <a
              href={buttonHref}
              className={`inline-flex items-center justify-center px-6 py-4 sm:px-8 sm:py-6 rounded-full border-4 bg-[rgba(63,63,63,1)] border-card text-sm sm:text-base text-white hover:bg-[rgba(63,63,63,0.9)] transition-colors ${buttonClassName}`}
            >
              {buttonText}
            </a>
          ) : (
            <button
              onClick={handleButtonClick}
              className={`px-6 py-4 sm:px-8 sm:py-6 rounded-full border-4 bg-[rgba(63,63,63,1)] border-card text-sm sm:text-base text-white hover:bg-[rgba(63,63,63,0.9)] transition-colors ${buttonClassName}`}
            >
              {buttonText}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
