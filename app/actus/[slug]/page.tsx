"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft } from "lucide-react";

import { Header } from "@/components/sections/header";
import { Footer } from "@/components/sections/footer";


function renderMarkdown(content: string) {
  const lines = content.split(/\r?\n/);
  const blocks: Array<JSX.Element> = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (!listItems.length) return;
    const items = listItems.slice();
    listItems = [];
    
    blocks.push(
      <ul key={`list-${blocks.length}`} className="my-4 list-disc space-y-2 pl-6 text-sm text-slate-700">
        {items.map((item, idx) => (
          <li key={`${item}-${idx}`}>{renderInline(item)}</li>
        ))}
      </ul>
    );
  };

  const renderInline = (text: string) => {
    const parts: Array<string | JSX.Element> = [];
    const regex = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      parts.push(
        <strong key={`${match[1]}-${match.index}`} className="font-semibold text-[#0A1A2F]">
          {match[1]}
        </strong>
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return parts;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }
    if (trimmed === "---") {
      flushList();
      blocks.push(<hr key={`hr-${blocks.length}`} className="my-6 border-slate-200" />);
      continue;
    }
    if (trimmed.startsWith("# ")) {
      flushList();
      blocks.push(
        <h1 key={`h1-${blocks.length}`} className="mt-6 text-2xl font-semibold text-[#0A1A2F]">
          {trimmed.replace(/^#\s+/, "")}
        </h1>
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      flushList();
      blocks.push(
        <h2 key={`h2-${blocks.length}`} className="mt-5 text-xl font-semibold text-[#0A1A2F]">
          {trimmed.replace(/^##\s+/, "")}
        </h2>
      );
      continue;
    }
    if (trimmed.startsWith("### ")) {
      flushList();
      blocks.push(
        <h3 key={`h3-${blocks.length}`} className="mt-4 text-lg font-semibold text-[#0A1A2F]">
          {trimmed.replace(/^###\s+/, "")}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith("- ")) {
      
      listItems.push(trimmed.replace(/^-\s+/, ""))
      continue;
    }
    flushList();
    blocks.push(
      <p key={`p-${blocks.length}`} className="mt-3 text-sm leading-7 text-slate-700">
        {renderInline(trimmed)}
      </p>
    );
  }

  flushList();
  return blocks;
}
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
  status: string | null;
  created_at: string;
};

export default function ActuDetailPage() {
  const params = useParams();
  const [item, setItem] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = useMemo(() => Boolean(supabase), []);

  useEffect(() => {
    const fetchItem = async () => {
      const slugParam = Array.isArray(params?.slug) ? params.slug[0] : (params?.slug ?? "");
      const decodedSlug = decodeURIComponent(String(slugParam)).trim();
      if (!decodedSlug) {
        setError("Slug invalide.");
        setLoading(false);
        return;
      }
      if (!supabase) {
        setError("Configuration Supabase manquante.");
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("news")
        .select("id,title,slug,excerpt,content,cover_image,published_at,created_at,status")
        .eq("slug", decodedSlug)
        .eq("status", "published")
        .maybeSingle();

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      if (!data) {
        const { data: draftData, error: draftError } = await supabase
          .from("news")
          .select("id,title,slug,excerpt,content,cover_image,published_at,created_at,status")
          .eq("slug", decodedSlug)
          .maybeSingle();

        if (draftError) {
          setError(draftError.message);
        } else if (draftData?.status && draftData.status !== "published") {
          setError("Article en brouillon.");
        } else {
          setItem(draftData ?? null);
        }
      } else {
        setItem(data);
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
              Configuration Supabase manquante (URL ou clé publique).
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
                <div className="mt-6">{renderMarkdown(item.content)}</div>
              )}
            </article>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
