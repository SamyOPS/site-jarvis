-- ============================================================================
-- Journal des actions d'administration
-- ----------------------------------------------------------------------------
-- Certaines actions admin engagent la securite d'un compte tiers : reinitialiser
-- un mot de passe, changer un role, supprimer un compte. Elles doivent laisser une
-- trace consultable apres coup — sans quoi, en cas d'incident, rien ne permet de
-- savoir qui a fait quoi ni quand.
--
-- CE QUI N'EST JAMAIS ECRIT ICI : aucun secret. Pas de mot de passe, pas de jeton,
-- pas d'empreinte. Le journal dit QUE le mot de passe a ete change, jamais lequel.
--
-- Idempotente : reexecutable sans effet de bord.
-- ============================================================================

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  -- L'admin qui agit. ON DELETE SET NULL : la suppression d'un compte admin ne doit
  -- pas effacer la trace de ce qu'il a fait.
  actor_id uuid references public.profiles (id) on delete set null,
  actor_email text,
  -- Le compte vise. Meme raisonnement.
  target_id uuid references public.profiles (id) on delete set null,
  target_email text,
  action text not null,
  -- Contexte libre, sans secret.
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc);

create index if not exists admin_audit_log_target_idx
  on public.admin_audit_log (target_id);

-- RLS active SANS policy : la table est fermee a anon et authenticated. Seul le
-- service_role l'ecrit et la lit, depuis les routes d'API. Un journal d'audit
-- lisible depuis le navigateur n'aurait aucune valeur.
alter table public.admin_audit_log enable row level security;

comment on table public.admin_audit_log is
  'Journal des actions d''administration sensibles. Ne contient jamais de secret.';
