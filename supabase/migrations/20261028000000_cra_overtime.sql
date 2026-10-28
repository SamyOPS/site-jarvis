-- ============================================================================
-- CRA : heures supplémentaires par jour
-- ----------------------------------------------------------------------------
-- Chaque journée travaillée peut déclarer des heures supplémentaires, et parmi elles des
-- heures de nuit. Le PDF du CRA en imprime le total du mois (ligne « Heures
-- supplémentaires : X heure(s), dont Y heure(s) de nuit », jusqu'ici figée à 0) et les
-- signale dans le détail des journées.
--
-- Déclaratives seulement : elles ne changent pas la quantité facturée.
--
-- Jamais sur une absence ; les heures de nuit ne dépassent pas les heures sup.
-- NULL = aucune heure supplémentaire.
--
-- Idempotente : réexécutable sans effet de bord.
-- ============================================================================

ALTER TABLE public.cra_entries
  ADD COLUMN IF NOT EXISTS overtime_hours numeric,
  ADD COLUMN IF NOT EXISTS night_overtime_hours numeric;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'cra_entries'
      AND con.conname = 'cra_entries_overtime_check'
  ) THEN
    ALTER TABLE public.cra_entries
      ADD CONSTRAINT cra_entries_overtime_check
      CHECK (
        (overtime_hours IS NULL OR (overtime_hours > 0 AND overtime_hours <= 24 AND absence_type IS NULL))
        AND (
          night_overtime_hours IS NULL
          OR (night_overtime_hours > 0 AND overtime_hours IS NOT NULL AND night_overtime_hours <= overtime_hours)
        )
      );
  END IF;
END $$;
