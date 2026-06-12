-- Public job applications submitted from the Jarvis Connect career pages.
-- The table name is intentionally "applications" because the project already
-- reads that relation in the RH/salarie dashboards.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  message text,
  cv_url text,
  cover_letter_url text,
  status text NOT NULL DEFAULT 'submitted',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS job_id uuid,
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS cv_url text,
  ADD COLUMN IF NOT EXISTS cover_letter_url text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applications'
      AND column_name = 'candidate_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.applications ALTER COLUMN candidate_id DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applications'
      AND column_name = 'cv_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.applications ALTER COLUMN cv_id DROP NOT NULL;
  END IF;
END $$;

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
SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
