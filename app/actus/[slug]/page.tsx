"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft } from "lucide-react";

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
  content: string | null;
  cover_image: string | null;
  published_at: string | null;
  created_at: string;
};

export default function ActuDetailPage({ params }: { params: { slug: string } }) {
  const [item, setItem] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = useMemo(() => Boolean(supabase), []);

  useEffect(() => {
    const fetchItem = async () => {
      if (!supabase) {
        setError("Configuration Supabase manquante.");
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("news")
        .select("id,title,slug,excerpt,content,cover_image,published_at,created_at")
        .eq("slug", params.slug)
        .eq("status", "published")
        .maybeSingle();

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setItem(data ?? null);
      }
      setLoading(false);
    };

    fetchItem();
  }, [params.slug]);

  return (
    <div className="min-h-screen bg-white text-[#0A1A2F]">
      <Header />
      <main className="particle-readability">
        <div className="mx-auto max-w-3xl px-6 py-16 lg:px-8 lg:py-20">
          <a href="/actus" className="inline-flex items-center text-sm text-[#000080]">
            <ArrowLeft className="mr-2 size-4" />
            Retour aux actus
          </a>

          {!isConfigured && (
            <div className="mt-6 rounded-none border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Configuration Supabase manquante (URL ou cl? publique).
            </div>
          )}

          {loading && (
            <div className="mt-6 text-sm text-slate-500">Chargement de l'article...</div>
          )}

          {!loading && error && (
            <div className="mt-6 rounded-none border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && !item && (
            <div className="mt-6 rounded-none border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
              Article introuvable ou non publi?.
            </div>
          )}

          {item && (
            <article className="mt-6">
              {item.cover_image && (
                <div className="mb-6 aspect-[16/9] overflow-hidden border border-slate-200 bg-slate-100">
                  <img
                    src={item.cover_image}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                {item.published_at
                  ? new Date(item.published_at).toLocaleDateString("fr-FR")
                  : new Date(item.created_at).toLocaleDateString("fr-FR")}
              </p>
              <h1 className="mt-2 text-3xl font-semibold md:text-4xl">{item.title}</h1>
              {item.excerpt && (
                <p className="mt-4 text-base text-slate-600">{item.excerpt}</p>
              )}
              {item.content && (
                <div className="mt-6 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {item.content}
                </div>
              )}
            </article>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
