"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { useLaunchContext } from "@/components/launch-context";

interface JarvisHeroBackdropProps {
  transitionActive?: boolean;
}

export function JarvisHeroBackdrop({ transitionActive = false }: JarvisHeroBackdropProps) {
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const { introActive, introTransitioning } = useLaunchContext();
  const isTransitioning = transitionActive || introTransitioning;

  useEffect(() => {
    if (introActive) return;

    const node = backdropRef.current;
    if (!node) return;

    let frame = 0;
    const onMove = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

      cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        node.style.setProperty("--jarvis-mx", `${x.toFixed(4)}`);
        node.style.setProperty("--jarvis-my", `${y.toFixed(4)}`);
      });
    };

    node.addEventListener("pointermove", onMove);
    return () => {
      node.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, [introActive]);

  return (
    <div
      ref={backdropRef}
      aria-hidden="true"
      className={[
        "pointer-events-none absolute inset-0 overflow-hidden",
        "bg-[#071225]",
        isTransitioning ? "jarvis-bg--transitioning" : "",
      ].join(" ")}
    >
      <div className="jarvis-bg-grid" />
      <div className="jarvis-bg-halo" />
      <div className={`jarvis-bg-scene ${isTransitioning ? "jarvis-bg-scene--transition" : ""}`}>
        <div className="jarvis-bg-ring jarvis-bg-ring--outer" />
        <div className="jarvis-bg-ring jarvis-bg-ring--inner" />
        <div className="jarvis-bg-ring jarvis-bg-ring--core" />
        <div className="jarvis-bg-pulse" />
        <div className="jarvis-bg-core" />
        <div className="jarvis-bg-logoWrap">
          <Image
            src="/logo jarvis.png"
            alt=""
            width={1200}
            height={1200}
            className="jarvis-bg-logo"
            priority
          />
        </div>
      </div>

      <div className="jarvis-bg-light jarvis-bg-light--left" />
      <div className="jarvis-bg-light jarvis-bg-light--right" />
      <div className="jarvis-bg-lift" />

      <style>{`
        .jarvis-bg-lift {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 50% 44%, rgba(124, 224, 255, 0.12), transparent 46%),
            linear-gradient(180deg, rgba(12, 34, 68, 0.58), rgba(7, 18, 37, 0.2) 52%, rgba(7, 18, 37, 0.62));
          opacity: 0.44;
        }

        .jarvis-bg-grid {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(124, 224, 255, 0.13) 1px, transparent 1.4px);
          background-size: 36px 36px;
          opacity: 0.28;
          transform: translateZ(0);
        }

        .jarvis-bg-halo {
          position: absolute;
          left: 50%;
          top: 40%;
          width: min(86vmin, 860px);
          height: min(86vmin, 860px);
          transform: translate(-50%, -50%) scale(calc(1 + var(--jarvis-my, 0) * 0.015));
          border-radius: 50%;
          background: radial-gradient(circle, rgba(124, 224, 255, 0.24) 0%, rgba(70, 214, 255, 0.1) 36%, rgba(7, 18, 37, 0) 68%);
          opacity: 0.82;
        }

        .jarvis-bg-scene {
          position: absolute;
          left: 50%;
          top: 42%;
          width: min(78vmin, 720px);
          height: min(78vmin, 720px);
          transform:
            translate(-50%, -50%)
            rotateX(calc(var(--jarvis-my, 0) * 6deg))
            rotateY(calc(var(--jarvis-mx, 0) * -8deg))
            scale(1.02);
          transform-style: preserve-3d;
          opacity: 0.34;
          transition: transform 900ms cubic-bezier(0.22, 1, 0.36, 1), opacity 900ms ease, filter 900ms ease;
        }

        .jarvis-bg-scene--transition {
          opacity: 0.44;
          transform:
            translate(-50%, -50%)
            rotateX(calc(var(--jarvis-my, 0) * 8deg))
            rotateY(calc(var(--jarvis-mx, 0) * -10deg))
            scale(1.06);
        }

        .jarvis-bg-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 1px solid rgba(95, 208, 255, 0.28);
          box-shadow: inset 0 0 28px rgba(70, 214, 255, 0.08);
        }

        .jarvis-bg-ring--outer {
          inset: 0;
          border-width: 24px;
          border-color: rgba(55, 72, 90, 0.95);
        }

        .jarvis-bg-ring--inner {
          inset: 18px;
          border-width: 6px;
          border-color: rgba(34, 48, 63, 0.95);
        }

        .jarvis-bg-ring--core {
          inset: 90px;
          border-style: dotted;
          border-width: 10px;
          border-color: rgba(207, 232, 245, 0.8);
          animation: jarvis-ring-rotate 36s linear infinite;
        }

        .jarvis-bg-pulse {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 34%;
          height: 34%;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.95) 0%, rgba(191, 243, 255, 0.6) 28%, rgba(70, 214, 255, 0.15) 52%, transparent 72%);
          opacity: 0.78;
          animation: jarvis-pulse 5.2s ease-in-out infinite;
        }

        .jarvis-bg-core {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 16%;
          height: 16%;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: radial-gradient(circle, #fff 0%, #bff3ff 40%, rgba(70, 214, 255, 0.45) 72%, rgba(70, 214, 255, 0) 80%);
          animation: jarvis-core-glow 3.2s ease-in-out infinite;
        }

        .jarvis-bg-logoWrap {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
        }

        .jarvis-bg-logo {
          width: min(40vmin, 360px);
          height: auto;
          object-fit: contain;
          opacity: 0.9;
          animation: jarvis-logo-spin 54s linear infinite;
        }

        .jarvis-bg-light {
          position: absolute;
          inset: auto;
          width: 42vw;
          height: 42vw;
          max-width: 620px;
          max-height: 620px;
          border-radius: 50%;
          opacity: 0.32;
          transform: translate3d(0, 0, 0);
        }

        .jarvis-bg-light--left {
          left: -10vw;
          top: 18vh;
          background: radial-gradient(circle, rgba(42, 160, 221, 0.3) 0%, rgba(42, 160, 221, 0) 70%);
          animation: jarvis-drift-left 16s ease-in-out infinite;
        }

        .jarvis-bg-light--right {
          right: -12vw;
          bottom: 10vh;
          background: radial-gradient(circle, rgba(124, 224, 255, 0.18) 0%, rgba(124, 224, 255, 0) 70%);
          animation: jarvis-drift-right 19s ease-in-out infinite;
        }

        .jarvis-bg--transitioning .jarvis-bg-grid,
        .jarvis-bg--transitioning .jarvis-bg-halo,
        .jarvis-bg--transitioning .jarvis-bg-ring--core,
        .jarvis-bg--transitioning .jarvis-bg-pulse,
        .jarvis-bg--transitioning .jarvis-bg-core,
        .jarvis-bg--transitioning .jarvis-bg-logo,
        .jarvis-bg--transitioning .jarvis-bg-light {
          animation: none !important;
        }

        @keyframes jarvis-grid-drift {
          0% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(0, -10px, 0);
          }
          100% {
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes jarvis-halo-breathe {
          0%,
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.9;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.04);
            opacity: 1;
          }
        }

        @keyframes jarvis-ring-rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes jarvis-pulse {
          0%,
          100% {
            transform: translate(-50%, -50%) scale(0.98);
            opacity: 0.55;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.06);
            opacity: 0.82;
          }
        }

        @keyframes jarvis-core-glow {
          0%,
          100% {
            opacity: 0.7;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes jarvis-logo-float {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-8px) scale(1.01);
          }
        }

        @keyframes jarvis-logo-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes jarvis-drift-left {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-18px) scale(1.06);
          }
        }

        @keyframes jarvis-drift-right {
          0%,
          100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(16px) scale(1.05);
          }
        }

        @media (max-width: 900px) {
          .jarvis-bg-scene {
            top: 44%;
            opacity: 0.22;
          }

          .jarvis-bg-logo {
            width: min(52vmin, 300px);
          }
        }

        @media (max-width: 640px) {
          .jarvis-bg-ring--outer {
            border-width: 18px;
          }

          .jarvis-bg-ring--core {
            inset: 72px;
          }

          .jarvis-bg-logo {
            width: min(64vmin, 250px);
          }

          .jarvis-bg-light {
            width: 58vw;
            height: 58vw;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .jarvis-bg-grid,
          .jarvis-bg-halo,
          .jarvis-bg-scene,
          .jarvis-bg-ring--core,
          .jarvis-bg-pulse,
          .jarvis-bg-core,
          .jarvis-bg-logo,
          .jarvis-bg-light {
            animation: none !important;
            transition: none !important;
          }

          .jarvis-bg-scene {
            opacity: 0.24;
            filter: none;
          }
        }
      `}</style>
    </div>
  );
}
