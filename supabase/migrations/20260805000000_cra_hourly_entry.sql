-- Saisie horaire du CRA pour les consultants suivis à l'heure.
--
-- Le schéma de base n'est pas versionné dans ce repo (l'étape `supabase db pull` du
-- README n'a jamais été faite), donc le nom exact des contraintes CHECK existantes est
-- inconnu. Cette migration ne devine aucun nom : elle interroge le catalogue pour
-- trouver les contraintes réellement présentes. Elle est idempotente et rejouable.

-- 1. Réglage par consultant, porté par le profil de facturation.
--    'day'  = saisie en journées (1 j / ½ j) — comportement historique, valeur par défaut
--    'hour' = saisie en heures par jour
ALTER TABLE public.employee_billing_profiles
  ADD COLUMN IF NOT EXISTS time_unit text NOT NULL DEFAULT 'day',
  ADD COLUMN IF NOT EXISTS hours_per_day numeric DEFAULT 7;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'employee_billing_profiles'
      AND con.conname = 'employee_billing_profiles_time_unit_check'
  ) THEN
    ALTER TABLE public.employee_billing_profiles
      ADD CONSTRAINT employee_billing_profiles_time_unit_check
      CHECK (time_unit IN ('day', 'hour'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'employee_billing_profiles'
      AND con.conname = 'employee_billing_profiles_hours_per_day_check'
  ) THEN
    ALTER TABLE public.employee_billing_profiles
      ADD CONSTRAINT employee_billing_profiles_hours_per_day_check
      CHECK (hours_per_day IS NULL OR (hours_per_day > 0 AND hours_per_day <= 24));
  END IF;
END $$;

-- 2. Volume horaire réellement saisi, source de vérité en mode horaire.
--    NULL en mode journée. day_quantity en est dérivé côté serveur
--    (day_quantity = hours / hours_per_day) : on stocke les heures plutôt que de les
--    recalculer, pour éviter toute dérive d'arrondi (7,5 / 7 * 7 <> 7,5).
ALTER TABLE public.cra_entries
  ADD COLUMN IF NOT EXISTS hours numeric;

-- 3. Une entrée peut désormais valoir plus d'une journée : en saisie libre, 9 h sur une
--    base de 7 h donne day_quantity = 1,29. Toute contrainte CHECK plafonnant
--    day_quantity à 1 doit donc sauter. On les découvre au lieu de les nommer.
DO $$
DECLARE
  existing_constraint record;
BEGIN
  FOR existing_constraint IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'cra_entries'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%day_quantity%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.cra_entries DROP CONSTRAINT %I',
      existing_constraint.conname
    );
  END LOOP;

  -- Borne large : une journée ne peut pas dépasser 24 h, donc day_quantity ne peut pas
  -- dépasser 24 / hours_per_day. hours_per_day vivant sur une autre table, on ne peut
  -- pas l'exprimer ici ; 24 est la borne absolue qui garde le garde-fou anti-absurdité.
  ALTER TABLE public.cra_entries
    ADD CONSTRAINT cra_entries_day_quantity_check
    CHECK (day_quantity > 0 AND day_quantity <= 24);

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'cra_entries'
      AND con.conname = 'cra_entries_hours_check'
  ) THEN
    ALTER TABLE public.cra_entries
      ADD CONSTRAINT cra_entries_hours_check
      CHECK (hours IS NULL OR (hours > 0 AND hours <= 24));
  END IF;
END $$;

-- 4. worked_days_count (cra_records) peut lui aussi dépasser le nombre de jours du mois
--    en saisie libre. Si une contrainte le plafonne, elle est relevée de la même façon.
DO $$
DECLARE
  existing_constraint record;
BEGIN
  FOR existing_constraint IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'cra_records'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%worked_days_count%'
      AND pg_get_constraintdef(con.oid) ~ '<=?\s*3[01]'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.cra_records DROP CONSTRAINT %I',
      existing_constraint.conname
    );
  END LOOP;
END $$;
