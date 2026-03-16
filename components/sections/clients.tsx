"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

interface ClientLogo {
  name: string;
  logo: string;
  url?: string;
  logoScale?: number;
}

interface ClientsProps {
  tag?: string;
  title?: string;
  description?: string;
  clients?: ClientLogo[];
  highlightLogo?: string;
  quote?: ReactNode;
  author?: string;
}

interface ClientsRowProps {
  items: ClientLogo[];
  rowKey: string;
  direction: "left" | "right";
  speed: number;
}

function ClientCard({ client }: { client: ClientLogo }) {
  return (
    <div
      className="relative z-0 flex h-16 w-[6.25rem] shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white p-1.5 text-[#0A1A2F] shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition duration-300 hover:z-10 hover:scale-[1.03] hover:border-white/30 hover:shadow-[0_14px_34px_rgba(0,0,0,0.18)] sm:h-28 sm:w-40"
    >
      <img
        src={client.logo}
        alt={client.name}
        className="pointer-events-none max-h-8 max-w-[72%] object-contain select-none sm:max-h-16"
        draggable={false}
        style={{
          ...(client.logoScale
            ? {
                maxWidth: `${80 * client.logoScale}%`,
                maxHeight: `${56 * client.logoScale}px`,
              }
            : {}),
          filter:
            client.name === "Aramis" || client.name === "Ricco"
              ? "drop-shadow(0 1px 1px rgba(0,0,0,0.45)) drop-shadow(0 0 6px rgba(0,0,0,0.22))"
              : "drop-shadow(0 1px 1px rgba(0,0,0,0.35))",
        }}
      />
    </div>
  );
}

function normalizeOffset(offset: number, loopWidth: number) {
  if (loopWidth <= 0) return offset;

  let nextOffset = offset;

  while (nextOffset <= -loopWidth) {
    nextOffset += loopWidth;
  }

  while (nextOffset > 0) {
    nextOffset -= loopWidth;
  }

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
      offsetRef.current =
        offsetRef.current === -1 ? baseOffset : normalizeOffset(offsetRef.current, loopWidthRef.current);
      applyOffset(offsetRef.current);
    };

    updateLoopWidth();

    const resizeObserver = new ResizeObserver(updateLoopWidth);
    resizeObserver.observe(track);

    return () => resizeObserver.disconnect();
  }, [applyOffset, direction, duplicatedItems.length]);

  useEffect(() => {
    const step = (time: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = time;
      }

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

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [applyOffset, direction, speed]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    draggingRef.current = true;
    setIsDragging(true);
    lastPointerXRef.current = event.clientX;
    target.setPointerCapture(event.pointerId);
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
    <div className="overflow-x-hidden overflow-y-visible py-1 sm:py-1.5">
      <div
        className={`cursor-grab overflow-y-visible ${isDragging ? "cursor-grabbing" : ""}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
      >
        <div
          ref={trackRef}
          className="flex w-max gap-2 sm:gap-4 select-none touch-pan-y"
        >
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
  description = "Pour deployer nos solutions numeriques a travers l'Europe.",
  clients = [],
  highlightLogo,
  quote,
  author,
}: ClientsProps) {
  const splitIndex = Math.ceil(clients.length / 2);
  const topRowClients = clients.slice(0, splitIndex);
  const bottomRowClients = clients.slice(splitIndex);

  return (
    <section className="bg-[#050B14] text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 lg:flex-row lg:items-start lg:gap-12 lg:px-10 lg:py-20">
        <div className="flex-1">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="space-y-6">
              <div className="space-y-3">
                <motion.p
                  className="text-sm font-semibold uppercase tracking-[0.2em] text-[#1557C0]"
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.45, ease: "easeOut", delay: 0.05 }}
                >
                  {tag}
                </motion.p>
                <motion.h2
                  className="font-display text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 }}
                >
                  {title}
                </motion.h2>
                <motion.p
                  className="max-w-xl text-base text-white/80"
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.45, ease: "easeOut", delay: 0.1 }}
                >
                  {description}
                </motion.p>
              </div>

              {quote && (
                <motion.div
                  className="max-w-2xl border-l border-white/15 pl-4 sm:pl-5"
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.55, ease: "easeOut", delay: 0.08 }}
                >
                  <blockquote className="w-full text-white/90">
                    <div className="text-lg leading-relaxed">{quote}</div>
                    {author && (
                      <footer className="mt-3 text-sm font-semibold text-white/70">
                        {author}
                      </footer>
                    )}
                  </blockquote>
                </motion.div>
              )}
            </div>

            {highlightLogo && (
              <motion.div
                className="w-full max-w-[15rem] border border-white/20 bg-white p-4 text-center sm:max-w-sm sm:p-6 lg:mt-28 lg:w-[320px]"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 }}
              >
                <motion.img
                  src={highlightLogo}
                  alt="Client principal"
                  className="mx-auto h-28 w-28 object-contain sm:h-40 sm:w-40"
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                />
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[96rem] px-6 pb-16 lg:px-10 xl:px-20 lg:pb-20">
        <motion.div
          className="relative overflow-x-hidden overflow-y-visible px-0 py-3 sm:px-2 sm:py-5"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, ease: "easeOut", delay: 0.08 }}
        >
          <div className="relative space-y-0.5 sm:space-y-1">
            <ClientsRow items={topRowClients} rowKey="top" direction="left" speed={18} />
            <ClientsRow
              items={bottomRowClients.length ? bottomRowClients : topRowClients}
              rowKey="bottom"
              direction="right"
              speed={16}
            />
          </div>

          <div className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-[#050B14] via-[#050B14]/50 to-transparent sm:w-8" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-[#050B14] via-[#050B14]/50 to-transparent sm:w-8" />
        </motion.div>
      </div>
    </section>
  );
}
