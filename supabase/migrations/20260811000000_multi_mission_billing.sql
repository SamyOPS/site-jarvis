-- CRA et factures multi-entreprises, à l'heure ou au jour.
--
-- Jusqu'ici l'entreprise cliente n'était pas une entité : c'était un attribut du
-- collaborateur, porté par son unique `employee_billing_profiles` (clé = employee_id).
-- Un collaborateur ne pouvait donc avoir qu'une entreprise, un tarif et une unité.
--
-- Cette migration introduit la mission (couple collaborateur × entreprise), qui porte
-- désormais l'entreprise, l'ESN, le tarif et l'unité. Le profil de facturation ne garde
-- que l'identité de l'émetteur (nom, adresse, SIRET, IBAN).
--
-- Le schéma de base n'est pas versionné dans ce repo (l'étape `supabase db pull` du
-- README n'a jamais été faite) : aucune contrainte existante n'est nommée en dur, elles
-- sont découvertes dans le catalogue. Migration idempotente et rejouable.


-- 1. La mission : un collaborateur, une entreprise cliente, un tarif, une unité.
--
--    `rate` + `rate_unit` plutôt que deux colonnes daily_rate/hourly_rate : le tarif est
--    toujours exprimé dans l'unité de saisie de la mission, il n'y a donc jamais à
--    trancher laquelle des deux fait foi.
--
--    `archived_at` plutôt qu'une suppression : une mission référencée par un CRA passé
--    doit rester lisible.
CREATE TABLE IF NOT EXISTS public.employee_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  company_name text NOT NULL,
  esn_partenaire text,
  rate numeric,
  rate_unit text NOT NULL DEFAULT 'day',
  hours_per_day numeric DEFAULT 7,
  archived_at timestamptz,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'employee_missions'
      AND con.conname = 'employee_missions_rate_unit_check'
  ) THEN
    ALTER TABLE public.employee_missions
      ADD CONSTRAINT employee_missions_rate_unit_check
      CHECK (rate_unit IN ('day', 'hour'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'employee_missions'
      AND con.conname = 'employee_missions_rate_check'
  ) THEN
    -- Le tarif reste facultatif : un profil incomplet doit pouvoir exister, c'est la
    -- génération de facture qui exige un tarif renseigné.
    ALTER TABLE public.employee_missions
      ADD CONSTRAINT employee_missions_rate_check
      CHECK (rate IS NULL OR rate > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'employee_missions'
      AND con.conname = 'employee_missions_hours_per_day_check'
  ) THEN
    ALTER TABLE public.employee_missions
      ADD CONSTRAINT employee_missions_hours_per_day_check
      CHECK (hours_per_day IS NULL OR (hours_per_day > 0 AND hours_per_day <= 24));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS employee_missions_employee_id_idx
  ON public.employee_missions (employee_id);


-- 2. Rattachement de chaque ligne de CRA à sa mission.
--    Nullable : les lignes historiques sont rattachées plus bas, et une ligne peut
--    survivre à la purge de sa mission sans faire disparaître le CRA.
ALTER TABLE public.cra_entries
  ADD COLUMN IF NOT EXISTS mission_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'cra_entries'
      AND con.conname = 'cra_entries_mission_id_fkey'
  ) THEN
    ALTER TABLE public.cra_entries
      ADD CONSTRAINT cra_entries_mission_id_fkey
      FOREIGN KEY (mission_id) REFERENCES public.employee_missions (id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS cra_entries_mission_id_idx
  ON public.cra_entries (mission_id);


-- 3. Une même date peut désormais porter plusieurs lignes, une par entreprise
--    (0,5 j chez A + 0,5 j chez B, ou 4 h + 3 h).
--
--    Une éventuelle unicité (cra_id, work_date) doit donc sauter. Son existence n'est pas
--    certaine — le code ne traite le code Postgres 23505 que sur `cra_records`, jamais à
--    l'insertion des lignes, et les routes font toujours DELETE puis INSERT, donc elles ne
--    l'auraient jamais heurtée. On sonde plutôt que de supposer, et on couvre les deux
--    formes possibles : contrainte UNIQUE et index unique nu.
--    Un `CREATE UNIQUE INDEX` nu ne crée AUCUNE ligne dans `pg_constraint`, seulement
--    dans `pg_index` : balayer `pg_constraint` comme le fait 20260805 ne suffirait pas.
--    On balaie donc `pg_index`, et on ne consulte `pg_constraint` que pour savoir COMMENT
--    supprimer — un index adossé à une contrainte refuse `DROP INDEX`.
DO $$
DECLARE
  existing record;
BEGIN
  FOR existing IN
    SELECT idx.indexrelid::regclass::text AS index_name,
           con.conname AS constraint_name,
           idx.indisprimary
    FROM pg_index idx
    JOIN pg_class rel ON rel.oid = idx.indrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    LEFT JOIN pg_constraint con ON con.conindid = idx.indexrelid
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'cra_entries'
      AND idx.indisunique
      -- Ancre de fin : exclut naturellement les index partiels (leur définition se
      -- termine par WHERE ...) et ceux à trois colonnes. La migration ne peut donc pas
      -- supprimer les index qu'elle crée juste après, même rejouée.
      AND pg_get_indexdef(idx.indexrelid) ~ '\((cra_id, work_date|work_date, cra_id)\)$'
  LOOP
    IF existing.indisprimary THEN
      -- On ne supprime jamais une clé primaire en silence : si (cra_id, work_date) est
      -- la PK, le modèle réel diffère de celui cartographié et la reprise doit être
      -- revue à la main.
      RAISE EXCEPTION
        'cra_entries : (cra_id, work_date) est la cle primaire (%). Migration interrompue : le jour partage impose un modele different.',
        existing.index_name;
    END IF;

    IF existing.constraint_name IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.cra_entries DROP CONSTRAINT %I', existing.constraint_name);
      RAISE NOTICE 'cra_entries : contrainte UNIQUE % supprimee (jour partage).', existing.constraint_name;
    ELSE
      EXECUTE format('DROP INDEX IF EXISTS %s', existing.index_name);
      RAISE NOTICE 'cra_entries : index UNIQUE % supprime (jour partage).', existing.index_name;
    END IF;
  END LOOP;
END $$;

-- L'index unique qui vient de sauter servait probablement les `.eq("cra_id", ...)`, la
-- requête la plus fréquente sur cette table. Les deux index qui le remplacent sont
-- partiels et ne peuvent pas servir un `WHERE cra_id = x` seul : il faut le sien.
CREATE INDEX IF NOT EXISTS cra_entries_cra_id_idx
  ON public.cra_entries (cra_id);

-- Nouvelle unicité, en deux index partiels.
--
-- Le premier RESTAURE à l'identique l'invariant historique pour toutes les lignes que le
-- code déployé continue d'écrire (sans mission_id). La journée partagée n'existe donc
-- concrètement qu'à partir du déploiement du nouveau code : l'UI actuelle, qui indexe les
-- entrées par date seule, reste correcte pendant toute la fenêtre de transition.
CREATE UNIQUE INDEX IF NOT EXISTS cra_entries_cra_work_date_legacy_uidx
  ON public.cra_entries (cra_id, work_date)
  WHERE mission_id IS NULL;

-- Le second autorise plusieurs entreprises le même jour, mais jamais deux fois la même.
CREATE UNIQUE INDEX IF NOT EXISTS cra_entries_cra_work_date_mission_uidx
  ON public.cra_entries (cra_id, work_date, mission_id)
  WHERE mission_id IS NOT NULL;


-- 4. Les lignes du document consolidé : une par entreprise présente dans le CRA.
--
--    Elles figent le tarif au moment du CRA — comme `cra_records` figeait le profil de
--    facturation — et servent directement de lignes à la facture et de récapitulatif au
--    PDF du CRA.
CREATE TABLE IF NOT EXISTS public.cra_mission_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cra_id uuid NOT NULL REFERENCES public.cra_records (id) ON DELETE CASCADE,
  mission_id uuid REFERENCES public.employee_missions (id) ON DELETE SET NULL,
  company_name text NOT NULL,
  esn_partenaire text,
  rate numeric,
  rate_unit text NOT NULL DEFAULT 'day',
  hours_per_day numeric,
  quantity numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'cra_mission_lines'
      AND con.conname = 'cra_mission_lines_rate_unit_check'
  ) THEN
    ALTER TABLE public.cra_mission_lines
      ADD CONSTRAINT cra_mission_lines_rate_unit_check
      CHECK (rate_unit IN ('day', 'hour'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS cra_mission_lines_cra_mission_key
  ON public.cra_mission_lines (cra_id, mission_id);


-- 5. Conversion de l'existant : chaque profil de facturation devient la première mission
--    de son collaborateur. Aucune ressaisie, aucune perte.
--
--    Aujourd'hui, même en mode `time_unit = 'hour'`, `daily_rate` est un tarif JOURNALIER :
--    les heures sont converties en jours (day_quantity = hours / hours_per_day) avant d'être
--    multipliées par le tarif. Une mission facturée à l'heure porte donc daily_rate / hpd,
--    ce qui préserve exactement les montants :
--
--      Σ hours × (daily_rate / hpd) = (Σ hours / hpd) × daily_rate = Σ day_quantity × daily_rate
--
--    ⚠️ Le quotient n'est pas décimal fini (550 / 7). Le laisser brut afficherait
--    « 78,571428571428571429 EUR/h » dans le profil du consultant — un tarif que personne
--    n'a négocié. Il est donc ARRONDI AU CENTIME : la rémunération se négociant par
--    entreprise, ce tarif repris n'est qu'un point de départ que le collaborateur confirme
--    mission par mission. L'écart résiduel (< 0,3 EUR sur un mois complet) ne concerne que
--    les factures FUTURES ; les documents déjà émis ne sont pas recalculés (cf. étape 7).
INSERT INTO public.employee_missions (
  employee_id, company_name, esn_partenaire, rate, rate_unit, hours_per_day, position
)
SELECT
  bp.employee_id,
  COALESCE(NULLIF(btrim(bp.company_name), ''), 'Client a renseigner'),
  bp.esn_partenaire,
  CASE
    WHEN bp.daily_rate IS NULL THEN NULL
    WHEN bp.time_unit = 'hour'
      THEN round(bp.daily_rate / COALESCE(NULLIF(bp.hours_per_day, 0), 7), 2)
    ELSE bp.daily_rate
  END,
  CASE WHEN bp.time_unit = 'hour' THEN 'hour' ELSE 'day' END,
  COALESCE(NULLIF(bp.hours_per_day, 0), 7),
  0
FROM public.employee_billing_profiles bp
WHERE NOT EXISTS (
  SELECT 1 FROM public.employee_missions m WHERE m.employee_id = bp.employee_id
);


-- 6. Rattachement des lignes de CRA existantes à la mission issue de la migration.
--    On vise la plus ancienne mission du collaborateur : c'est celle que l'étape 5 vient
--    de créer, et le tri reste déterministe si d'autres ont été ajoutées entre-temps.
WITH first_mission AS (
  SELECT DISTINCT ON (employee_id) employee_id, id
  FROM public.employee_missions
  ORDER BY employee_id, created_at, id
)
UPDATE public.cra_entries e
SET mission_id = fm.id
FROM public.cra_records r
JOIN first_mission fm ON fm.employee_id = r.employee_id
WHERE e.cra_id = r.id
  AND e.mission_id IS NULL;


-- 7. Lignes récapitulatives des CRA existants.
--    L'entreprise et le tarif viennent du snapshot déjà figé sur `cra_records`, pas de la
--    mission courante : un CRA passé doit continuer d'afficher le tarif qui était le sien.
--
--    L'unité fait exception : `cra_records` ne la porte pas. Elle est volontairement
--    absente du snapshot (cf. src/lib/cra-entries.ts:36-43 — l'ajouter au select du profil
--    casserait le `insert({ ...billingProfile })`). On retombe donc sur l'unité courante du
--    profil, qui est la seule information disponible. C'est exact tant que le collaborateur
--    n'a pas changé d'unité depuis, et sans conséquence sur les montants : la conversion
--    ci-dessous est neutre dans les deux sens.
--
--    Un collaborateur sans profil de facturation n'a pas de mission (étape 5) et n'obtient
--    donc pas de ligne : le code doit tolérer un CRA sans ligne de mission.
WITH first_mission AS (
  SELECT DISTINCT ON (employee_id) employee_id, id
  FROM public.employee_missions
  ORDER BY employee_id, created_at, id
),
totals AS (
  SELECT e.cra_id, SUM(e.day_quantity) AS total_days
  FROM public.cra_entries e
  GROUP BY e.cra_id
)
INSERT INTO public.cra_mission_lines (
  cra_id, mission_id, company_name, esn_partenaire, rate, rate_unit, hours_per_day, quantity
)
SELECT
  r.id,
  fm.id,
  COALESCE(NULLIF(btrim(r.company_name), ''), 'Client a renseigner'),
  r.esn_partenaire,
  -- AUCUNE conversion ici, volontairement : quelle qu'ait été l'unité de saisie, un CRA
  -- passé a toujours été facturé worked_days_count x daily_rate. La ligne reproduit donc
  -- littéralement ce que le PDF a imprimé, sans division, sans arrondi, sans dépendre de
  -- l'unité courante du profil — qui a pu changer depuis.
  r.daily_rate,
  'day',
  -- Conservée pour pouvoir réafficher un volume horaire ; n'entre dans aucun montant.
  COALESCE(NULLIF(bp.hours_per_day, 0), 7),
  -- worked_days_count fait foi : c'est le nombre que le PDF a imprimé. Repli sur la somme
  -- des lignes si le compteur est vide.
  COALESCE(NULLIF(r.worked_days_count, 0), t.total_days, 0)
FROM public.cra_records r
JOIN first_mission fm ON fm.employee_id = r.employee_id
LEFT JOIN public.employee_billing_profiles bp ON bp.employee_id = r.employee_id
LEFT JOIN totals t ON t.cra_id = r.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.cra_mission_lines l WHERE l.cra_id = r.id
);


-- 8. L'entreprise quitte le profil de facturation, qui ne garde que l'émetteur.
--    Les colonnes ne sont pas supprimées : les CRA historiques les référencent encore et
--    un retour arrière doit rester possible. Elles cessent simplement d'être obligatoires
--    puis d'être lues par l'application.
ALTER TABLE public.employee_billing_profiles
  ALTER COLUMN company_name DROP NOT NULL;

COMMENT ON COLUMN public.employee_billing_profiles.company_name IS
  'Deprecie : remplace par employee_missions.company_name.';
COMMENT ON COLUMN public.employee_billing_profiles.esn_partenaire IS
  'Deprecie : remplace par employee_missions.esn_partenaire.';
COMMENT ON COLUMN public.employee_billing_profiles.daily_rate IS
  'Deprecie : remplace par employee_missions.rate (+ rate_unit).';
COMMENT ON COLUMN public.employee_billing_profiles.time_unit IS
  'Deprecie : remplace par employee_missions.rate_unit.';
COMMENT ON COLUMN public.employee_billing_profiles.hours_per_day IS
  'Deprecie : remplace par employee_missions.hours_per_day.';


-- 9. RLS sur les nouvelles tables.
--    Toutes les écritures passent par les routes serveur, qui utilisent la clé
--    service_role et ne sont donc pas soumises à RLS. Activer RLS sans politique
--    d'écriture ferme l'accès direct depuis le navigateur : c'est le filet qui manque
--    aux tables historiques, on ne le reproduit pas ici.
--    Seule la lecture de ses propres missions est ouverte au collaborateur.
ALTER TABLE public.employee_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cra_mission_lines ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'employee_missions'
      AND policyname = 'employee_missions_select_own'
  ) THEN
    CREATE POLICY employee_missions_select_own
      ON public.employee_missions
      FOR SELECT
      TO authenticated
      USING (employee_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cra_mission_lines'
      AND policyname = 'cra_mission_lines_select_own'
  ) THEN
    CREATE POLICY cra_mission_lines_select_own
      ON public.cra_mission_lines
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.cra_records r
          WHERE r.id = cra_mission_lines.cra_id
            AND r.employee_id = auth.uid()
        )
      );
  END IF;
END $$;
