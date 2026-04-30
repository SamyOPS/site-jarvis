"use client"

export default function HandshakeIcon() {
  return (
    <div style={{ width: 280, height: 280, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      
      {/* Halo de fond subtil */}
      <div style={{
        position: "absolute", width: 180, height: 180, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(90,180,224,0.08) 0%, transparent 70%)",
        animation: "pulse 4s ease-in-out infinite"
      }} />

      <svg
        width="160"
        height="160"
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ zIndex: 4 }}
      >
        <path 
          className="hand-left"
          d="M11 17l-5-5 5-5" 
          stroke="#5ab4e0" 
        />
        <path 
          className="hand-left"
          d="M18 12H6" 
          stroke="#5ab4e0" 
        />

        <path 
          className="hand-right"
          d="M13 7l5 5-5 5" 
          stroke="#f97316" 
        />
        <path 
          className="hand-right"
          d="M6 12h12" 
          stroke="#f97316" 
        />
        
        <circle cx="12" cy="12" r="1" fill="#f97316" className="point-contact" />
      </svg>

      <style>{`
        .hand-left {
          animation: meetLeft 1s ease-out forwards;
        }
        .hand-right {
          animation: meetRight 1s ease-out forwards;
        }
        .point-contact {
          animation: appear 0.5s 0.8s both;
        }

        @keyframes meetLeft {
          from { transform: translateX(-30px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes meetRight {
          from { transform: translateX(30px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes appear {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1.5); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.1); opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}