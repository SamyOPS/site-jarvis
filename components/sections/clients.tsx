"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

interface ClientLogo {
  name: string;
  logo: string;
  url?: string;
  logoScale?: number;
  logoOffsetX?: number;
  logoOffsetY?: number;
}
interface ClientsProps { tag?: string; title?: string; description?: string; clients?: ClientLogo[]; highlightLogo?: string; quote?: ReactNode; author?: string; }
interface ClientsRowProps { items: ClientLogo[]; rowKey: string; direction: "left" | "right"; speed: number; }

function ClientCard({ client }: { client: ClientLogo }) {
  const scale = (client.logoScale ?? 1.0) * 100;
  const offsetX = client.logoOffsetX ?? 0;
  const offsetY = client.logoOffsetY ?? 0;

  return (
    <motion.div
      className="group relative flex h-16 w-44 shrink-0 items-center justify-center rounded-xl transition-all duration-300 sm:h-20 sm:w-52"
      style={{
        background: "rgba(255,255,255,0.85)",
        border: "1px solid rgba(42,160,221,0.12)",
        backdropFilter: "blur(8px)",
        padding: "8px",
      }}
      whileHover={{ scale: 1.04, boxShadow: "0 4px 24px rgba(42,160,221,0.15)" }}
    >
      <img
        src={client.logo}
        alt={client.name}
        className="pointer-events-none select-none"
        style={{
          display: "block",
          width: `${scale}%`,
          height: `${scale}%`,
          objectFit: "contain",
          transform: `translate(${offsetX}px, ${offsetY}px)`,
        }}
        draggable={false}
      />
    </motion.div>
  );
}

function normalizeOffset(offset: number, loopWidth: number) {
  if (loopWidth <= 0) return offset;
  let nextOffset = offset;
  while (nextOffset <= -loopWidth) nextOffset += loopWidth;
  while (nextOffset > 0) nextOffset -= loopWidth;
  return nextOffset;
}

function ClientsRow({ items, rowKey, direction, speed }: ClientsRowProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const offsetRef = useRef(direction === "right" ? -1 : 0);
  const loopWidthRef = useRef(0);
  const draggingRef = useRef(false);
  const lastPointerXRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const duplicatedItems = [...items, ...items];

  const applyOffset = useCallback((value: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.style.transform = `translate3d(${value}px, 0, 0)`;
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const updateLoopWidth = () => {
      loopWidthRef.current = track.scrollWidth / 2;
      const baseOffset = direction === "right" ? -loopWidthRef.current : 0;
      offsetRef.current = offsetRef.current === -1 ? baseOffset : normalizeOffset(offsetRef.current, loopWidthRef.current);
      applyOffset(offsetRef.current);
    };
    updateLoopWidth();
    const resizeObserver = new ResizeObserver(updateLoopWidth);
    resizeObserver.observe(track);
    return () => resizeObserver.disconnect();
  }, [applyOffset, direction, duplicatedItems.length]);

  useEffect(() => {
    const step = (time: number) => {
      if (lastTimeRef.current === null) lastTimeRef.current = time;
      const delta = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;
      if (!draggingRef.current && loopWidthRef.current > 0) {
        const distance = speed * delta * (direction === "left" ? -1 : 1);
        offsetRef.current = normalizeOffset(offsetRef.current + distance, loopWidthRef.current);
        applyOffset(offsetRef.current);
      }
      frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
    return () => { if (frameRef.current !== null) cancelAnimationFrame(frameRef.current); };
  }, [applyOffset, direction, speed]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    setIsDragging(true);
    lastPointerXRef.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || loopWidthRef.current <= 0) return;
    const deltaX = event.clientX - lastPointerXRef.current;
    lastPointerXRef.current = event.clientX;
    offsetRef.current = normalizeOffset(offsetRef.current + deltaX, loopWidthRef.current);
    applyOffset(offsetRef.current);
  };

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    draggingRef.current = false;
    setIsDragging(false);
  };

  return (
    <div className="overflow-hidden py-1">
      <div
        className={`cursor-grab ${isDragging ? "cursor-grabbing" : ""}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
      >
        <div ref={trackRef} className="flex w-max gap-3 select-none touch-pan-y">
          {duplicatedItems.map((client, index) => (
            <ClientCard key={`${rowKey}-${client.name}-${index}`} client={client} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function Clients({
  tag = "Nos Références clients",
  title = "Ils nous font confiance",
  description = "Nous livrons nos solutions numériques en partenariat avec des acteurs majeurs en France et en Europe.",
  clients = [],
  highlightLogo,
  quote,
  author,
}: ClientsProps) {
  const splitIndex = Math.ceil(clients.length / 2);
  const topRowClients = clients.slice(0, splitIndex);
  const bottomRowClients = clients.slice(splitIndex);

  return (
    <section className="relative bg-[#050B14] text-white py-8 md:py-10 overflow-hidden">
      <div className="container mx-auto px-6 lg:px-10 relative z-10">

        <div className="mx-auto max-w-5xl grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-12">

          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              className="inline-flex items-center gap-2 bg-blue-50/10 border border-blue-200/20 rounded-full px-2.5 py-0.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#2aa0dd]" />
              <span className="text-[10px] font-bold tracking-widest text-[#2aa0dd] uppercase">{tag}</span>
            </motion.div>

            <motion.h2
              className="text-3xl md:text-4xl lg:text-4xl font-extrabold leading-tight tracking-tight text-white"
              initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            >
              {title}
            </motion.h2>

            <motion.p
              className="text-base text-white/80 max-w-lg leading-relaxed"
              initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            >
              {description}
            </motion.p>

            {quote && (
              <motion.div
                className="border-l-4 border-[#2aa0dd]/40 pl-4 py-2 max-w-xl bg-blue-950/20 rounded-r-lg"
                initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              >
                <blockquote className="text-white/90 italic text-sm leading-relaxed">
                  "{quote}"
                  {author && <footer className="mt-2 text-xs font-semibold text-[#2aa0dd]">— {author}</footer>}
                </blockquote>
              </motion.div>
            )}
          </div>

          {highlightLogo && (
            <motion.div
              className="hidden lg:flex items-center justify-center bg-white p-4 rounded-2xl shadow-2xl w-[280px] h-[280px] shrink-0 self-center overflow-hidden"
              initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
              whileHover={{ scale: 1.02, boxShadow: "0 20px 40px rgba(42,160,221,0.2)" }}
            >
              <img
                src={highlightLogo}
                alt="Logo Partner"
                className="w-auto h-auto object-contain"
                style={{ maxWidth: "95%", maxHeight: "95%" }}
              />
            </motion.div>
          )}
        </div>

        <motion.div
          className="relative mt-8 rounded-xl bg-white/5 border border-white/10 p-4"
          initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        >
          <div className="relative space-y-3">
            <ClientsRow items={topRowClients} rowKey="top" direction="left" speed={14} />
            <ClientsRow items={bottomRowClients.length ? bottomRowClients : topRowClients} rowKey="bottom" direction="right" speed={12} />
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[#050B14]/90 to-transparent rounded-l-xl" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[#050B14]/90 to-transparent rounded-r-xl" />
        </motion.div>

      </div>
    </section>
  );
}