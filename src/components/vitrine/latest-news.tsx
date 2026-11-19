import { ArrowRight } from "lucide-react";

import { TEXT_LINK, TRACE } from "@/components/auth/auth-styles";
import { NewsCover } from "@/components/vitrine/news/news-cover";
import { SectionTitle } from "@/components/vitrine/section-title";
import VitrineLink from "@/components/vitrine/vitrine-link";
import { NEWS_PATH, formatNewsDate, listPublishedNews, type NewsArticleSummary } from "@/lib/news";
import { cn } from "@/lib/utils";

/** Nombre d'articles montres sur l'accueil ; la suite est sur /actualites. */
const LATEST_COUNT = 3;

function ArrowLink({ href, label, ariaLabel }: { href: string; label: string; ariaLabel?: string }) {
  return (
    <VitrineLink href={href} className={TEXT_LINK} aria-label={ariaLabel}>
      <span>{label}</span>
      <ArrowRight
        aria-hidden
        className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none"
      />
      <span aria-hidden className={TRACE} />
    </VitrineLink>
  );
}

function NewsCard({ article, featured }: { article: NewsArticleSummary; featured: boolean }) {
  const href = `${NEWS_PATH}/${article.slug}`;
  const hasCover = Boolean(article.cover_image_url);

  return (
    <li
      className={cn(
        "min-w-0 border-t border-zinc-900/15 pb-10 pt-6",
        featured && hasCover
          ? "grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-12"
          : "flex flex-col",
      )}
    >
      {hasCover ? (
        // Doublon visuel du titre : hors du parcours clavier et des lecteurs d'ecran.
        <VitrineLink href={href} tabIndex={-1} aria-hidden className={cn("block", !featured && "mb-6")}>
          <NewsCover
            src={article.cover_image_url}
            alt={article.cover_image_alt}
            className="aspect-[16/10] transition-opacity duration-300 hover:opacity-80"
            sizes={featured ? "(min-width: 1024px) 55vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"}
          />
        </VitrineLink>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-900/50">
          {article.category ? (
            <>
              <span className="max-w-full break-words text-zinc-900">{article.category}</span>
              <span aria-hidden>·</span>
            </>
          ) : null}
          <time dateTime={article.published_at}>{formatNewsDate(article.published_at)}</time>
        </div>

        {/*
          Taille AVANT interligne : `cn` (tailwind-merge) retire un `leading-*` suivi d'une
          classe `text-<taille>`, qui porte sa propre hauteur de ligne.
        */}
        <h3
          className={cn(
            featured ? "text-[clamp(1.75rem,3.5vw,3rem)]" : "text-2xl sm:text-3xl",
            "mt-4 break-words font-bold uppercase leading-[0.95] tracking-tight",
          )}
        >
          <VitrineLink href={href} className="transition-colors duration-300 hover:text-zinc-600">
            {article.title}
          </VitrineLink>
        </h3>

        {article.excerpt ? (
          <p
            className={cn(
              featured
                ? "font-quote text-xl leading-snug sm:text-2xl"
                : "line-clamp-3 text-sm leading-relaxed sm:text-base",
              "mt-4 text-zinc-500",
            )}
          >
            {article.excerpt}
          </p>
        ) : null}

        <div className="mt-auto pt-6">
          <ArrowLink href={href} label="Lire l'article" ariaLabel={`Lire l'article : ${article.title}`} />
        </div>
      </div>
    </li>
  );
}

/**
 * Section « Dernieres actualites » de l'accueil, juste avant la FAQ.
 *
 * Fond blanc, comme toutes les sections de l'accueil, dans le registre de la FAQ :
 * accroche en serif, filets fins.
 *
 * Composant serveur : la page qui le monte fixe la frequence de relecture (`revalidate`).
 * Sans article paru — ou base injoignable — la section ne s'affiche pas : un encart vide
 * entre deux sections pleines ferait plus de tort que son absence.
 */
export default async function LatestNews() {
  const { articles } = await listPublishedNews(LATEST_COUNT);
  if (!articles.length) return null;
  return <LatestNewsSection articles={articles} />;
}

/** Rendu seul, sans lecture en base. */
export function LatestNewsSection({ articles }: { articles: NewsArticleSummary[] }) {
  const featured = articles.length === 1;

  return (
    <section
      id="actualites"
      className="relative bg-white px-6 pb-8 pt-24 text-zinc-900 sm:px-12 sm:pb-12 sm:pt-32 lg:pt-40"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
        <SectionTitle eyebrow="nos" title="Actualités" />
        <ArrowLink href={NEWS_PATH} label="Toutes les actualités" />
      </div>

      <ul
        className={cn(
          "mt-16 grid min-w-0 gap-x-12 sm:mt-24",
          !featured && "md:grid-cols-2 lg:grid-cols-3",
        )}
      >
        {articles.map((article) => (
          <NewsCard key={article.slug} article={article} featured={featured} />
        ))}
      </ul>
    </section>
  );
}
