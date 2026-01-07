"use client";

import type { ReactNode } from "react";
import { ParticleField } from "@/components/particle-field";

type ParticlePageProps = {
  children: ReactNode;
  className?: string;
  fullPage?: boolean;
};

export function ParticlePage({
  children,
  className = "",
  fullPage = true,
}: ParticlePageProps) {
  return (
    <div className={`relative min-h-screen ${className}`}>
      <ParticleField className="z-0" fullPage={fullPage} />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
