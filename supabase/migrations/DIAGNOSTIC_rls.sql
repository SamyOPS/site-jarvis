-- ============================================================================
-- A EXECUTER EN PREMIER, dans le SQL Editor Supabase. Ne modifie rien.
--
-- La migration RLS qui suit est ecrite pour etre idempotente, mais elle ne peut
-- pas deviner ce qui existe deja en base : les tables historiques (profiles,
-- employee_documents, document_requests, job_offers...) ont ete creees hors
-- versionnement, et leurs policies eventuelles ne sont dans aucun fichier du depot.
--
-- Colle le resultat des trois requetes avant d'appliquer la migration.
-- ============================================================================

-- 1) RLS est-elle activee, et sur quelles tables ?
select
  c.relname                as table_name,
  c.relrowsecurity         as rls_active,
  c.relforcerowsecurity    as rls_forcee
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relrowsecurity desc, c.relname;

-- 2) Quelles policies existent deja ?
--    Une table avec rls_active = true et AUCUNE ligne ici est totalement fermee
--    a anon/authenticated (le service_role, lui, contourne toujours RLS).
select
  tablename,
  policyname,
  cmd            as operation,
  roles,
  qual           as condition_lecture,
  with_check     as condition_ecriture
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 3) Les fonctions d'aide referencees par le code existent-elles ?
select
  p.proname       as fonction,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef     as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('is_admin', 'is_rh_for', 'protect_profile_critical_fields')
order by p.proname;
