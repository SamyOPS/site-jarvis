"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import { Footer } from "@/components/sections/footer";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

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
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: idx * 0.1 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ position: "relative", overflow: "hidden", cursor: "pointer", borderRadius: "10px", height: "380px" }}
    >
      {/* Image de fond */}
      <img
        src={item.cover_image ?? "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800"}
        alt={item.title}
        style={{ width: "100%", height: "260px", objectFit: "cover", display: "block", borderRadius: "10px" }}
      />

      {/* État Normal : Titre et bouton gris */}
      <motion.div
        animate={{ opacity: isHovered ? 0 : 1, y: isHovered ? 20 : 0 }}
        transition={{ duration: 0.4 }}
        style={{ marginTop: "-30px", textAlign: "center", position: "relative", zIndex: 2 }}
      >
        <div style={{ background: "#1a3a5c", borderRadius: "10px", padding: "16px 20px", margin: "0 25px shadow-lg" }}>
          <span style={{ color: "#fff", fontSize: "16px", fontWeight: 600 }}>{item.title}</span>
        </div>
        <div
          style={{ display: "inline-block", marginTop: "12px", borderRadius: "50px", background: "#f0f0f0", color: "#e8335a", padding: "8px 24px", fontSize: "13px", fontWeight: 600 }}
        >
          En savoir plus
        </div>
      </motion.div>

      {/* État Hover : Panel bleu qui monte */}
      <motion.div
        animate={{ bottom: isHovered ? "0%" : "-100%", opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{
          position: "absolute",
          left: "25px",
          right: "25px",
          background: "#1a3a5c",
          borderRadius: "10px",
          padding: "20px 15px",
          textAlign: "center",
          zIndex: 3,
        }}
      >
        <h4 style={{ color: "#fff", fontSize: "17px", fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px", marginBottom: "10px" }}>
          {item.title}
        </h4>
        <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "13px", lineHeight: 1.5, marginBottom: "15px" }} className="line-clamp-4">
          {item.excerpt ?? "Découvrez notre dernier article."}
        </p>
        <a
          href={`/actus/${item.slug}`}
          style={{ display: "inline-block", borderRadius: "50px", background: "#e8335a", color: "#fff", padding: "8px 24px", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}
        >
          Lire l'article
        </a>
      </motion.div>
    </motion.div>
  );
}

// --- PAGE PRINCIPALE ---
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
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  return (
    <div className="min-h-screen bg-[#F4F7FA] text-[#0A1A2F]">
      <main className="mx-auto max-w-6xl px-6 py-16 lg:px-10 lg:py-20">
        
        {/* Header de la page */}
        <div className="mb-16 text-center">
          <motion.p 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-xs uppercase tracking-[0.3em] text-[#e8335a] font-bold mb-3"
          >
            Actualités
          </motion.p>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-semibold md:text-5xl mb-6"
          >
            Toutes les actus
          </motion.h1>
          <div className="mx-auto w-20 h-1 bg-[#1a3a5c] mb-6"></div>
          <p className="mx-auto max-w-2xl text-gray-500">
            Analyses, projets, annonces et points de vue de Jarvis Connect.
          </p>
        </div>

        {/* Gestion des états (Loading / Error) */}
        {loading && (
          <div className="flex justify-center py-20">
            <p className="animate-pulse text-gray-400">Chargement de la veille technologique...</p>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-center text-red-700 border border-red-100">
            {error}
          </div>
        )}

        {/* Grille d'actualités (Même style que l'accueil) */}
        <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {!loading && items.map((item, idx) => (
              <NewsCard key={item.id} item={item} idx={idx} />
            ))}
          </AnimatePresence>
        </div>

        {!loading && items.length === 0 && !error && (
          <div className="text-center py-20 text-gray-500 italic">
            Aucun article n'est disponible pour le moment.
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}