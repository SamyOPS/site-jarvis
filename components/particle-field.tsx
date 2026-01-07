"use client";

import { useEffect, useRef } from "react";

type ParticleFieldProps = {
  fixed?: boolean;
  fullPage?: boolean;
  className?: string;
};

export function ParticleField({
  fixed = false,
  fullPage = false,
  className = "",
}: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const minParticles = 420;
    const maxParticles = 860;
    const density = 100000; // px^2 per particle
    const maxDistance = 140;
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
    }> = [];
    let viewWidth = 0;
    let viewHeight = 0;

    const setSize = () => {
      const parent = canvas.parentElement;
      const targetWidth = fullPage
        ? document.documentElement.clientWidth
        : parent?.clientWidth ?? canvas.clientWidth;
      const targetHeight = fullPage
        ? document.documentElement.scrollHeight
        : parent?.clientHeight ?? canvas.clientHeight;
      const dpr = window.devicePixelRatio || 1;

      viewWidth = targetWidth;
      viewHeight = targetHeight;
      canvas.style.width = `${targetWidth}px`;
      canvas.style.height = `${targetHeight}px`;
      canvas.width = targetWidth * dpr;
      canvas.height = targetHeight * dpr;
    };

    const resetScale = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    const initParticles = () => {
      particles.length = 0;
      const targetCount = Math.max(
        minParticles,
        Math.min(maxParticles, Math.floor((viewWidth * viewHeight) / density))
      );
      for (let i = 0; i < targetCount; i++) {
        particles.push({
          x: Math.random() * viewWidth,
          y: Math.random() * viewHeight,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          r: 2 + Math.random() * 1.5,
        });
      }
    };

    let lastScrollHeight = 0;
    let lastScrollWidth = 0;

    const animate = () => {
      if (fullPage) {
        const nextWidth = document.documentElement.clientWidth;
        const nextHeight = document.documentElement.scrollHeight;
        if (nextWidth !== lastScrollWidth || nextHeight !== lastScrollHeight) {
          lastScrollWidth = nextWidth;
          lastScrollHeight = nextHeight;
          setSize();
          initParticles();
        }
      }

      resetScale();
      ctx.clearRect(0, 0, viewWidth, viewHeight);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x <= 0 || p.x >= viewWidth) p.vx *= -1;
        if (p.y <= 0 || p.y >= viewHeight) p.vy *= -1;
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
            ctx.strokeStyle = `rgba(0,0,128,${0.2 * opacity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const p of particles) {
        ctx.fillStyle = "rgba(0,0,128,0.6)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      animationId = requestAnimationFrame(animate);
    };

    setSize();
    if (fullPage) {
      lastScrollWidth = document.documentElement.clientWidth;
      lastScrollHeight = document.documentElement.scrollHeight;
    }
    initParticles();
    animationId = requestAnimationFrame(animate);

    const handleResize = () => {
      setSize();
      initParticles();
    };

    let resizeObserver: ResizeObserver | null = null;
    if (!fullPage && canvas.parentElement) {
      resizeObserver = new ResizeObserver(() => {
        setSize();
        initParticles();
      });
      resizeObserver.observe(canvas.parentElement);
    }

    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      resizeObserver?.disconnect();
    };
  }, []);

  const positioning = fixed ? "fixed" : "absolute";
  const baseClasses = "pointer-events-none inset-0 h-full w-full opacity-50";

  return <canvas ref={canvasRef} className={`${positioning} ${baseClasses} ${className}`} />;
}
