"use client";

import { useEffect, useRef } from "react";

export default function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const particlesCount = 80;
    const maxDistance = 140;
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
    }> = [];

    const setSize = () => {
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
    };

    const resetScale = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    const initParticles = () => {
      particles.length = 0;
      for (let i = 0; i < particlesCount; i++) {
        particles.push({
          x: Math.random() * canvas.clientWidth,
          y: Math.random() * canvas.clientHeight,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          r: 2 + Math.random() * 1.5,
        });
      }
    };

    const animate = () => {
      resetScale();
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x <= 0 || p.x >= canvas.clientWidth) p.vx *= -1;
        if (p.y <= 0 || p.y >= canvas.clientHeight) p.vy *= -1;
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDistance) {
            const opacity = 1 - dist / maxDistance;
            ctx.strokeStyle = `rgba(0,0,128,${0.35 * opacity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const p of particles) {
        ctx.fillStyle = "#000080";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      animationId = requestAnimationFrame(animate);
    };

    setSize();
    initParticles();
    animationId = requestAnimationFrame(animate);

    const handleResize = () => {
      setSize();
      initParticles();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}
