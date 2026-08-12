-- Les absences se pointent sur le calendrier, comme les jours travailles.
--
-- Elles etaient saisies en quatre compteurs mensuels (conge paye, arret maladie, conge
-- exceptionnel, conge sans solde) tapes a la main sur `cra_records`. On ne savait donc pas
-- QUELS jours etaient concernes, et le collaborateur devait compter lui-meme.
--
-- Une absence devient une ligne de `cra_entries` : une date, un type, une quantite. Les
-- compteurs de `cra_records` sont conserves — le PDF les imprime — mais ils sont desormais
-- CALCULES a partir des lignes, plus saisis.

-- 1. Le type d'absence porte par la ligne.
--    NULL = ligne de travail, rattachee a une mission.
ALTER TABLE public.cra_entries
  ADD COLUMN IF NOT EXISTS absence_type text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'cra_entries'
      AND con.conname = 'cra_entries_absence_type_check'
  ) THEN
    ALTER TABLE public.cra_entries
      ADD CONSTRAINT cra_entries_absence_type_check
      CHECK (absence_type IS NULL OR absence_type IN ('paid', 'sick', 'exceptional', 'unpaid'));
  END IF;

  -- Une ligne est soit du travail chez un client, soit une absence. Jamais les deux :
  -- sans cette regle, une meme journee pourrait etre facturee et decomptee en conge.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'cra_entries'
      AND con.conname = 'cra_entries_work_or_absence_check'
  ) THEN
    ALTER TABLE public.cra_entries
      ADD CONSTRAINT cra_entries_work_or_absence_check
      CHECK (absence_type IS NULL OR mission_id IS NULL);
  END IF;
END $$;

-- Une absence se compte en journees, jamais en heures.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'cra_entries'
      AND con.conname = 'cra_entries_absence_in_days_check'
  ) THEN
    ALTER TABLE public.cra_entries
      ADD CONSTRAINT cra_entries_absence_in_days_check
      CHECK (absence_type IS NULL OR (day_quantity IS NOT NULL AND hours IS NULL));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS cra_entries_absence_type_idx
  ON public.cra_entries (cra_id, absence_type)
  WHERE absence_type IS NOT NULL;

-- L'unicite par date sur les lignes sans mission (posee en 20260811000000) joue ici son
-- role : une seule absence par journee. Une demi-journee d'absence peut donc cohabiter
-- avec une demi-journee travaillee, mais pas deux types d'absence le meme jour.

COMMENT ON COLUMN public.cra_entries.absence_type IS
  'Type d''absence de la journee (paid, sick, exceptional, unpaid). NULL = journee travaillee, rattachee a une mission.';

COMMENT ON COLUMN public.cra_records.paid_leave_days IS
  'Calcule a partir des lignes d''absence du CRA. Conserve car imprime sur le PDF.';
COMMENT ON COLUMN public.cra_records.sick_leave_days IS
  'Calcule a partir des lignes d''absence du CRA. Conserve car imprime sur le PDF.';
COMMENT ON COLUMN public.cra_records.exceptional_leave_days IS
  'Calcule a partir des lignes d''absence du CRA. Conserve car imprime sur le PDF.';
COMMENT ON COLUMN public.cra_records.unpaid_leave_days IS
  'Calcule a partir des lignes d''absence du CRA. Conserve car imprime sur le PDF.';
