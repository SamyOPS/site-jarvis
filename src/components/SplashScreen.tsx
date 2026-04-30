"use client";

import { useEffect, useState } from "react";

export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const duration = 700;
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min((elapsed / duration) * 100, 100);
      setProgress(p);
      if (p >= 100) clearInterval(interval);
    }, 16);

    const fade = setTimeout(() => setFading(true), 800);
    const hide = setTimeout(() => setVisible(false), 1100);

    return () => {
      clearInterval(interval);
      clearTimeout(fade);
      clearTimeout(hide);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0A1A2F",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "28px",
        opacity: fading ? 0 : 1,
        transition: "opacity 0.3s ease",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          perspective: "600px",
          animation: "flipIn 0.5s cubic-bezier(0.22,1,0.36,1) forwards",
        }}
      >
        <div
          style={{
            animation: "float 2s ease-in-out infinite",
            filter: "drop-shadow(0 20px 24px rgba(42,160,221,0.25)) drop-shadow(0 4px 8px rgba(0,0,0,0.12))",
          }}
        >
          <img
            src="/logo jarvis.png"
            alt="Jarvis Connect"
            style={{
              width: "140px",
              height: "auto",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>
      </div>

      <div
        style={{
          width: "140px",
          height: "4px",
          background: "#e5e7eb",
          borderRadius: "99px",
          overflow: "hidden",
          boxShadow: "0 2px 6px rgba(0,0,0,0.08), inset 0 1px 2px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "linear-gradient(90deg, #1a8bc7, #2aa0dd, #7ce0ff)",
            borderRadius: "99px",
            boxShadow: "0 0 8px rgba(42,160,221,0.6)",
            transition: "width 0.05s linear",
          }}
        />
      </div>

      <style>{`
        @keyframes flipIn {
          0% { transform: rotateY(-60deg) scale(0.8); opacity: 0; }
          100% { transform: rotateY(0deg) scale(1); opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotateX(0deg); }
          50% { transform: translateY(-6px) rotateX(4deg); }
        }
      `}</style>
    </div>
  );
}