"use client"

import { useRef, useState } from "react"

const CONTRACT_TYPES = [
  { type: "Tous",       bg: "#e8f4fd", stroke: "#2aa0dd", icon: "pin"       },
  { type: "CDI",        bg: "#e8f4fd", stroke: "#0A1A2F", icon: "briefcase" },
  { type: "CDD",        bg: "#dbeafe", stroke: "#1a3a5c", icon: "calendar"  },
  { type: "Alternance", bg: "#e8f4fd", stroke: "#2aa0dd", icon: "home"      },
  { type: "Freelance",  bg: "#ede8f5", stroke: "#1a3a5c", icon: "user"      },
  { type: "Stage",      bg: "#e8f4fd", stroke: "#0A1A2F", icon: "chart"     },
]

const ICONS: Record<string, React.ReactElement> = {
  pin: (
    <svg viewBox="0 0 16 16" fill="none" strokeWidth="1.8" strokeLinecap="round">
      <path d="M8 2C5.8 2 4 3.8 4 6c0 3.3 4 8 4 8s4-4.7 4-8c0-2.2-1.8-4-4-4z"/>
      <circle cx="8" cy="6" r="1.3"/>
    </svg>
  ),
  briefcase: (
    <svg viewBox="0 0 16 16" fill="none" strokeWidth="1.8" strokeLinecap="round">
      <rect x="2" y="5" width="12" height="9" rx="1.5"/>
      <path d="M5 5V4a3 3 0 0 1 6 0v1"/>
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 16 16" fill="none" strokeWidth="1.8" strokeLinecap="round">
      <rect x="2" y="3" width="12" height="11" rx="1.5"/>
      <path d="M5 3V2M11 3V2M2 7h12"/>
    </svg>
  ),
  home: (
    <svg viewBox="0 0 16 16" fill="none" strokeWidth="1.8" strokeLinecap="round">
      <path d="M3 13V6l5-4 5 4v7"/>
      <path d="M6 13v-3h4v3"/>
    </svg>
  ),
  user: (
    <svg viewBox="0 0 16 16" fill="none" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="8" cy="5" r="3"/>
      <path d="M2 14c0-3 2.5-5 6-5s6 2 6 5"/>
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 16 16" fill="none" strokeWidth="1.8" strokeLinecap="round">
      <path d="M2 12l3-3 3 3 3-5 3 2"/>
    </svg>
  ),
}

interface ContractFilterProps {
  active: string
  onChange: (type: string) => void
}

export default function ContractFilter({ active, onChange }: ContractFilterProps) {
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleEnter = () => {
    if (timer.current) clearTimeout(timer.current)
    setOpen(true)
  }
  const handleLeave = () => {
    timer.current = setTimeout(() => setOpen(false), 200)
  }

  return (
    <div
      style={{ position: "relative", zIndex: 50, display: "flex", justifyContent: "center", marginTop: "-6px" }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <div style={{
        background: "#fff",
        borderRadius: "9999px",
        border: "1px solid #e8f4fd",
        boxShadow: "0 2px 8px rgba(42,160,221,0.1)",
        padding: "10px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "6px",
        width: "40px",
        position: "relative",
        zIndex: 20,
      }}>
        {CONTRACT_TYPES.map((c, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            {i === 0 ? (
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#2aa0dd", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M8 2C5.8 2 4 3.8 4 6c0 3.3 4 8 4 8s4-4.7 4-8c0-2.2-1.8-4-4-4z"/>
                  <circle cx="8" cy="6" r="1.3" fill="white" stroke="none"/>
                </svg>
              </div>
            ) : (
              <>
                <div style={{ width: 14, height: 0.5, background: "#e8f4fd" }} />
                <div style={{ width: 18, height: 18, borderRadius: 6, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 11, height: 11, stroke: c.stroke, color: c.stroke }}>
                    {ICONS[c.icon]}
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div style={{
        position: "absolute",
        left: "46px",
        top: 0,
        background: "#fff",
        borderRadius: "12px",
        border: "1px solid #e8f4fd",
        boxShadow: "0 6px 20px rgba(42,160,221,0.12)",
        padding: "8px",
        width: "115px",
        display: "flex",
        flexDirection: "column",
        gap: "1px",
        zIndex: 100,
        pointerEvents: open ? "auto" : "none",
        opacity: open ? 1 : 0,
        transform: open ? "translateX(0)" : "translateX(-4px)",
        transition: "opacity 0.2s ease, transform 0.2s ease",
      }}>
        <p style={{ fontSize: 8, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#2aa0dd", padding: "0 4px 4px" }}>
          {"Type de contrat"}
        </p>
        {CONTRACT_TYPES.map((c) => (
          <button
            key={c.type}
            onClick={() => { onChange(c.type); setOpen(false) }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "3px 4px",
              borderRadius: "6px",
              width: "100%",
              textAlign: "left",
              border: "none",
              cursor: "pointer",
              background: active === c.type ? "#e8f4fd" : "transparent",
              transition: "background 0.15s",
            }}
          >
            <div style={{ width: 18, height: 18, borderRadius: 5, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ width: 11, height: 11, stroke: c.stroke }}>{ICONS[c.icon]}</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 500, color: active === c.type ? "#0A1A2F" : "#6b7280" }}>
              {c.type}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}