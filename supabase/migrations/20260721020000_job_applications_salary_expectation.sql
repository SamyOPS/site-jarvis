-- Prétention salariale annuelle (en euros) déclarée par le candidat au moment
-- de la candidature à une offre.
-- À exécuter dans le projet Supabase CV (SUPABASE_CV_URL).

ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS salary_expectation numeric CHECK (salary_expectation IS NULL OR salary_expectation >= 0);
