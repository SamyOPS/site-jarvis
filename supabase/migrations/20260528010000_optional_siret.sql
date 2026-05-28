-- Make SIRET optional.
-- Rationale: salariés (employees) do not have a SIRET; only auto-entrepreneurs do.
-- The existing CHECK constraint on employee_billing_profiles.siret allows NULL
-- (Postgres treats NULL CHECK results as satisfied), so only NOT NULL needs to drop.

ALTER TABLE public.employee_billing_profiles
  ALTER COLUMN siret DROP NOT NULL;

ALTER TABLE public.cra_records
  ALTER COLUMN siret DROP NOT NULL;
