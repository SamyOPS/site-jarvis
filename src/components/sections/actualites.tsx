"use client";

import Image from "next/image";
import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { browserSupabase } from "@/lib/supabase-browser";

const supabase = browserSupabase;

interface GalleryItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  image: string;
  video_url?: string;
}

interface ActualitesProps {
  heading?: string;
  description?: string;
  demoUrl?: string;
  items?: GalleryItem[];
}

const fallbackItems: GalleryItem[] = [
  { id: "item-1", title: "Cybersecurite 2026", summary: "Les nouvelles menaces et solutions pour proteger votre SI contre les attaques modernes.", url: "#", image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80" },
  { id: "item-2", title: "Dev applicatif", summary: "Conception et livraison d applications metiers robustes, full stack, avec CI/CD integre.", url: "#", image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80" },
  { id: "item-3", title: "Cloud et infogerance", summary: "Migration, supervision 24/7 et FinOps pour optimiser vos couts et votre disponibilite.", url: "#", image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80" },
  { id: "item-4", title: "Support N2/N3", summary: "Prise en charge des incidents complexes, supervision et automatisation pour vos utilisateurs.", url: "#", image: "https://images.unsplash.com/photo-1525182008055-f88b95ff7980?auto=format&fit=crop&w=800&q=80" },
  { id: "item-5", title: "Transformation digitale", summary: "Audit, roadmap et pilotage des chantiers de transformation pour accelerer votre SI.", url: "#", image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80" },
  { id: "item-6", title: "IA et automatisation", summary: "Integration de l IA dans vos processus metiers pour gagner en productivite et fiabilite.", url: "#", image: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?auto=format&fit=crop&w=800&q=80" },
];

function ServiceCard({ item, idx }: { item: GalleryItem; idx: number }) {
  return (
    <motion.div
      className="group block"
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, delay: idx * 0.1, ease: [0.33, 1, 0.68, 1] }}
      style={{ position: "relative", borderRadius: "10px", width: "100%", overflow: "hidden" }}
    >
      <a href={item.url} style={{ display: "block", textDecoration: "none", cursor: "pointer" }}>
        <div style={{ position: "relative", width: "100%", height: "260px", borderRadius: "10px", overflow: "hidden" }}>
          <Image
            src={item.image}
            alt={item.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="group-hover:scale-105 transition-transform duration-500"
            style={{ objectFit: "cover" }}
          />
        </div>
        <div
          className="transition-all duration-300 group-hover:opacity-0 group-hover:translate-y-4"
          style={{ marginTop: "-30px", textAlign: "center", position: "relative", zIndex: 2 }}
        >
          <div style={{ background: "#0A1A2F", borderRadius: "10px", padding: "16px 20px", margin: "0 30px" }}>
            <span style={{ color: "#fff", fontSize: "17px", fontWeight: 600 }}>{item.title}</span>
          </div>
          <div style={{ display: "inline-block", marginTop: "12px", marginBottom: "8px", borderRadius: "50px", background: "#f0f0f0", color: "#2aa0dd", padding: "10px 32px", fontSize: "14px", fontWeight: 600 }}>
            En savoir plus
          </div>
        </div>
        <div
          className="absolute left-[30px] right-[30px] translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 ease-out"
          style={{ bottom: "0px", background: "#0A1A2F", borderRadius: "10px", padding: "24px 20px", textAlign: "center", zIndex: 3 }}
        >
          <h4 style={{ color: "#fff", fontSize: "18px", fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "12px", marginBottom: "12px", marginTop: 0 }}>
            {item.title}
          </h4>
          <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "14px", lineHeight: 1.6, marginBottom: "20px", marginTop: 0 }}>
            {item.summary}
          </p>
          <span style={{ display: "inline-block", borderRadius: "50px", background: "#2aa0dd", color: "#fff", padding: "10px 32px", fontSize: "14px", fontWeight: 600 }}>
            En savoir plus
          </span>
        </div>
      </a>
    </motion.div>
  );
}

const Actualites = ({
  heading = "Actualites de Jarvis Connect",
  description = "Retrouvez nos actualites, annonces et retours d experience autour des projets.",
  demoUrl = "#",
  items,
}: ActualitesProps) => {
  const [remoteItems, setRemoteItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (items && items.length > 0) {
      setLoading(false);
      return;
    }
    const fetchNews = async () => {
      try {
        if (!supabase) throw new Error("Supabase non configure");
        const { data, error } = await supabase
          .from("news")
          .select("id,title,slug,excerpt,cover_image,video_url")
          .in("status", ["published", "preview"])
          .order("published_at", { ascending: false })
          .limit(6);
        if (error) throw error;
        if (data && data.length > 0) {
          setRemoteItems(data.map((row) => ({
            id: row.id,
            title: row.title,
            summary: row.excerpt ?? "",
            url: `/actus/${row.slug}`,
            image: row.cover_image ?? "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800",
            video_url: row.video_url ?? undefined,
          })));
        }
      } catch (err) {
        console.error("Erreur de recuperation des actus:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, [items]);

  const displayItems = useMemo(() => {
    return items && items.length > 0 ? items : remoteItems.length > 0 ? remoteItems : loading ? [] : fallbackItems;
  }, [items, remoteItems, loading]);

  return (
    <section className="bg-white py-16 text-[#0A1A2F] md:py-20">
      <div className="mx-auto max-w-6xl px-6 lg:px-10">
        <div className="mb-12 text-center">
          <motion.h2
            className="mb-4 text-3xl font-semibold md:text-4xl lg:text-5xl"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
          >
            {heading}
          </motion.h2>
          <motion.p
            className="mx-auto mb-5 max-w-2xl text-sm text-gray-500 md:text-base"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.06 }}
          >
            {description}
          </motion.p>
          <motion.a
            href={demoUrl}
            className="inline-flex items-center gap-1 rounded-full bg-[#0A1A2F] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2aa0dd]"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            Voir toutes les actus
          </motion.a>
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <div className="py-20 text-center">
              <p className="text-gray-400">Chargement des actualites...</p>
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-8">
              {displayItems.map((item, idx) => (
                <div key={item.id} className="w-full sm:w-80">
                  <ServiceCard item={item} idx={idx} />
                </div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export { Actualites };