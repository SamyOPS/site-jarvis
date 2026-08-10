-- Autorise le changement de type de compte depuis la page admin.
--
-- Le declencheur trg_profiles_protect_critical protege role et professional_status
-- contre l'auto-elevation de privileges : sans lui, un utilisateur pouvant modifier sa
-- propre ligne profiles via RLS se passerait role = 'admin'. Cette protection est
-- conservee telle quelle.
--
-- Le probleme corrige ici : sa seule porte de sortie etait public.is_admin(), qui repose
-- sur auth.uid(). Or auth.uid() est NULL dans un appel service-role comme en SQL direct.
-- Le chemin d'administration legitime etait donc bloque au meme titre qu'un utilisateur.

create or replace function public.protect_profile_critical_fields()
returns trigger
language plpgsql
security definer
-- search_path fige : sans cela, une fonction is_admin() placee dans un schema prioritaire
-- pourrait detourner le controle d'une fonction SECURITY DEFINER.
set search_path = public, pg_temp
as $$
begin
  -- Exemption du chemin serveur et de la maintenance SQL directe.
  --
  -- On teste la revendication JWT et le GUC `role`, jamais current_user : dans une
  -- fonction SECURITY DEFINER, current_user vaut le proprietaire de la fonction, donc
  -- l'exemption serait toujours vraie et la protection ne vaudrait plus rien.
  -- session_user reste l'utilisateur de connexion : 'authenticator' pour PostgREST,
  -- 'postgres' depuis le SQL Editor. Un utilisateur de l'application ne peut donc pas
  -- s'y faire passer, et il ne peut pas non plus prendre SET ROLE service_role, dont il
  -- n'est pas membre.
  if coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') = 'service_role'
     or coalesce(current_setting('role', true), '') = 'service_role'
     or session_user in ('postgres', 'supabase_admin')
  then
    return new;
  end if;

  -- si pas admin, interdire changement de role/professional_status
  if not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Not allowed to change role';
    end if;

    if new.professional_status is distinct from old.professional_status then
      raise exception 'Not allowed to change professional_status';
    end if;
  end if;

  return new;
end;
$$;
