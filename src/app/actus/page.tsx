"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Footer } from "@/components/sections/footer";
import { HomeHeader } from "@/components/sections/home-header";
import { browserSupabase } from "@/lib/supabase-browser";

const supabase = browserSupabase;

type NewsItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image: string | null;
  published_at: string | null;
  created_at: string;
};

function NewsCard({ item, idx }: { item: NewsItem; idx: number }) {
  return (
    <motion.div
      className="group"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: idx * 0.08 }}
      style={{ position: "relative", cursor: "pointer", borderRadius: "10px", overflow: "hidden" }}
    >
      {/* Image de fond */}
      <div style={{ position: "relative", width: "100%", height: "260px", borderRadius: "10px", overflow: "hidden" }}>
        <Image
          src={item.cover_image ?? "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800"}
          alt={item.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="group-hover:scale-105 transition-transform duration-500"
          style={{ objectFit: "cover" }}
        />
      </div>

      {/* Label visible par défaut */}
      <div
        className="transition-all duration-300 group-hover:opacity-0 group-hover:translate-y-4"
        style={{ marginTop: "-30px", textAlign: "center", position: "relative", zIndex: 2 }}
      >
        <div style={{ background: "#0A1A2F", borderRadius: "10px", padding: "16px 20px", margin: "0 30px" }}>
          <span style={{ color: "#fff", fontSize: "17px", fontWeight: 600 }}>{item.title}</span>
        </div>
        <Link href={`/actus/${item.slug}`} style={{ display: "inline-block", marginTop: "12px", marginBottom: "8px", borderRadius: "50px", background: "#f0f0f0", color: "#2aa0dd", padding: "10px 32px", fontSize: "14px", fontWeight: 600, textDecoration: "none" }}>
          En savoir plus
        </Link>
      </div>

      {/* Overlay CSS pur — pas de flickering */}
      <div
        className="absolute left-[30px] right-[30px] translate-y-0 opacity-100 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 ease-out md:translate-y-full md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 overflow-y-auto md:overflow-visible"
        style={{ bottom: "0px", background: "#0A1A2F", borderRadius: "10px", padding: "24px 20px", textAlign: "center", zIndex: 3, maxHeight: '300px' }}
      >
        <h4 style={{ color: "#fff", fontSize: "18px", fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "12px", marginBottom: "12px", marginTop: 0 }}>
          {item.title}
        </h4>
        <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "14px", lineHeight: 1.6, marginBottom: "20px", marginTop: 0 }} className="line-clamp-none md:line-clamp-3">
          {item.excerpt ?? "Découvrez notre dernier article."}
        </p>
        <a
          href={`/actus/${item.slug}`}
          style={{ display: "inline-block", borderRadius: "50px", background: "#2aa0dd", color: "#fff", padding: "10px 32px", fontSize: "14px", fontWeight: 600, textDecoration: "none" }}
        >
          Lire l'article
        </a>
      </div>
    </motion.div>
  );
}

export default function ActusPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      if (!supabase) {
        setError("Configuration Supabase manquante.");
        setLoading(false);
        return;
      }
      try {
        const { data, error: fetchError } = await supabase
          .from("news")
          .select("id,title,slug,excerpt,cover_image,published_at,created_at")
          .eq("status", "published")
          .order("published_at", { ascending: false });
        if (fetchError) throw fetchError;
        setItems(data ?? []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  return (
    <>
      <div className="min-h-screen bg-white text-[#0A1A2F]">
        <HomeHeader />

        {/* Hero */}
        <div className="bg-[#0A1A2F] py-24 px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Actualités de Jarvis Connect
          </h1>
          <div className="mt-2 mb-6 mx-auto w-12 h-1 rounded-full bg-[#2aa0dd]" />
          <p className="mx-auto max-w-2xl text-base text-white/60 leading-relaxed">
            Analyses, projets, annonces et points de vue de l'équipe Jarvis Connect.
          </p>
        </div>

        <main className="mx-auto max-w-6xl px-6 py-16 lg:px-10 lg:py-20">

          {loading && (
            <div className="flex justify-center py-20">
              <p className="animate-pulse text-gray-400">Chargement des actualités...</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-center text-red-700 border border-red-100">
              {error}
            </div>
          )}

          <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {!loading && items.map((item, idx) => (
                <NewsCard key={item.id} item={item} idx={idx} />
              ))}
            </AnimatePresence>
          </div>

          {!loading && items.length === 0 && !error && (
            <div className="text-center py-20 text-gray-500 italic">
              Aucun article disponible pour le moment.
            </div>
          )}

        </main>
      </div>
      <Footer />
    </>
  );
}