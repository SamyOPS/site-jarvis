-- ============================================================================
-- CRA : créneaux horaires détaillés
-- ----------------------------------------------------------------------------
-- Une journée facturée à l'heure peut être détaillée en créneaux début–fin, chacun avec
-- son commentaire : [{"start": "09:00", "end": "10:30", "label": "Installation"}, ...].
--
-- Les heures de la ligne (`hours`) restent la quantité facturée ; quand des créneaux sont
-- saisis, le serveur les recalcule à partir d'eux (voir parseCraEntries) : le total ne
-- peut pas diverger du détail.
--
-- Les créneaux ne concernent que les lignes de travail facturées à l'heure : jamais une
-- absence, jamais une ligne au jour.
--
-- Idempotente : réexécutable sans effet de bord.
-- ============================================================================

ALTER TABLE public.cra_entries
  ADD COLUMN IF NOT EXISTS time_slots jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'cra_entries'
      AND con.conname = 'cra_entries_time_slots_check'
  ) THEN
    ALTER TABLE public.cra_entries
      ADD CONSTRAINT cra_entries_time_slots_check
      CHECK (
        time_slots IS NULL
        OR (
          jsonb_typeof(time_slots) = 'array'
          AND absence_type IS NULL
          AND hours IS NOT NULL
        )
      );
  END IF;
END $$;
