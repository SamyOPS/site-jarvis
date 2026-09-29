"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type WeatherEffectProps = {
  kind: "confetti" | "rain";
  /** Durée d'émission, en millisecondes ; les particules déjà lancées finissent leur course. */
  duration?: number;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  spin: number;
  color: string;
};

const CONFETTI_COLORS = ["#f43f5e", "#f59e0b", "#10b981", "#3b82f6", "#a855f7", "#facc15", "#ec4899"];

/**
 * Confettis ou pluie, dessinés sur un canvas plein écran au-dessus de tout.
 *
 * Canvas plutôt que des éléments DOM : quelques centaines de particules animées en
 * éléments HTML feraient saccader la fenêtre de jeu juste en dessous. Transparent aux
 * clics, et absent si l'utilisateur a demandé de réduire les animations.
 */
export function WeatherEffect({ kind, duration = 3500 }: WeatherEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const ratio = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * ratio;
      canvas.height = window.innerHeight * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const width = () => window.innerWidth;
    const height = () => window.innerHeight;
    const particles: Particle[] = [];
    const startedAt = performance.now();

    const spawn = () => {
      if (kind === "confetti") {
        // Deux canons en bas des coins, qui tirent vers le centre.
        for (const side of [0, 1]) {
          for (let i = 0; i < 4; i += 1) {
            const angle = side === 0 ? -Math.PI / 3 - Math.random() * 0.5 : (-2 * Math.PI) / 3 + Math.random() * 0.5;
            const speed = 11 + Math.random() * 7;
            particles.push({
              x: side === 0 ? 0 : width(),
              y: height(),
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: 6 + Math.random() * 6,
              rotation: Math.random() * Math.PI,
              spin: (Math.random() - 0.5) * 0.3,
              color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
            });
          }
        }
      } else {
        for (let i = 0; i < 6; i += 1) {
          particles.push({
            x: Math.random() * (width() + 200) - 100,
            y: -20,
            vx: -1.5,
            vy: 13 + Math.random() * 6,
            size: 12 + Math.random() * 14,
            rotation: 0,
            spin: 0,
            color: `rgba(147, 197, 253, ${0.35 + Math.random() * 0.4})`,
          });
        }
      }
    };

    let frame = 0;
    const tick = (now: number) => {
      const elapsed = now - startedAt;
      if (elapsed < duration) spawn();
      context.clearRect(0, 0, width(), height());

      // Voile sombre de la pluie, qui s'estompe à la fin.
      if (kind === "rain") {
        const fade = Math.max(0, Math.min(1, elapsed / 400, (duration + 800 - elapsed) / 800));
        context.fillStyle = `rgba(15, 23, 42, ${0.25 * fade})`;
        context.fillRect(0, 0, width(), height());
      }

      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i];
        if (kind === "confetti") {
          p.vy += 0.28;
          p.vx *= 0.985;
          p.rotation += p.spin;
          context.save();
          context.translate(p.x, p.y);
          context.rotate(p.rotation);
          context.fillStyle = p.color;
          // Ruban qui tourne : sa largeur apparente oscille.
          context.fillRect(-p.size / 2, -p.size / 4, p.size * Math.abs(Math.cos(p.rotation * 2)), p.size / 2);
          context.restore();
        } else {
          context.strokeStyle = p.color;
          context.lineWidth = 1.6;
          context.beginPath();
          context.moveTo(p.x, p.y);
          context.lineTo(p.x + p.vx * 1.2, p.y + p.size);
          context.stroke();
        }
        p.x += p.vx;
        p.y += p.vy;
        if (p.y > height() + 40) particles.splice(i, 1);
      }

      if (elapsed < duration || particles.length > 0) frame = requestAnimationFrame(tick);
      else context.clearRect(0, 0, width(), height());
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [duration, kind]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-[70] h-full w-full" />,
    document.body,
  );
}
