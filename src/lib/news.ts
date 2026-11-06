import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";

/**
 * Lecture des articles d'actualite pour la vitrine publique.
 *
 * Cle ANONYME et non cle de service : la politique RLS de `news_articles` ne laisse voir
 * que les articles publies dont la date est passee. Les filtres ci-dessous disent la meme
 * chose — ils gardent la page juste meme si la politique changeait — mais c'est la base
 * qui garantit qu'un brouillon ne sort jamais.
 */

export const NEWS_SITE_URL = "https://www.jarvis-connect.fr";
export const NEWS_PATH = "/actualites";

export type NewsArticleSummary = {
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  author_name: string | null;
  published_at: string;
};

export type NewsArticle = NewsArticleSummary & {
  content: string;
  updated_at: string;
};

const SUMMARY_COLUMNS =
  "slug,title,excerpt,category,cover_image_url,cover_image_alt,author_name,published_at";

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

let cachedClient: SupabaseClient | null = null;

function getNewsClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Variables NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY manquantes.");
  }

  cachedClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cachedClient;
}

/**
 * Articles parus, du plus recent au plus ancien. `failed` distingue « aucun article » de
 * « base injoignable » : la page ne dit pas la meme chose dans les deux cas.
 */
export async function listPublishedNews(
  limit = 100,
): Promise<{ articles: NewsArticleSummary[]; failed: boolean }> {
  try {
    const { data, error } = await getNewsClient()
      .from("news_articles")
      .select(SUMMARY_COLUMNS)
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[actualites] lecture de la liste impossible :", error.message);
      return { articles: [], failed: true };
    }
    return { articles: (data ?? []) as NewsArticleSummary[], failed: false };
  } catch (error) {
    console.error("[actualites] lecture de la liste impossible :", error);
    return { articles: [], failed: true };
  }
}

/**
 * Un article paru, ou `null`. Memoise pour la duree d'un rendu : `generateMetadata` et la
 * page le demandent tous deux, une seule requete part.
 */
export const getPublishedNews = cache(async (slug: string): Promise<NewsArticle | null> => {
  if (!SLUG_PATTERN.test(slug) || slug.length > 120) return null;

  try {
    const { data, error } = await getNewsClient()
      .from("news_articles")
      .select(`${SUMMARY_COLUMNS},content,updated_at`)
      .eq("slug", slug)
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.error(`[actualites] lecture de « ${slug} » impossible :`, error.message);
      return null;
    }
    return (data as NewsArticle | null) ?? null;
  } catch (error) {
    console.error(`[actualites] lecture de « ${slug} » impossible :`, error);
    return null;
  }
});

/** « 6 novembre 2026 », a l'heure de Paris quel que soit le fuseau du serveur. */
export function formatNewsDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  });
}
