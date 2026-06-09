"use client";

import Image from "next/image";
import { useEffect } from "react";

const COMPLETION_DELAY_MS = 8000;

interface JarvisIntroV2Props {
  onComplete: () => void;
}

export function JarvisIntroV2({ onComplete }: JarvisIntroV2Props) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      onComplete();
    }, COMPLETION_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <section className="jarvis-intro-v2" aria-label="Intro Jarvis Connect">
      <div className="grid" />
      <div className="halo" />

      <div className="scene" aria-hidden="true">
        <div className="ring ring-1" />
        <div className="ring ring-2" />
        <div className="ring ring-3" />
        <div className="ring ring-4" />
        <div className="flash" />
        <div className="core" />
        <div className="logo-wrap">
          <Image src="/logo jarvis.png" alt="" className="logo" width={720} height={720} priority />
        </div>
      </div>

      <div className="copy">
        <div className="brand">Jarvis Connect</div>
        <h1>
          Jarvis Connect propulse vos projets{" "}
          <span>IT &amp; digital</span>
        </h1>
        <p>
          Support, développement applicatif et sécurité réunis au sein d&apos;une équipe
          senior qui intervient vite et bien pour vos utilisateurs.
        </p>
      </div>

      <style>{`
        .jarvis-intro-v2 {
          position: fixed;
          inset: 0;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6vh 6vw;
          text-align: center;
          background:
            radial-gradient(125% 125% at 55% 40%, #0c2244 0%, #081325 52%, #03060d 100%);
          color: #eaf6ff;
          z-index: 250;
          pointer-events: none;
          isolation: isolate;
        }

        .grid {
          position: absolute;
          inset: 0;
          z-index: 0;
          background-image: radial-gradient(rgba(70, 214, 255, 0.1) 1px, transparent 1.4px);
          background-size: 36px 36px;
          mask-image: radial-gradient(circle at 50% 48%, #000 26%, transparent 72%);
          opacity: 0.45;
        }

        .halo {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 70vmin;
          height: 70vmin;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: radial-gradient(circle, rgba(70, 214, 255, 0.3) 0%, rgba(70, 214, 255, 0.07) 40%, transparent 66%);
          opacity: 0;
          z-index: 1;
          animation: jarvis-fade 1.2s ease 1.5s forwards, jarvis-breathe 5s ease-in-out 3s infinite;
        }

        .scene {
          position: absolute;
          left: 50%;
          top: 50%;
          width: min(74vmin, 640px);
          height: min(74vmin, 640px);
          transform: translate(-50%, -50%);
          z-index: 2;
          perspective: 1400px;
          animation: jarvis-recede 1s cubic-bezier(0.4, 0, 0.2, 1) 2.9s forwards;
        }

        .ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          opacity: 0;
          transform-style: preserve-3d;
          filter: drop-shadow(0 0 8px rgba(70, 214, 255, 0.35));
          backface-visibility: hidden;
        }

        .ring-1 {
          border: 24px solid #37485a;
          box-shadow: inset 0 0 0 3px rgba(95, 208, 255, 0.5);
          animation: jarvis-ring-in 0.55s ease-out 0.05s forwards, jarvis-part-out 0.4s ease 1.5s forwards;
        }

        .ring-2 {
          inset: 20px;
          border: 6px solid #22303f;
          animation: jarvis-ring-in 0.55s ease-out 0.3s forwards, jarvis-part-out 0.4s ease 1.5s forwards;
        }

        .ring-3 {
          inset: 56px;
          border: 9px dotted rgba(207, 232, 245, 0.8);
          animation: jarvis-ring-in 0.55s ease-out 0.55s forwards, jarvis-part-out 0.4s ease 1.5s forwards;
        }

        .ring-4 {
          inset: 120px;
          border: 3px solid rgba(70, 214, 255, 0.7);
          box-shadow: 0 0 28px rgba(70, 214, 255, 0.22);
          animation: jarvis-ring-in 0.55s ease-out 0.8s forwards, jarvis-part-out 0.4s ease 1.5s forwards;
        }

        .logo-wrap {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          opacity: 0;
          animation: jarvis-fade 0.55s ease 1.5s forwards;
        }

        .logo {
          width: min(44vmin, 360px);
          height: auto;
          object-fit: contain;
          filter: drop-shadow(0 0 14px rgba(70, 214, 255, 0.5));
          transform: translateZ(0);
          animation: jarvis-float 2s ease-in-out infinite, jarvis-logo-bloom 0.8s ease 1.5s forwards;
        }

        .flash {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 34%;
          height: 34%;
          transform: translate(-50%, -50%) scale(0.2);
          border-radius: 50%;
          opacity: 0;
          z-index: 3;
          background: radial-gradient(circle, #fff 0%, rgba(159, 239, 255, 0.6) 45%, transparent 70%);
          filter: blur(8px);
          animation: jarvis-flash 0.9s ease-out 1.5s forwards;
        }

        .core {
          position: absolute;
          left: 50%;
          top: 49.5%;
          width: 15%;
          height: 15%;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          z-index: 3;
          opacity: 0;
          background: radial-gradient(circle, #fff 0%, #bff3ff 45%, rgba(70, 214, 255, 0.4) 72%, transparent 80%);
          animation: jarvis-fade 0.5s ease 1.7s forwards, jarvis-core-pulse 2.6s ease-in-out 3s infinite;
        }

        .copy {
          position: relative;
          z-index: 4;
          max-width: 1080px;
        }

        .brand {
          margin-bottom: 1.3rem;
          font-family: "Chakra Petch", "Saira", system-ui, sans-serif;
          font-size: clamp(11px, 1.4vw, 15px);
          letter-spacing: 0.42em;
          text-transform: uppercase;
          color: #46d6ff;
          opacity: 0;
          animation: jarvis-fade 0.7s ease 2.9s forwards;
        }

        h1 {
          margin: 0;
          font-family: "Chakra Petch", "Saira", system-ui, sans-serif;
          font-size: clamp(2.4rem, 6.4vw, 5.4rem);
          font-weight: 700;
          line-height: 1;
          letter-spacing: -0.01em;
          text-shadow: 0 0 36px rgba(70, 214, 255, 0.3);
          opacity: 0;
          animation: jarvis-rise 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) 3.02s forwards;
        }

        h1 span {
          color: transparent;
          -webkit-text-stroke: 1.4px rgba(159, 239, 255, 0.9);
        }

        p {
          margin: 1.5rem auto 0;
          max-width: 700px;
          font-family: "Saira", system-ui, sans-serif;
          font-size: clamp(1rem, 1.7vw, 1.22rem);
          color: #c2dbf0;
          opacity: 0;
          animation: jarvis-fade 0.9s ease 3.4s forwards;
        }

        @keyframes jarvis-ring-in {
          from {
            opacity: 0;
            transform: translateZ(-180px) scale(0.86);
          }
          to {
            opacity: 1;
            transform: translateZ(0) scale(1);
          }
        }

        @keyframes jarvis-part-out {
          to {
            opacity: 0;
          }
        }

        @keyframes jarvis-logo-bloom {
          from {
            filter: drop-shadow(0 0 6px rgba(70, 214, 255, 0.35));
          }
          to {
            filter: drop-shadow(0 0 18px rgba(70, 214, 255, 0.58));
          }
        }

        @keyframes jarvis-flash {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.2);
          }
          25% {
            opacity: 0.95;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(3.4);
          }
        }

        @keyframes jarvis-fade {
          to {
            opacity: 1;
          }
        }

        @keyframes jarvis-rise {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }

        @keyframes jarvis-breathe {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes jarvis-core-pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.55;
          }
        }

        @keyframes jarvis-float {
          0%,
          100% {
            transform: translateY(0px) rotateX(0deg);
          }
          50% {
            transform: translateY(-6px) rotateX(4deg);
          }
        }

        @keyframes jarvis-recede {
          to {
            opacity: 0.22;
            transform: translate(-50%, -50%) scale(1.2);
          }
        }

        @media (max-width: 640px) {
          .copy {
            padding-inline: 1rem;
          }

          .logo {
            width: min(54vmin, 280px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .halo,
          .scene,
          .flash,
          .core,
          .logo-wrap,
          .brand,
          h1,
          p,
          .logo,
          .ring {
            animation: none !important;
          }

          .halo,
          .logo-wrap,
          .brand,
          h1,
          p,
          .core {
            opacity: 1 !important;
          }

          .scene {
            opacity: 0.22;
            transform: translate(-50%, -50%) scale(1.2);
          }
        }
      `}</style>
    </section>
  );
}
