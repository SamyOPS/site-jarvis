"use client";

import { useRef } from "react";
import { ArrowRight, FileText, MapPin } from "lucide-react";

interface Post {
  id: string;
  title: string;
  summary: string;
  label: string;
  author: string;
  url: string;
}

const JOB_CONFIG: Record<string, { badge: string; border: string }> = {
  CDI:         { badge: "bg-[#e8f4fd] text-[#0A1A2F]",    border: "#2aa0dd" },
  CDD:         { badge: "bg-[#e8f4fd] text-[#0A1A2F]",    border: "#1a3a5c" },
  "CDI / CDD": { badge: "bg-[#e8f4fd] text-[#0A1A2F]",    border: "#2aa0dd" },
  Alternance:  { badge: "bg-[#e8f5e9] text-[#1b5e20]",    border: "#2aa0dd" },
  Freelance:   { badge: "bg-[#ede8f5] text-[#3a1a5c]",    border: "#1a3a5c" },
  Stage:       { badge: "bg-[#e8f4fd] text-[#0A1A2F]",    border: "#2aa0dd" },
};

export default function OffreCard({ post }: { post: Post }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  if (!post?.label) return null;

  const config = JOB_CONFIG[post.label] ?? { badge: "bg-gray-100 text-gray-600", border: "#e5e7eb" };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const wrap = wrapRef.current;
    const card = cardRef.current;
    if (!wrap || !card) return;

    const rect = wrap.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    card.style.transform = `perspective(800px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) translateZ(10px)`;
    
    wrap.style.setProperty("--tx", `${x * 12}px`);
    wrap.style.setProperty("--ty", `${y * 12}px`);
  };

  const handleMouseLeave = () => {
    if (!wrapRef.current || !cardRef.current) return;
    cardRef.current.style.transform = "";
    wrapRef.current.style.setProperty("--tx", "6px");
    wrapRef.current.style.setProperty("--ty", "6px");
  };

  return (
    <div
      ref={wrapRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="group relative"
      style={{ "--tx": "6px", "--ty": "6px" } as React.CSSProperties}
    >
      <div
        className="absolute inset-0 z-0 rounded-2xl border-2 opacity-30 transition-all duration-300 ease-out group-hover:opacity-60"
        style={{
          borderColor: config.border,
          transform: "translate(var(--tx), var(--ty))",
        }}
      />

      <div
        ref={cardRef}
        className="relative z-10 flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-transform duration-300 ease-out will-change-transform"
        style={{ transformStyle: "preserve-3d" }}
      >
        <div className="flex justify-start">
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${config.badge}`}>
            {post.label}
          </span>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-sm font-bold leading-tight text-[#0A1A2F]">
            {post.title}
          </h3>
          <p className="line-clamp-2 text-xs leading-relaxed text-gray-500">
            {post.summary}
          </p>
        </div>

        <div className="flex flex-col gap-1 border-t border-gray-50 pt-3">
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-tight text-gray-400">
            <FileText className="h-3 w-3 text-bleu-500/70" />
            <span>{post.label}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-tight text-gray-400">
            <MapPin className="h-3 w-3 text-bleu-500/70" />
            <span>{post.author}</span>
          </div>
        </div>

        <a
          href={post.url}
          className="mt-2 flex items-center gap-1.5 text-xs font-bold text-[#0A1A2F] transition-colors hover:text-bleu-500"
        >
          Voir l'offre
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
        </a>
      </div>
    </div>
  );
}