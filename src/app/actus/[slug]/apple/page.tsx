"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowUpRight, FileText, PlayCircle } from "lucide-react";
import { HomeHeader } from "@/components/sections/home-header";
import { Footer } from "@/components/sections/footer";
import { browserSupabase } from "@/lib/supabase-browser";

const supabase = browserSupabase;

type NewsItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_image: string | null;
  video_url: string | null;
  pdf_url: string | null;
  published_at: string | null;
  status: string | null;
  created_at: string;
};

function renderInline(text: string) {
  const parts: Array<string | React.ReactNode> = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    parts.push(
      <strong key={`${match[1]}-${match.index}`} className="font-semibold text-slate-950">
        {match[1]}
      </strong>
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function renderEditorialMarkdown(content: string) {
  const lines = content.split(/\r?\n/);
  const blocks: Array<React.ReactNode> = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (!listItems.length) return;

    const items = listItems.slice();
    listItems = [];

    blocks.push(
      <ul
        key={`list-${blocks.length}`}
        className="space-y-3 pl-6 text-base leading-8 text-slate-700 marker:text-slate-400 md:text-lg"
      >
        {items.map((item, idx) => (
          <li key={`${item}-${idx}`}>{renderInline(item)}</li>
        ))}
      </ul>
    );
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    const imageMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imageMatch) {
      flushList();
      blocks.push(
        <div
          key={`img-${blocks.length}`}
          className="my-10 overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 p-3 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur"
        >
          <div className="relative aspect-[16/10] overflow-hidden rounded-[1.5rem]">
            <Image
              src={imageMatch[2]}
              alt={imageMatch[1] || "Image"}
              fill
              sizes="(max-width: 1024px) 100vw, 900px"
              className="object-cover"
            />
          </div>
        </div>
      );
      continue;
    }

    if (trimmed === "---") {
      flushList();
      blocks.push(
        <div key={`divider-${blocks.length}`} className="my-10 flex justify-center">
          <div className="h-px w-24 bg-slate-200" />
        </div>
      );
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushList();
      blocks.push(
        <h1
          key={`h1-${blocks.length}`}
          className="mt-10 text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl"
        >
          {trimmed.replace(/^#\s+/, "")}
        </h1>
      );
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushList();
      blocks.push(
        <h2
          key={`h2-${blocks.length}`}
          className="mt-12 text-2xl font-semibold tracking-[-0.03em] text-slate-950 md:text-4xl"
        >
          {trimmed.replace(/^##\s+/, "")}
        </h2>
      );
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushList();
      blocks.push(
        <h3
          key={`h3-${blocks.length}`}
          className="mt-10 text-xl font-semibold tracking-[-0.02em] text-slate-900 md:text-2xl"
        >
          {trimmed.replace(/^###\s+/, "")}
        </h3>
      );
      continue;
    }

    if (trimmed.startsWith("- ")) {
      listItems.push(trimmed.replace(/^-\s+/, ""));
      continue;
    }

    flushList();
    blocks.push(
      <p
        key={`p-${blocks.length}`}
        className="text-base leading-8 text-slate-700 md:text-[1.15rem] md:leading-9"
      >
        {renderInline(trimmed)}
      </p>
    );
  }

  flushList();
  return blocks;
}

export default function AppleArticleVariantPage() {
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
        .select("id,title,slug,excerpt,content,cover_image,video_url,pdf_url,published_at,created_at,status")
        .eq("slug", decodedSlug)
        .eq("status", "published")
        .maybeSingle();

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      if (!data) {
        setError("Article introuvable ou non publié.");
        setLoading(false);
        return;
      }

      setItem(data);
      setLoading(false);
    };

    fetchItem();
  }, [params?.slug]);

  const publishedLabel = item
    ? new Date(item.published_at ?? item.created_at).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-slate-950">
      <div className="absolute inset-x-0 top-0 -z-10 h-[38rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),rgba(245,245,247,0.8)_45%,rgba(229,231,235,0.25)_72%,rgba(245,245,247,0)_100%)]" />
      <HomeHeader />

      <main>
        <section className="px-6 pb-8 pt-8 md:px-10 lg:px-12">
          <div className="mx-auto max-w-6xl">
            <Link
              href={`/actus/${Array.isArray(params?.slug) ? params.slug[0] : params?.slug ?? ""}`}
              className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-4 py-2 text-sm text-slate-700 shadow-[0_10px_40px_rgba(15,23,42,0.06)] backdrop-blur transition hover:bg-white"
            >
              <ArrowLeft className="size-4" />
              Version actuelle de l&apos;article
            </Link>
          </div>
        </section>

        {!isConfigured && (
          <section className="px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-6xl rounded-[2rem] border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
              Configuration Supabase manquante (URL ou clé publique).
            </div>
          </section>
        )}

        {loading && (
          <section className="px-6 py-20 text-center md:px-10 lg:px-12">
            <p className="text-sm text-slate-500">Chargement de la version redesignée...</p>
          </section>
        )}

        {!loading && error && (
          <section className="px-6 py-20 md:px-10 lg:px-12">
            <div className="mx-auto max-w-3xl rounded-[2rem] border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700">
              {error}
            </div>
          </section>
        )}

        {!loading && item && (
          <>
            <section className="px-6 pb-10 pt-6 md:px-10 lg:px-12">
              <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-500">
                    Actualite / Vision editoriale
                  </p>
                  <h1 className="mt-4 max-w-4xl font-display text-5xl font-semibold tracking-[-0.06em] text-slate-950 md:text-7xl md:leading-[0.95]">
                    {item.title}
                  </h1>
                  {item.excerpt && (
                    <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 md:text-2xl md:leading-10">
                      {item.excerpt}
                    </p>
                  )}
                </div>

                <div className="rounded-[2rem] border border-white/80 bg-white/70 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Publication</p>
                      <p className="mt-2 text-lg font-medium text-slate-900">{publishedLabel}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Format</p>
                      <p className="mt-2 text-lg font-medium text-slate-900">Article premium</p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href="/actus"
                      className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                      Toutes les actualites
                      <ArrowUpRight className="size-4" />
                    </Link>
                    <a
                      href={`#article-${item.id}`}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300"
                    >
                      Lire l&apos;article
                    </a>
                  </div>
                </div>
              </div>
            </section>

            <section className="px-6 pb-8 md:px-10 lg:px-12">
              <div className="mx-auto max-w-6xl">
                <div className="relative overflow-hidden rounded-[2.25rem] border border-white/70 bg-white/70 p-3 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
                  <div className="absolute inset-x-12 top-0 h-24 rounded-full bg-white/70 blur-3xl" />
                  <div className="relative aspect-[16/9] overflow-hidden rounded-[1.75rem] bg-[linear-gradient(135deg,#eef2ff_0%,#ffffff_35%,#e2e8f0_100%)]">
                    {item.cover_image ? (
                      <Image
                        src={item.cover_image}
                        alt={item.title}
                        fill
                        sizes="(max-width: 1024px) 100vw, 1200px"
                        className="object-cover"
                        priority
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,#ffffff,rgba(226,232,240,0.9),rgba(203,213,225,0.8))]">
                        <div className="text-center">
                          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Jarvis Connect</p>
                          <p className="mt-3 font-display text-4xl font-semibold tracking-[-0.05em] text-slate-900 md:text-6xl">
                            Cybersecurite
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section id={`article-${item.id}`} className="px-6 pb-24 pt-8 md:px-10 lg:px-12">
              <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[240px_minmax(0,1fr)]">
                <aside className="lg:sticky lg:top-24 lg:self-start">
                  <div className="rounded-[2rem] border border-white/80 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">A retenir</p>
                    <p className="mt-4 text-sm leading-7 text-slate-600">
                      Une lecture plus aeree, plus editoriale et plus premium, pensee pour mettre
                      l&apos;article au premier plan.
                    </p>

                    <div className="mt-6 space-y-3">
                      {item.video_url && (
                        <a
                          href="#media"
                          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                        >
                          <PlayCircle className="size-4" />
                          Video incluse
                        </a>
                      )}
                      {item.pdf_url && (
                        <a
                          href="#documents"
                          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                        >
                          <FileText className="size-4" />
                          PDF associe
                        </a>
                      )}
                    </div>
                  </div>
                </aside>

                <div className="space-y-8">
                  <article className="overflow-hidden rounded-[2.5rem] border border-white/80 bg-white/80 px-6 py-8 shadow-[0_30px_100px_rgba(15,23,42,0.08)] backdrop-blur md:px-10 md:py-12">
                    <div className="mx-auto max-w-3xl space-y-6">
                      {item.content ? (
                        renderEditorialMarkdown(item.content)
                      ) : (
                        <p className="text-base leading-8 text-slate-700 md:text-[1.15rem] md:leading-9">
                          Aucun contenu editorial n&apos;est disponible pour cet article.
                        </p>
                      )}
                    </div>
                  </article>

                  {item.video_url && (
                    <section
                      id="media"
                      className="overflow-hidden rounded-[2.5rem] border border-white/80 bg-white/80 p-6 shadow-[0_30px_100px_rgba(15,23,42,0.08)] backdrop-blur md:p-8"
                    >
                      <div className="mb-6 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Media</p>
                          <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                            Video integree
                          </h2>
                        </div>
                      </div>
                      <div className="overflow-hidden rounded-[2rem] bg-slate-950">
                        <video src={item.video_url} controls className="w-full" />
                      </div>
                    </section>
                  )}

                  {item.pdf_url && (
                    <section
                      id="documents"
                      className="overflow-hidden rounded-[2.5rem] border border-white/80 bg-white/80 p-6 shadow-[0_30px_100px_rgba(15,23,42,0.08)] backdrop-blur md:p-8"
                    >
                      <div className="mb-6 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Document</p>
                          <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                            PDF associe
                          </h2>
                        </div>
                        <a
                          href={item.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                        >
                          Ouvrir
                          <ArrowUpRight className="size-4" />
                        </a>
                      </div>

                      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50">
                        <iframe title="PDF" src={item.pdf_url} className="h-[75vh] w-full" />
                      </div>
                    </section>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
