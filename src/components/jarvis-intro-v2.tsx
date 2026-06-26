"use client";

import Image from "next/image";
import { memo, useEffect } from "react";

const COMPLETION_DELAY_MS = 1650;
const HOMEPAGE_REVEAL_DELAY_MS = 900;

interface JarvisIntroV2Props {
  onReveal: () => void;
  onComplete: () => void;
}

function JarvisIntroV2Component({ onComplete, onReveal }: JarvisIntroV2Props) {
  useEffect(() => {
    const revealTimer = window.setTimeout(onReveal, HOMEPAGE_REVEAL_DELAY_MS);
    const completeTimer = window.setTimeout(onComplete, COMPLETION_DELAY_MS);

    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(completeTimer);
    };
  }, [onComplete, onReveal]);

  return (
    <div className="jarvis-intro" aria-label="Intro Jarvis Connect" role="img">
      <div className="jarvis-intro__grid" />
      <div className="jarvis-intro__halo" />

      <div className="jarvis-intro__scene" aria-hidden="true">
        <div className="jarvis-intro__rig">
          <div className="jarvis-intro__part jarvis-intro__part--ring" />
          <div className="jarvis-intro__part jarvis-intro__part--coils" />
          <div className="jarvis-intro__part jarvis-intro__part--stator" />
          <div className="jarvis-intro__part jarvis-intro__part--lens" />

          <div className="jarvis-intro__logo">
            <Image
              src="/logo jarvis.png"
              alt=""
              width={900}
              height={900}
              priority
              className="jarvis-intro__logoImage"
            />
          </div>
        </div>

        <div className="jarvis-intro__flash" />
        <div className="jarvis-intro__core" />
      </div>

      <style>{`
        .jarvis-intro {
          position: relative;
          height: 100%;
          min-height: 100vh;
          overflow: hidden;
          background: radial-gradient(125% 125% at 55% 40%, #143b70 0%, #0b213f 52%, #071225 100%);
          contain: strict;
          transform: translateZ(0);
        }

        .jarvis-intro__grid {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(124, 224, 255, 0.14) 1px, transparent 1.4px);
          background-size: 42px 42px;
          opacity: 0.34;
        }

        .jarvis-intro__halo {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 72vmin;
          height: 72vmin;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(124, 224, 255, 0.28) 0%, rgba(70, 214, 255, 0.08) 42%, transparent 68%);
          opacity: 0;
          transform: translate3d(-50%, -50%, 0);
          animation: jarvis-intro-fade 0.45s ease 0.45s forwards;
        }

        .jarvis-intro__scene {
          position: absolute;
          left: 50%;
          top: 50%;
          width: min(74vmin, 640px);
          height: min(74vmin, 640px);
          perspective: 1400px;
          transform: translate3d(-50%, -50%, 0);
          animation: jarvis-intro-recede 0.45s cubic-bezier(0.22, 1, 0.36, 1) 0.95s forwards;
          will-change: transform, opacity;
        }

        .jarvis-intro__rig {
          position: absolute;
          inset: 0;
          transform-style: preserve-3d;
          transform: rotateX(-24deg) rotateY(-20deg);
          animation: jarvis-intro-flatten 0.3s cubic-bezier(0.22, 1, 0.36, 1) 0.45s forwards, jarvis-intro-spin 24s linear 0.95s infinite;
          will-change: transform;
        }

        .jarvis-intro__part {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          opacity: 0;
          will-change: transform, opacity;
        }

        .jarvis-intro__part--ring {
          border: 24px solid rgba(55, 72, 90, 0.95);
          box-shadow: inset 0 0 0 5px rgba(34, 48, 63, 0.95);
          animation: jarvis-intro-in-ring 0.26s ease-out 0.02s forwards, jarvis-intro-part-out 0.18s ease 0.45s forwards;
        }

        .jarvis-intro__part--coils {
          inset: 8%;
          border: 18px dashed rgba(95, 208, 255, 0.72);
          animation: jarvis-intro-in-coils 0.26s ease-out 0.1s forwards, jarvis-intro-part-out 0.18s ease 0.45s forwards;
        }

        .jarvis-intro__part--stator {
          inset: 24%;
          border: 10px dotted rgba(207, 232, 245, 0.88);
          background: rgba(12, 26, 40, 0.62);
          animation: jarvis-intro-in-stator 0.26s ease-out 0.18s forwards, jarvis-intro-part-out 0.18s ease 0.45s forwards;
        }

        .jarvis-intro__part--lens {
          inset: 38%;
          background: radial-gradient(circle, #fff 0%, #bff3ff 45%, #1f8fd6 100%);
          animation: jarvis-intro-in-lens 0.26s ease-out 0.26s forwards, jarvis-intro-part-out 0.18s ease 0.45s forwards;
        }

        .jarvis-intro__logo {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          opacity: 0;
          animation: jarvis-intro-logo-in 0.24s ease 0.45s forwards;
        }

        .jarvis-intro__logoImage {
          width: min(48vmin, 410px);
          height: auto;
          object-fit: contain;
        }

        .jarvis-intro__flash {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 34%;
          height: 34%;
          border-radius: 50%;
          background: radial-gradient(circle, #fff 0%, rgba(159, 239, 255, 0.68) 45%, transparent 70%);
          opacity: 0;
          transform: translate3d(-50%, -50%, 0) scale(0.2);
          animation: jarvis-intro-flash 0.4s ease-out 0.45s forwards;
        }

        .jarvis-intro__core {
          position: absolute;
          left: 50%;
          top: 49.5%;
          width: 15%;
          height: 15%;
          border-radius: 50%;
          background: radial-gradient(circle, #fff 0%, #bff3ff 45%, rgba(70, 214, 255, 0.45) 72%, transparent 80%);
          opacity: 0;
          transform: translate3d(-50%, -50%, 0);
          animation: jarvis-intro-fade 0.2s ease 0.6s forwards, jarvis-intro-core 1.1s ease-in-out 1s infinite;
        }

        @keyframes jarvis-intro-in-ring {
          from { opacity: 0; transform: translateZ(-260px); }
          to { opacity: 1; transform: translateZ(-30px); }
        }

        @keyframes jarvis-intro-in-coils {
          from { opacity: 0; transform: translateZ(220px); }
          to { opacity: 1; transform: translateZ(-10px); }
        }

        @keyframes jarvis-intro-in-stator {
          from { opacity: 0; transform: translateZ(300px); }
          to { opacity: 1; transform: translateZ(12px); }
        }

        @keyframes jarvis-intro-in-lens {
          from { opacity: 0; transform: translateZ(380px) scale(1.2); }
          to { opacity: 1; transform: translateZ(34px); }
        }

        @keyframes jarvis-intro-part-out {
          to { opacity: 0; }
        }

        @keyframes jarvis-intro-logo-in {
          to { opacity: 1; }
        }

        @keyframes jarvis-intro-flash {
          0% { opacity: 0; transform: translate3d(-50%, -50%, 0) scale(0.2); }
          25% { opacity: 0.95; transform: translate3d(-50%, -50%, 0) scale(1); }
          100% { opacity: 0; transform: translate3d(-50%, -50%, 0) scale(3.4); }
        }

        @keyframes jarvis-intro-flatten {
          to { transform: rotateX(0deg) rotateY(0deg); }
        }

        @keyframes jarvis-intro-spin {
          from { transform: rotateZ(0deg); }
          to { transform: rotateZ(360deg); }
        }

        @keyframes jarvis-intro-recede {
          to { opacity: 0.24; transform: translate3d(-50%, -50%, 0) scale(1.18); }
        }

        @keyframes jarvis-intro-fade {
          to { opacity: 1; }
        }

        @keyframes jarvis-intro-core {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }

        @media (max-width: 640px) {
          .jarvis-intro__scene {
            width: min(86vmin, 520px);
            height: min(86vmin, 520px);
          }

          .jarvis-intro__part--ring {
            border-width: 18px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .jarvis-intro *,
          .jarvis-intro *::before,
          .jarvis-intro *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}

export const JarvisIntroV2 = memo(JarvisIntroV2Component);
