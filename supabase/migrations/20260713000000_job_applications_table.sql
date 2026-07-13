-- Candidatures publiques envoyées depuis les pages "offres d'emploi" du site.
-- À exécuter dans le projet Supabase CV (SUPABASE_CV_URL).
--
-- Table dédiée, volontairement distincte de public.applications (qui sert au
-- suivi interne RH avec cv_id / user_id NOT NULL et un autre workflow de statut).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid,
  job_title text,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  email text NOT NULL,
  phone text,
  cv_path text,
  cv_filename text,
  status text NOT NULL DEFAULT 'submitted',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_applications_job_id_idx ON public.job_applications (job_id);
CREATE INDEX IF NOT EXISTS job_applications_created_at_idx ON public.job_applications (created_at DESC);

-- Données personnelles des candidats : seul le service role (utilisé par la
-- route API) doit y accéder. RLS activé sans policy => anon/authenticated
-- n'ont aucun accès, le service role continue de bypasser RLS.
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Bucket privé pour les fichiers CV.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'application-documents',
  'application-documents',
  false,
  5242880,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
