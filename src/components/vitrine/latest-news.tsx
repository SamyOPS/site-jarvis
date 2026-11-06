import { ArrowRight } from "lucide-react";

import { TRACE } from "@/components/auth/auth-styles";
import { NewsCover } from "@/components/vitrine/news/news-cover";
import VitrineLink from "@/components/vitrine/vitrine-link";
import { NEWS_PATH, formatNewsDate, listPublishedNews, type NewsArticleSummary } from "@/lib/news";
import { cn } from "@/lib/utils";

/** Nombre d'articles montres sur /decouvrir ; la suite est sur /actualites. */
const LATEST_COUNT = 3;

// Lien texte sur fond noir : celui de `auth-styles` est a l'encre noire.
const LINK_ON_DARK =
  "group relative inline-flex items-center gap-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white";

function ArrowLink({ href, label, ariaLabel }: { href: string; label: string; ariaLabel?: string }) {
  return (
    <VitrineLink href={href} className={LINK_ON_DARK} aria-label={ariaLabel}>
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
        "min-w-0 border-t border-white/15 pb-10 pt-6",
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
            className="aspect-[16/10] bg-white/5 transition-opacity duration-300 hover:opacity-80"
            sizes={featured ? "(min-width: 1024px) 55vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"}
          />
        </VitrineLink>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
          {article.category ? (
            <>
              <span className="max-w-full break-words text-white">{article.category}</span>
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
          <VitrineLink href={href} className="transition-colors duration-300 hover:text-white/60">
            {article.title}
          </VitrineLink>
        </h3>

        {article.excerpt ? (
          <p
            className={cn(
              featured
                ? "font-quote text-xl leading-snug sm:text-2xl"
                : "line-clamp-3 text-sm leading-relaxed sm:text-base",
              "mt-4 text-white/55",
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
 * Section « Dernieres actualites » de /decouvrir, juste avant la FAQ.
 *
 * Fond noir comme ses deux voisines (la mosaique des offres et la FAQ), dans le registre
 * de la FAQ : accroche en serif, filets fins. `data-nav-dark` garde la barre en blanc.
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
      data-nav-dark
      className="relative bg-black px-6 pb-8 pt-24 text-white sm:px-12 sm:pb-12 sm:pt-32 lg:pt-40"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-4">
        <h2 className="font-quote text-xl leading-snug sm:text-2xl lg:text-3xl 2xl:text-4xl">
          Dernières actualités
        </h2>
        <ArrowLink href={NEWS_PATH} label="Toutes les actualités" />
      </div>

      <ul
        className={cn(
          "mt-10 grid min-w-0 gap-x-12 sm:mt-14",
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
