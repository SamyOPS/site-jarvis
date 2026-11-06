import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { KICKER, TEXT_LINK, TRACE } from "@/components/auth/auth-styles";
import Footer from "@/components/vitrine/footer";
import Menu from "@/components/vitrine/menu";
import { ArticleBody } from "@/components/vitrine/news/article-body";
import { NewsCover } from "@/components/vitrine/news/news-cover";
import VitrineLink from "@/components/vitrine/vitrine-link";
import {
  newsFallbackExcerpt,
  newsReadingMinutes,
  parseNewsContent,
  safeNewsImageSrc,
} from "@/features/vitrine/news-content";
import { NEWS_PATH, NEWS_SITE_URL, formatNewsDate, getPublishedNews } from "@/lib/news";

export const revalidate = 60;

type ArticlePageProps = { params: Promise<{ slug: string }> };

/*
  Aucun article pre-genere au build : chacun est rendu a sa premiere visite, puis garde
  en cache une minute (`revalidate`). Un article ajoute en base est donc en ligne sans
  redeploiement.
*/
export function generateStaticParams() {
  return [];
}

/** Adresse absolue d'une image, pour les apercus de partage et les moteurs. */
function absoluteImage(src: string | null) {
  const safe = src ? safeNewsImageSrc(src) : null;
  if (!safe) return undefined;
  return safe.startsWith("/") ? `${NEWS_SITE_URL}${encodeURI(safe)}` : safe;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedNews(slug);
  if (!article) return { title: { absolute: "Article introuvable — Jarvis Connect" } };

  const description = article.excerpt ?? newsFallbackExcerpt(parseNewsContent(article.content));
  const image = absoluteImage(article.cover_image_url);
  const url = `${NEWS_SITE_URL}${NEWS_PATH}/${article.slug}`;

  return {
    title: { absolute: `${article.title} — Jarvis Connect` },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: article.title,
      description,
      siteName: "Jarvis Connect",
      locale: "fr_FR",
      publishedTime: article.published_at,
      modifiedTime: article.updated_at,
      ...(image ? { images: [{ url: image, alt: article.cover_image_alt ?? article.title }] } : {}),
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await getPublishedNews(slug);
  if (!article) notFound();

  const blocks = parseNewsContent(article.content);
  const minutes = newsReadingMinutes(blocks);
  const image = absoluteImage(article.cover_image_url);

  /*
    Donnees structurees : les moteurs y lisent titre, date et auteur de l'article.
    `<` echappe : le JSON est pose dans une balise <script>, un titre contenant
    « </script> » ne doit pas pouvoir la refermer.
  */
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    datePublished: article.published_at,
    dateModified: article.updated_at,
    ...(image ? { image: [image] } : {}),
    author: article.author_name
      ? { "@type": "Person", name: article.author_name }
      : { "@type": "Organization", name: "Jarvis Connect", url: NEWS_SITE_URL },
    publisher: { "@type": "Organization", name: "Jarvis Connect", url: NEWS_SITE_URL },
    mainEntityOfPage: `${NEWS_SITE_URL}${NEWS_PATH}/${article.slug}`,
  }).replace(/</g, "\\u003c");

  return (
    <>
      <main className="font-soft relative min-h-dvh bg-white text-zinc-900">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

        {/* Barre : logo + Contactez nous + burger + panneau */}
        <Menu />

        <div className="px-6 pb-24 pt-32 sm:px-12 sm:pb-32 sm:pt-40">
          <div className="mx-auto w-full max-w-6xl">
            <div className="mb-12 flex flex-wrap items-center gap-3 text-sm sm:mb-16">
              <VitrineLink href={NEWS_PATH} className={TEXT_LINK}>
                <ArrowLeft aria-hidden className="h-4 w-4" />
                <span>Toutes les actualités</span>
                <span aria-hidden className={TRACE} />
              </VitrineLink>
            </div>
          </div>

          <article>
            <header className="mx-auto w-full max-w-3xl">
              <span className={KICKER}>{article.category ?? "Actualité"}</span>
              <h1 className="mt-4 break-words text-[clamp(2rem,5vw,4rem)] font-bold uppercase leading-[0.95] tracking-tight">
                {article.title}
              </h1>
              {article.excerpt ? (
                <p className="mt-8 font-quote text-xl leading-snug text-zinc-500 sm:text-2xl">
                  {article.excerpt}
                </p>
              ) : null}
              <div className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-zinc-900/25 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-900/50">
                <time dateTime={article.published_at} className="text-zinc-900">
                  {formatNewsDate(article.published_at)}
                </time>
                {article.author_name ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>Par {article.author_name}</span>
                  </>
                ) : null}
                <span aria-hidden>·</span>
                <span>{minutes} min de lecture</span>
              </div>
            </header>

            <NewsCover
              src={article.cover_image_url}
              alt={article.cover_image_alt}
              className="mx-auto mt-12 aspect-[16/9] w-full max-w-5xl sm:mt-16"
              sizes="(min-width: 1024px) 1024px, 100vw"
              priority
            />

            <div className="mx-auto mt-12 w-full max-w-3xl sm:mt-16">
              <ArticleBody blocks={blocks} />
            </div>

            <footer className="mx-auto mt-20 w-full max-w-3xl border-t border-zinc-900 pt-8">
              <VitrineLink href={NEWS_PATH} className={TEXT_LINK}>
                <ArrowLeft aria-hidden className="h-4 w-4" />
                <span>Toutes les actualités</span>
                <span aria-hidden className={TRACE} />
              </VitrineLink>
            </footer>
          </article>
        </div>
      </main>

      <Footer variant="light" />
    </>
  );
}
