-- Les champs tarif journalier, IBAN et BIC ne concernent que les
-- auto-entrepreneurs. Un profil de facturation (et le CRA qui en découle)
-- doit pouvoir exister sans ces informations.
-- SIRET a déjà été rendu optionnel (20260528010000_optional_siret.sql) ;
-- on complète ici avec daily_rate / iban / bic sur les deux tables.
--
-- ALTER COLUMN ... DROP NOT NULL est idempotent : sans effet si la colonne
-- est déjà nullable. Une éventuelle contrainte CHECK (daily_rate > 0) reste
-- satisfaite par NULL (un CHECK NULL est considéré comme valide par Postgres).

ALTER TABLE public.employee_billing_profiles
  ALTER COLUMN daily_rate DROP NOT NULL,
  ALTER COLUMN iban DROP NOT NULL,
  ALTER COLUMN bic DROP NOT NULL;

ALTER TABLE public.cra_records
  ALTER COLUMN daily_rate DROP NOT NULL,
  ALTER COLUMN iban DROP NOT NULL,
  ALTER COLUMN bic DROP NOT NULL;
