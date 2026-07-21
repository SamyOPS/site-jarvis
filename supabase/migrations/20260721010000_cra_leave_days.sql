-- Ajoute les compteurs d'absences/congés au CRA (affichés dans le PDF).
-- Jusqu'ici ces lignes étaient codées en dur à "0 jour(s)" dans le PDF ;
-- elles deviennent saisissables sur la page CRA et stockées par période.
-- À exécuter dans le projet Supabase principal (NEXT_PUBLIC_SUPABASE_URL).

ALTER TABLE public.cra_records
  ADD COLUMN IF NOT EXISTS paid_leave_days numeric NOT NULL DEFAULT 0 CHECK (paid_leave_days >= 0),
  ADD COLUMN IF NOT EXISTS sick_leave_days numeric NOT NULL DEFAULT 0 CHECK (sick_leave_days >= 0),
  ADD COLUMN IF NOT EXISTS exceptional_leave_days numeric NOT NULL DEFAULT 0 CHECK (exceptional_leave_days >= 0),
  ADD COLUMN IF NOT EXISTS unpaid_leave_days numeric NOT NULL DEFAULT 0 CHECK (unpaid_leave_days >= 0);
