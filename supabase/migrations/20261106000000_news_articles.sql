-- ============================================================================
-- Vitrine : articles d'actualité
-- ----------------------------------------------------------------------------
-- Les articles affichés sur /actualites et /actualites/<slug>.
--
-- Le contenu est du texte au format Markdown simplifié (intertitres ##/###,
-- paragraphes, listes, citations, images, gras, italique, liens). Le site le
-- convertit lui-même en éléments React : aucun HTML brut n'est jamais injecté,
-- un article ne peut donc pas porter de script.
--
-- Visibilité : un article n'est lu par le site public que s'il est publié ET que
-- sa date de publication est passée — un article peut être programmé.
-- Écriture : aucune politique pour anon/authenticated, seul le rôle de service
-- (console Supabase, SQL) crée ou modifie les articles.
--
-- Idempotente : réexécutable sans effet de bord.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.news_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Partie d'URL : minuscules, chiffres et tirets (ex. « jarvis-rejoint-b2v »).
  slug text NOT NULL UNIQUE
    CONSTRAINT news_articles_slug_check
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 120),
  title text NOT NULL
    CONSTRAINT news_articles_title_check
    CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  -- Chapô : affiché sur la liste et repris comme description pour les moteurs.
  excerpt text
    CONSTRAINT news_articles_excerpt_check
    CHECK (excerpt IS NULL OR char_length(excerpt) <= 500),
  content text NOT NULL,
  -- Rubrique libre (« Partenariat », « Recrutement », « Événement »...).
  category text
    CONSTRAINT news_articles_category_check
    CHECK (category IS NULL OR char_length(btrim(category)) BETWEEN 1 AND 60),
  -- Image de couverture : chemin du dossier public (« /Image/actualites/x.jpg »)
  -- ou URL https.
  cover_image_url text
    CONSTRAINT news_articles_cover_check
    CHECK (cover_image_url IS NULL OR cover_image_url ~ '^(/|https://)'),
  cover_image_alt text,
  author_name text,
  status text NOT NULL DEFAULT 'draft'
    CONSTRAINT news_articles_status_check
    CHECK (status IN ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Un article publié a forcément une date : c'est elle que le site affiche et trie.
  CONSTRAINT news_articles_published_at_check
    CHECK (status <> 'published' OR published_at IS NOT NULL)
);

-- La liste publique : articles publiés, du plus récent au plus ancien.
CREATE INDEX IF NOT EXISTS news_articles_published_idx
  ON public.news_articles (published_at DESC)
  WHERE status = 'published';

-- updated_at tenu par la base, pas par l'appelant.
CREATE OR REPLACE FUNCTION public.set_news_articles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS news_articles_set_updated_at ON public.news_articles;
CREATE TRIGGER news_articles_set_updated_at
  BEFORE UPDATE ON public.news_articles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_news_articles_updated_at();

ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;

-- Lecture publique des seuls articles parus. Pas de politique d'écriture.
DROP POLICY IF EXISTS news_articles_public_read ON public.news_articles;
CREATE POLICY news_articles_public_read
  ON public.news_articles
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published' AND published_at <= now());

GRANT SELECT ON public.news_articles TO anon, authenticated;
