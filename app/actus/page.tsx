"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { ArrowRight } from "lucide-react";

import { Header } from "@/components/sections/header";
import { Footer } from "@/components/sections/footer";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

type NewsItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image: string | null;
  published_at: string | null;
  created_at: string;
};

export default function ActusPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = useMemo(() => Boolean(supabase), []);

  useEffect(() => {
    const fetchNews = async () => {
      if (!supabase) {
        setError("Configuration Supabase manquante.");
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("news")
        .select("id,title,slug,excerpt,cover_image,published_at,created_at")
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setItems(data ?? []);
      }
      setLoading(false);
    };

    fetchNews();
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#0A1A2F]">
      <Header />
      <main className="particle-readability">
        <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-20">
          <div className="mb-8 space-y-3">
            <p className="text-sm uppercase tracking-[0.2em] text-[#000080]">Actualit?s</p>
            <h1 className="text-3xl font-semibold md:text-4xl">Toutes les actus</h1>
            <p className="max-w-2xl text-sm text-slate-600">
              Analyses, projets, annonces et points de vue de Jarvis Connect.
            </p>
          </div>

          {!isConfigured && (
            <div className="rounded-none border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Configuration Supabase manquante (URL ou cl? publique).
            </div>
          )}

          {loading && (
            <div className="text-sm text-slate-500">Chargement des actualit?s...</div>
          )}

          {!loading && error && (
            <div className="rounded-none border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="rounded-none border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
              Aucune actualit? publi?e pour le moment.
            </div>
          )}

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <a
                key={item.id}
                href={`/actus/${item.slug}`}
                className="group flex h-full flex-col border border-slate-200 bg-white transition hover:border-[#000080]"
              >
                <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                  {item.cover_image ? (
                    <img
                      src={item.cover_image}
                      alt={item.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
                      Image ? venir
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    {item.published_at
                      ? new Date(item.published_at).toLocaleDateString("fr-FR")
                      : new Date(item.created_at).toLocaleDateString("fr-FR")}
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-[#0A1A2F]">
                    {item.title}
                  </h2>
                  {item.excerpt && (
                    <p className="mt-2 text-sm text-slate-600 line-clamp-3">{item.excerpt}</p>
                  )}
                  <span className="mt-4 inline-flex items-center text-sm font-medium text-[#000080]">
                    Lire l'article
                    <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
