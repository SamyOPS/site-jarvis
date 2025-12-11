"use client"

import type React from "react"

interface ShaderBackgroundProps {
  children?: React.ReactNode
}

// Simplified static gradient to avoid GPU-heavy shader rendering
export function ShaderBackground({ children }: ShaderBackgroundProps) {
  return (
    <div className="relative min-h-[650px] w-full overflow-hidden bg-[#0A1A2F]">
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, #1d4ed8 0%, transparent 35%), radial-gradient(circle at 80% 30%, #8fc7ff 0%, transparent 30%), radial-gradient(circle at 50% 70%, #4fa1ff 0%, transparent 40%), linear-gradient(120deg, #0a1a2f 0%, #0b2845 35%, #0a1a2f 100%)",
          opacity: 0.9,
        }}
      />

      <div className="relative">{children}</div>
    </div>
  )
}
