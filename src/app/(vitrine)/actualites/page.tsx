import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";

import { KICKER, TEXT_LINK, TRACE } from "@/components/auth/auth-styles";
import Footer from "@/components/vitrine/footer";
import Menu from "@/components/vitrine/menu";
import { NewsCover } from "@/components/vitrine/news/news-cover";
import VitrineLink from "@/components/vitrine/vitrine-link";
import {
  NEWS_PATH,
  formatNewsDate,
  listPublishedNews,
  type NewsArticleSummary,
} from "@/lib/news";

/*
  Une minute de cache : un article ajoute en base apparait au plus une minute apres,
  sans redeploiement, et la base n'est lue qu'une fois par minute au plus.
*/
export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: "Actualités — Jarvis Connect" },
  description:
    "Les actualités de Jarvis Connect : partenariats, recrutements, événements et vie de l'entreprise.",
};

const META = "text-xs font-semibold uppercase tracking-[0.2em] text-zinc-900/50";

function ArticleMeta({ article }: { article: NewsArticleSummary }) {
  return (
    <div className={`flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 ${META}`}>
      {article.category ? (
        <>
          <span className="max-w-full break-words text-zinc-900">{article.category}</span>
          <span aria-hidden>·</span>
        </>
      ) : null}
      <time dateTime={article.published_at}>{formatNewsDate(article.published_at)}</time>
    </div>
  );
}

function ReadLink({ href, title }: { href: string; title: string }) {
  return (
    <VitrineLink href={href} className={TEXT_LINK} aria-label={`Lire l'article : ${title}`}>
      <span>Lire l&apos;article</span>
      <ArrowRight
        aria-hidden
        className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none"
      />
      <span aria-hidden className={TRACE} />
    </VitrineLink>
  );
}

export default async function ActualitesPage() {
  const { articles, failed } = await listPublishedNews();
  const [featured, ...others] = articles;

  return (
    <>
      <main className="font-soft relative min-h-dvh bg-white text-zinc-900">
        {/* Barre : logo + Contactez nous + burger + panneau */}
        <Menu />

        {/* `pt-32 sm:pt-40` : la barre est fixe et ne reserve aucune place. */}
        <div className="px-6 pb-24 pt-32 sm:px-12 sm:pb-32 sm:pt-40">
          <div className="mx-auto w-full max-w-6xl">
            <header className="mb-16 max-w-3xl sm:mb-24">
              <h1>
                <span className={KICKER}>Le journal</span>
                <span className="mt-4 block text-[clamp(2.5rem,9vw,7rem)] font-bold uppercase leading-[0.95] tracking-tight">
                  Actualités
                </span>
              </h1>
              <p className="mt-8 max-w-xl font-quote text-xl leading-snug text-zinc-500 sm:text-2xl">
                Partenariats, recrutements, événements : la vie de Jarvis Connect.
              </p>
            </header>

            {featured ? (
              <>
                {/* A la une : le plus recent, en grand. */}
                <article
                  className={
                    featured.cover_image_url
                      ? "grid min-w-0 gap-8 border-t border-zinc-900 pt-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-12"
                      : "min-w-0 border-t border-zinc-900 pt-8"
                  }
                >
                  {featured.cover_image_url ? (
                    <VitrineLink
                      href={`${NEWS_PATH}/${featured.slug}`}
                      tabIndex={-1}
                      aria-hidden
                      className="block"
                    >
                      <NewsCover
                        src={featured.cover_image_url}
                        alt={featured.cover_image_alt}
                        className="aspect-[16/10]"
                        sizes="(min-width: 1024px) 640px, 100vw"
                        priority
                      />
                    </VitrineLink>
                  ) : null}

                  <div className="flex min-w-0 max-w-3xl flex-col">
                    <ArticleMeta article={featured} />
                    <h2 className="mt-4 break-words text-[clamp(1.75rem,4vw,3.25rem)] font-bold uppercase leading-[0.95] tracking-tight">
                      <VitrineLink href={`${NEWS_PATH}/${featured.slug}`} className="hover:text-zinc-600">
                        {featured.title}
                      </VitrineLink>
                    </h2>
                    {featured.excerpt ? (
                      <p className="mt-6 font-quote text-xl leading-snug text-zinc-500 sm:text-2xl">
                        {featured.excerpt}
                      </p>
                    ) : null}
                    <div className="mt-8">
                      <ReadLink href={`${NEWS_PATH}/${featured.slug}`} title={featured.title} />
                    </div>
                  </div>
                </article>

                {others.length ? (
                  <div className="mt-20 grid min-w-0 gap-x-12 sm:mt-28 md:grid-cols-2 xl:grid-cols-3">
                    {others.map((article) => {
                      const href = `${NEWS_PATH}/${article.slug}`;
                      return (
                        <article
                          key={article.slug}
                          className="flex min-w-0 flex-col border-t border-zinc-900 pb-12 pt-6"
                        >
                          {article.cover_image_url ? (
                            <VitrineLink href={href} tabIndex={-1} aria-hidden className="mb-6 block">
                              <NewsCover
                                src={article.cover_image_url}
                                alt={article.cover_image_alt}
                                className="aspect-[16/10]"
                                sizes="(min-width: 1280px) 360px, (min-width: 768px) 50vw, 100vw"
                              />
                            </VitrineLink>
                          ) : null}
                          <ArticleMeta article={article} />
                          <h2 className="mt-4 break-words text-2xl font-bold uppercase leading-[0.95] tracking-tight sm:text-3xl">
                            <VitrineLink href={href} className="hover:text-zinc-600">
                              {article.title}
                            </VitrineLink>
                          </h2>
                          {article.excerpt ? (
                            <p className="mt-4 line-clamp-3 flex-1 leading-relaxed text-zinc-500">
                              {article.excerpt}
                            </p>
                          ) : (
                            <div className="flex-1" />
                          )}
                          <div className="mt-6">
                            <ReadLink href={href} title={article.title} />
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="max-w-3xl border-t border-zinc-900/25 pt-6 font-quote text-xl italic leading-snug text-zinc-500">
                {failed
                  ? "Les actualités sont momentanément indisponibles. Revenez dans quelques instants."
                  : "Aucune actualité pour le moment. Revenez bientôt !"}
              </p>
            )}
          </div>
        </div>
      </main>

      <Footer variant="light" />
    </>
  );
}
