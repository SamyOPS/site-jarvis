import { BATTLESHIP_SIZE, type BattleshipShip } from "@/domain/games";

/*
  Dessins des bateaux, vus du dessus.

  Chaque bateau est dessine HORIZONTALEMENT, proue a droite, dans une boite de
  (taille × 100) sur 100 unites — une unite de 100 par case. Un bateau vertical reutilise
  le meme dessin, pivote d'un quart de tour : un seul trace par type a maintenir.
*/

export type ShipKind = "carrier" | "cruiser" | "destroyer" | "submarine" | "patrol";

/**
 * Type d'un bateau. Sa place dans la flotte le donne sans ambiguite ; a defaut (bateau
 * adverse coule, dont on ne connait que les cases), sa longueur suffit sauf entre les
 * deux bateaux de 3, dessines alors en contre-torpilleur.
 */
export function shipKind(size: number, fleetIndex?: number): ShipKind {
  if (fleetIndex === 3) return "submarine";
  if (size >= 5) return "carrier";
  if (size === 4) return "cruiser";
  if (size === 3) return "destroyer";
  return "patrol";
}

type Tone = "normal" | "sunk" | "revealed";

const PALETTE: Record<Tone, { hull: string; deck: string; line: string; detail: string }> = {
  normal: { hull: "#cbd5e1", deck: "#94a3b8", line: "#1e293b", detail: "#475569" },
  sunk: { hull: "#b91c1c", deck: "#7f1d1d", line: "#450a0a", detail: "#450a0a" },
  // Flotte adverse revelee en fin de partie : visible, mais en retrait des bateaux coules.
  revealed: { hull: "#e2e8f0", deck: "#cbd5e1", line: "#334155", detail: "#64748b" },
};

function Turret({ x, facing, color }: { x: number; facing: 1 | -1; color: string }) {
  return (
    <g>
      <line x1={x} y1={50} x2={x + facing * 30} y2={50} stroke={color} strokeWidth={6} strokeLinecap="round" />
      <circle cx={x} cy={50} r={13} fill={color} />
    </g>
  );
}

function Hull({ width, kind, colors }: { width: number; kind: ShipKind; colors: (typeof PALETTE)[Tone] }) {
  if (kind === "submarine") {
    // Coque en fuseau, arrondie aux deux bouts.
    const d = `M 10 50 Q 10 30 45 30 L ${width - 60} 30 Q ${width - 6} 36 ${width - 6} 50 Q ${width - 6} 64 ${width - 60} 70 L 45 70 Q 10 70 10 50 Z`;
    return <path d={d} fill={colors.hull} stroke={colors.line} strokeWidth={4} />;
  }
  // Poupe carree legerement arrondie, proue en pointe.
  const top = kind === "carrier" ? 16 : 22;
  const bottom = 100 - top;
  const d = `M 8 ${top + 10} Q 8 ${top} 20 ${top} L ${width - 48} ${top} Q ${width - 4} 50 ${width - 48} ${bottom} L 20 ${bottom} Q 8 ${bottom} 8 ${bottom - 10} Z`;
  const deck = `M 22 ${top + 12} L ${width - 56} ${top + 12} Q ${width - 26} 50 ${width - 56} ${bottom - 12} L 22 ${bottom - 12} Z`;
  return (
    <>
      <path d={d} fill={colors.hull} stroke={colors.line} strokeWidth={4} />
      <path d={deck} fill={colors.deck} opacity={0.55} />
    </>
  );
}

function Details({ width, kind, colors }: { width: number; kind: ShipKind; colors: (typeof PALETTE)[Tone] }) {
  switch (kind) {
    case "carrier":
      return (
        <g>
          {/* Piste d'envol, puis ilot decale a tribord. */}
          <line x1={34} y1={50} x2={width - 90} y2={50} stroke="#f8fafc" strokeWidth={3} strokeDasharray="16 10" />
          <line x1={60} y1={30} x2={width - 170} y2={30} stroke="#f8fafc" strokeWidth={2} opacity={0.6} />
          <rect x={width - 170} y={62} width={60} height={20} rx={4} fill={colors.detail} />
          <rect x={width - 150} y={66} width={12} height={12} rx={2} fill={colors.line} />
        </g>
      );
    case "cruiser":
      return (
        <g>
          <Turret x={60} facing={-1} color={colors.detail} />
          <Turret x={130} facing={-1} color={colors.detail} />
          <rect x={180} y={34} width={70} height={32} rx={6} fill={colors.detail} />
          <circle cx={215} cy={50} r={7} fill={colors.line} />
          <Turret x={300} facing={1} color={colors.detail} />
        </g>
      );
    case "destroyer":
      return (
        <g>
          <Turret x={55} facing={-1} color={colors.detail} />
          <rect x={105} y={36} width={60} height={28} rx={6} fill={colors.detail} />
          <circle cx={135} cy={50} r={6} fill={colors.line} />
          <Turret x={215} facing={1} color={colors.detail} />
        </g>
      );
    case "submarine":
      return (
        <g>
          {/* Kiosque et periscope. */}
          <rect x={width / 2 - 26} y={40} width={52} height={20} rx={10} fill={colors.detail} />
          <line x1={width / 2 + 6} y1={50} x2={width / 2 + 30} y2={50} stroke={colors.line} strokeWidth={4} strokeLinecap="round" />
          <line x1={24} y1={50} x2={width / 2 - 34} y2={50} stroke={colors.line} strokeWidth={2} opacity={0.5} />
        </g>
      );
    case "patrol":
      return (
        <g>
          <rect x={48} y={36} width={52} height={28} rx={6} fill={colors.detail} />
          <rect x={56} y={42} width={14} height={16} rx={2} fill={colors.line} opacity={0.6} />
          <Turret x={135} facing={1} color={colors.detail} />
        </g>
      );
  }
}

/** Un bateau pose sur la grille, positionne en pourcentage de celle-ci. */
export function ShipShape({
  cells,
  kind,
  tone = "normal",
}: {
  cells: BattleshipShip;
  kind: ShipKind;
  tone?: Tone;
}) {
  const sorted = [...cells].sort((a, b) => a - b);
  const size = sorted.length;
  const start = sorted[0];
  const vertical = size > 1 && sorted[1] - sorted[0] === BATTLESHIP_SIZE;
  const row = Math.floor(start / BATTLESHIP_SIZE);
  const col = start % BATTLESHIP_SIZE;
  const unit = 100 / BATTLESHIP_SIZE;
  const width = size * 100;
  const colors = PALETTE[tone];

  return (
    <svg
      aria-hidden
      viewBox={vertical ? `0 0 100 ${width}` : `0 0 ${width} 100`}
      className="pointer-events-none absolute drop-shadow-[0_2px_2px_rgba(0,0,0,0.45)]"
      style={{
        left: `${col * unit}%`,
        top: `${row * unit}%`,
        width: `${(vertical ? 1 : size) * unit}%`,
        height: `${(vertical ? size : 1) * unit}%`,
      }}
    >
      {/* Vertical : quart de tour, la proue passe en bas. */}
      <g transform={vertical ? "translate(100 0) rotate(90)" : undefined}>
        <Hull width={width} kind={kind} colors={colors} />
        <Details width={width} kind={kind} colors={colors} />
      </g>
    </svg>
  );
}
