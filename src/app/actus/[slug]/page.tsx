"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

import { browserSupabase } from "@/lib/supabase-browser";
import { HomeHeader } from "@/components/sections/home-header";
import { Footer } from "@/components/sections/footer";

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

type MarkdownImage = {
  alt: string;
  src: string;
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
      </strong>,
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function extractMarkdownImages(content: string | null | undefined) {
  if (!content) return [] as MarkdownImage[];

  return content
    .split(/\r?\n/)
    .map((line) => line.trim().match(/^!\[(.*?)\]\((.*?)\)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => ({
      alt: match[1] || "Image",
      src: match[2],
    }));
}

function renderEditorialMarkdown(
  content: string,
  options?: {
    skipImageIndexes?: number[];
  },
) {
  const lines = content.split(/\r?\n/);
  const blocks: Array<React.ReactNode> = [];
  let listItems: string[] = [];
  let imageIndex = 0;

  const flushList = () => {
    if (!listItems.length) return;

    const items = listItems.slice();
    listItems = [];

    blocks.push(
      <ul
        key={`list-${blocks.length}`}
        className="space-y-3 pl-6 text-lg leading-9 text-slate-700 marker:text-sky-500 md:text-[1.22rem] md:leading-10"
      >
        {items.map((item, idx) => (
          <li key={`${item}-${idx}`}>{renderInline(item)}</li>
        ))}
      </ul>,
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
      const currentImageIndex = imageIndex;
      imageIndex += 1;
      if (options?.skipImageIndexes?.includes(currentImageIndex)) {
        continue;
      }

      blocks.push(
        <figure
          key={`img-${blocks.length}`}
          className="my-10 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white p-3 shadow-[0_24px_80px_rgba(15,23,42,0.08)]"
        >
          <div className="relative aspect-[16/10] overflow-hidden rounded-[1.5rem] bg-slate-100">
            {/* Dynamic article images can come from varied hosts, so a native img is safer here. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageMatch[2]}
              alt={imageMatch[1] || "Image"}
              className="h-full w-full object-cover"
            />
          </div>
          {imageMatch[1] ? (
            <figcaption className="px-2 pt-4 text-center text-sm text-slate-500">
              {imageMatch[1]}
            </figcaption>
          ) : null}
        </figure>,
      );
      continue;
    }

    if (trimmed === "---") {
      flushList();
      blocks.push(
        <div key={`divider-${blocks.length}`} className="my-10 flex justify-center">
          <div className="h-px w-24 bg-slate-200" />
        </div>,
      );
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushList();
      blocks.push(
        <h1
          key={`h1-${blocks.length}`}
          className="mt-10 text-4xl font-semibold tracking-[-0.04em] text-slate-950 md:text-6xl"
        >
          {trimmed.replace(/^#\s+/, "")}
        </h1>,
      );
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushList();
      blocks.push(
        <h2
          key={`h2-${blocks.length}`}
          className="mt-12 text-3xl font-semibold tracking-[-0.03em] text-slate-950 md:text-5xl"
        >
          {trimmed.replace(/^##\s+/, "")}
        </h2>,
      );
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushList();
      blocks.push(
        <h3
          key={`h3-${blocks.length}`}
          className="mt-10 text-2xl font-semibold tracking-[-0.02em] text-slate-900 md:text-3xl"
        >
          {trimmed.replace(/^###\s+/, "")}
        </h3>,
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
        className="text-xl leading-10 text-slate-700 md:text-[1.32rem] md:leading-[2.7rem]"
      >
        {renderInline(trimmed)}
      </p>,
    );
  }

  flushList();
  return blocks;
}

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
        const { data: draftData, error: draftError } = await supabase
          .from("news")
          .select("id,title,slug,excerpt,content,cover_image,video_url,pdf_url,published_at,created_at,status")
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

    void fetchItem();
  }, [params?.slug]);

  const publishedLabel = item
    ? new Date(item.published_at ?? item.created_at).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const articleSlug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug ?? "";
  const normalizedArticleKey = `${item?.title ?? ""} ${articleSlug}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const shouldSwapHeroMedia =
    normalizedArticleKey.includes("partenariat") && normalizedArticleKey.includes("cyber");
  const shouldHideVideo =
    normalizedArticleKey.includes("partenariat") && normalizedArticleKey.includes("cyber");
  const markdownImages = useMemo(() => extractMarkdownImages(item?.content), [item?.content]);
  const heroReplacementImage = shouldSwapHeroMedia ? markdownImages[1] ?? null : null;
  const forcedCyberHeroImage =
    shouldSwapHeroMedia
      ? "https://media.istockphoto.com/id/2174551157/fr/photo/cyber-security-data-protection-business-technology-privacy-concept.webp?a=1&b=1&s=612x612&w=0&k=20&c=oCdlJRNOwEmT-dVQz6zq_CuQ6HXzGnTB24Bi2IK3pjM="
      : null;
  const heroImageSrc = forcedCyberHeroImage ?? heroReplacementImage?.src ?? item?.cover_image ?? null;
  const hiddenMarkdownImageIndexes = heroReplacementImage ? [1] : [];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f4f7fb] text-slate-950">
      <div className="absolute inset-x-0 top-0 -z-10 h-[42rem] bg-[radial-gradient(circle_at_top,rgba(42,160,221,0.18),rgba(255,255,255,0.96)_28%,rgba(244,247,251,0.88)_58%,rgba(244,247,251,0)_100%)]" />
      <div className="absolute left-[-10rem] top-40 -z-10 h-72 w-72 rounded-full bg-sky-200/30 blur-3xl" />
      <div className="absolute right-[-8rem] top-64 -z-10 h-80 w-80 rounded-full bg-cyan-100/40 blur-3xl" />

      <HomeHeader />

      <main>
        <section className="px-6 pb-8 pt-8 md:px-10 lg:px-12">
          <div className="mx-auto max-w-6xl">
            <Link
              href="/actus"
              className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-4 py-2 text-sm text-slate-700 shadow-[0_10px_40px_rgba(15,23,42,0.06)] backdrop-blur transition hover:bg-white"
            >
              <ArrowLeft className="size-4" />
              Retour aux actus
            </Link>
          </div>
        </section>

        {!isConfigured && (
          <section className="px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-6xl rounded-[2rem] border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
              Configuration Supabase manquante (URL ou cle publique).
            </div>
          </section>
        )}

        {loading && (
          <section className="px-6 py-20 text-center md:px-10 lg:px-12">
            <p className="text-sm text-slate-500">Chargement de l&apos;article...</p>
          </section>
        )}

        {!loading && error && (
          <section className="px-6 py-20 md:px-10 lg:px-12">
            <div className="mx-auto max-w-3xl rounded-[2rem] border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-700">
              {error}
            </div>
          </section>
        )}

        {!loading && !error && !item && (
          <section className="px-6 py-20 md:px-10 lg:px-12">
            <div className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white/80 px-6 py-6 text-sm text-slate-600 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
              Article introuvable ou non publie.
            </div>
          </section>
        )}

        {!loading && item && (
          <>
            <section className="px-6 pb-10 pt-6 md:px-10 lg:px-12">
              <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.28em] text-sky-700/70">
                    Actualite Jarvis Connect
                  </p>
                  <h1 className="mt-4 max-w-4xl font-display text-5xl font-semibold tracking-[-0.06em] text-slate-950 md:text-7xl md:leading-[0.95]">
                    {item.title}
                  </h1>
                  {item.excerpt && (
                    <p className="mt-6 max-w-2xl text-xl leading-9 text-slate-600 md:text-[1.7rem] md:leading-[2.9rem]">
                      {item.excerpt}
                    </p>
                  )}
                </div>

                <div className="rounded-[2rem] border border-white/80 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Publication</p>
                      <p className="mt-2 text-lg font-medium text-slate-900">{publishedLabel}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Format</p>
                      <p className="mt-2 text-lg font-medium text-slate-900">
                        {item.video_url || item.pdf_url ? "Article enrichi" : "Article"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <a
                      href={`#article-${item.id}`}
                      className="inline-flex items-center gap-2 rounded-full bg-[#0A1A2F] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#102746]"
                    >
                      Lire l&apos;article
                      <ArrowUpRight className="size-4" />
                    </a>
                    <Link
                      href={`/actus/${articleSlug}/apple`}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300"
                    >
                      Voir la variante design
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            <section className="px-6 pb-8 md:px-10 lg:px-12">
              <div className="mx-auto max-w-6xl">
                <div className="relative overflow-hidden rounded-[2.25rem] border border-white/70 bg-white/70 p-3 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
                  <div className="absolute inset-x-12 top-0 h-24 rounded-full bg-white/70 blur-3xl" />
                  <div className="relative aspect-[16/9] overflow-hidden rounded-[1.75rem] bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_35%,#dbeafe_100%)]">
                    {shouldSwapHeroMedia && item.video_url && !shouldHideVideo ? (
                      <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.82),rgba(219,234,254,0.45),rgba(191,219,254,0.18))] p-6">
                        <video
                          src={item.video_url}
                          controls
                          className="h-full max-h-full w-auto max-w-full rounded-[1.5rem] object-contain shadow-[0_24px_60px_rgba(15,23,42,0.28)]"
                        />
                      </div>
                    ) : heroImageSrc ? (
                      heroReplacementImage || forcedCyberHeroImage ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={heroImageSrc}
                            alt={heroReplacementImage?.alt || item.title}
                            className="h-full w-full object-cover"
                          />
                        </>
                      ) : (
                        <Image
                          src={heroImageSrc}
                          alt={item.title}
                          fill
                          sizes="(max-width: 1024px) 100vw, 1200px"
                          className="object-cover"
                          priority
                        />
                      )
                    ) : (
                      <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,#ffffff,rgba(226,232,240,0.9),rgba(203,213,225,0.8))]">
                        <div className="text-center">
                          <p className="text-xs uppercase tracking-[0.35em] text-sky-700/60">
                            Jarvis Connect
                          </p>
                          <p className="mt-3 font-display text-4xl font-semibold tracking-[-0.05em] text-slate-900 md:text-6xl">
                            Lecture editoriale
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section id={`article-${item.id}`} className="px-6 pb-36 pt-8 md:px-10 md:pb-44 lg:px-12 lg:pb-52">
              <div className="mx-auto max-w-6xl">
                <div className="space-y-8">
                  <article className="overflow-hidden rounded-[2.5rem] border border-white/80 bg-white/85 px-6 py-8 shadow-[0_30px_100px_rgba(15,23,42,0.08)] backdrop-blur md:px-10 md:py-12">
                    <div className="mx-auto max-w-5xl space-y-8 pb-8 md:space-y-10 md:pb-14">
                      {item.content ? (
                        renderEditorialMarkdown(item.content, {
                          skipImageIndexes: hiddenMarkdownImageIndexes,
                        })
                      ) : (
                        <p className="text-xl leading-10 text-slate-700 md:text-[1.32rem] md:leading-[2.7rem]">
                          Aucun contenu editorial n&apos;est disponible pour cet article.
                        </p>
                      )}
                    </div>
                  </article>

                  {item.video_url && !shouldSwapHeroMedia && !shouldHideVideo && (
                    <section
                      id="media"
                      className="overflow-hidden rounded-[2.5rem] border border-white/80 bg-white/85 p-6 shadow-[0_30px_100px_rgba(15,23,42,0.08)] backdrop-blur md:p-8"
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

                  {shouldSwapHeroMedia && heroImageSrc && (
                    <section
                      id="media"
                      className="overflow-hidden rounded-[2.5rem] border border-white/80 bg-white/85 p-6 shadow-[0_30px_100px_rgba(15,23,42,0.08)] backdrop-blur md:p-8"
                    >
                      <div className="mb-6 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Media</p>
                          <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                            Image principale
                          </h2>
                        </div>
                      </div>
                      <div className="relative aspect-[16/9] overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50">
                        {heroReplacementImage || forcedCyberHeroImage ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={heroImageSrc}
                              alt={heroReplacementImage?.alt || item.title}
                              className="h-full w-full object-cover"
                            />
                          </>
                        ) : (
                          <Image
                            src={heroImageSrc}
                            alt={item.title}
                            fill
                            sizes="(max-width: 1024px) 100vw, 1200px"
                            className="object-cover"
                          />
                        )}
                      </div>
                    </section>
                  )}

                  {item.pdf_url && (
                    <section
                      id="documents"
                      className="overflow-hidden rounded-[2.5rem] border border-white/80 bg-white/85 p-6 shadow-[0_30px_100px_rgba(15,23,42,0.08)] backdrop-blur md:p-8"
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
