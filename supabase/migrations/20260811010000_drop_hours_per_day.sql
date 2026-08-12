-- Suppression de la base d'heures par jour.
--
-- Le modele convertissait les heures en jours (day_quantity = hours / hours_per_day) pour
-- tout ramener a une quantite de journees, puis multipliait par un tarif journalier. Cela
-- imposait de connaitre une base contractuelle par mission, et rendait le tarif horaire
-- derive plutot que negocie.
--
-- Desormais chaque mission compte dans SON unite, sans passerelle : les heures quand elle
-- est a l'heure, les jours quand elle est au jour. Une ligne de CRA porte donc l'une OU
-- l'autre quantite, jamais les deux.

-- 1. La base d'heures disparait des missions et des lignes recapitulatives.
ALTER TABLE public.employee_missions
  DROP COLUMN IF EXISTS hours_per_day;

ALTER TABLE public.cra_mission_lines
  DROP COLUMN IF EXISTS hours_per_day;


-- 2. `day_quantity` ne concerne plus que les missions au jour.
--    Elle devient nullable : une ligne saisie en heures n'a pas d'equivalent en journees,
--    et lui en inventer un reintroduirait la conversion qu'on supprime.
ALTER TABLE public.cra_entries
  ALTER COLUMN day_quantity DROP NOT NULL;

-- La contrainte existante impose day_quantity > 0 : elle refuserait desormais les lignes
-- horaires. On la remplace en la decouvrant, sans deviner son nom — meme methode que
-- 20260805000000, qui l'avait deja reecrite une fois.
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

  ALTER TABLE public.cra_entries
    ADD CONSTRAINT cra_entries_day_quantity_check
    CHECK (day_quantity IS NULL OR (day_quantity > 0 AND day_quantity <= 24));

  -- Une ligne doit porter au moins une quantite, sinon elle ne veut rien dire.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'cra_entries'
      AND con.conname = 'cra_entries_quantity_present_check'
  ) THEN
    ALTER TABLE public.cra_entries
      ADD CONSTRAINT cra_entries_quantity_present_check
      CHECK (day_quantity IS NOT NULL OR hours IS NOT NULL);
  END IF;
END $$;


-- 3. Les lignes horaires existantes portent encore un equivalent en journees, calcule par
--    l'ancienne conversion. Il n'a plus de sens : `hours` fait foi, on efface le double.
--
--    Les CRA deja emis ne bougent pas : leur total est fige dans
--    `cra_records.worked_days_count` et dans `cra_mission_lines.quantity`, qui ne sont pas
--    touches ici.
UPDATE public.cra_entries
SET day_quantity = NULL
WHERE hours IS NOT NULL
  AND day_quantity IS NOT NULL;


-- 4. Les colonnes du profil de facturation perdent leur dernier usage.
COMMENT ON COLUMN public.employee_billing_profiles.hours_per_day IS
  'Obsolete : la base d''heures par jour n''existe plus. Une mission compte en heures ou en jours, sans conversion.';
COMMENT ON COLUMN public.employee_billing_profiles.time_unit IS
  'Deprecie : remplace par employee_missions.rate_unit.';

COMMENT ON COLUMN public.cra_entries.day_quantity IS
  'Quantite en journees. NULL pour une ligne rattachee a une mission facturee a l''heure.';
COMMENT ON COLUMN public.cra_entries.hours IS
  'Quantite en heures. NULL pour une ligne rattachee a une mission facturee au jour.';
