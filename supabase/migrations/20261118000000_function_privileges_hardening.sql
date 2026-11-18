-- ============================================================================
-- Durcissement des fonctions SQL (audit de securite Supabase du 18/11/2026)
-- ----------------------------------------------------------------------------
-- 1. Fonctions de dossiers : move_document_folder, soft_delete_document_folder,
--    restore_document_folder. SECURITY DEFINER, elles ignorent donc les regles d'acces,
--    et ne controlent PAS qui agit : `p_actor_user_id` ne sert qu'a remplir `updated_by`.
--    Executables par `anon`, n'importe qui pouvait, avec la cle publique du site,
--    supprimer, restaurer ou deplacer n'importe quel dossier via /rest/v1/rpc/...
--
--    Le site ne les appelle QUE cote serveur, avec la cle de service, apres avoir
--    controle l'acces (`canManageOwner` dans app/api/documents/folders/**) et en
--    passant l'identite verifiee (`auth.actorId`). La correction est donc de les
--    reserver au role de service.
--
--    Pourquoi pas `auth.uid()` a la place de `p_actor_user_id` : appelees avec la cle
--    de service, `auth.uid()` y vaut NULL — les routes ne fonctionneraient plus. Et un
--    test `if v_owner <> auth.uid()` serait de toute facon contourne quand auth.uid()
--    est NULL (la comparaison vaut NULL, pas vrai) ; si l'on y vient un jour, il faudra
--    `if auth.uid() is null then raise ...` et `is distinct from`.
--
--    ATTENTION : un `drop function` + `create function` les rendrait de nouveau
--    executables par tous (droits par defaut de Supabase). `create or replace` conserve
--    les droits ; sinon, rejouer les revoke ci-dessous.
--
-- 2. Fonctions de declencheurs : aucun role n'a a les appeler. Le droit EXECUTE n'est
--    verifie qu'a la CREATION du declencheur, pas quand il se declenche : les retirer ne
--    change rien au fonctionnement des declencheurs.
--
-- 3. Fonctions d'aide des regles d'acces :
--    - is_admin et storage_path_owner_uid restent executables par `anon` : des regles
--      ouvertes au role `public` les appellent, et anon doit pouvoir les evaluer.
--    - les sept autres ne servent que dans des regles reservees a `authenticated` :
--      `anon` les perd, `authenticated` les garde.
--
-- 4. search_path fige (vide) sur les 17 fonctions qui n'en avaient pas. Verifie : leurs
--    corps ne nomment que des objets prefixes (public., auth.) et des fonctions natives.
--
-- Idempotente : reexecutable sans effet de bord.
-- ============================================================================

-- 1. Fonctions de dossiers : role de service uniquement.
revoke execute on function public.move_document_folder(uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.soft_delete_document_folder(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.restore_document_folder(uuid, uuid) from public, anon, authenticated;
grant execute on function public.move_document_folder(uuid, uuid, uuid) to service_role;
grant execute on function public.soft_delete_document_folder(uuid, uuid) to service_role;
grant execute on function public.restore_document_folder(uuid, uuid) to service_role;

-- 2. Fonctions de declencheurs (toutes celles du schema public qui retournent `trigger`) :
--    handle_new_user, protect_profile_critical_fields, sync_profile_from_auth_users,
--    touch_conversation_last_message, applications_update_only_status,
--    invoice_records_set_number, invoice_records_validate_cra_link,
--    set_document_folders_updated_at, set_employee_documents_updated_at,
--    set_news_articles_updated_at, set_profiles_updated_at, set_published_at,
--    set_updated_at, set_updated_at_employee_documents,
--    set_updated_at_user_dashboard_preferences.
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prorettype = 'trigger'::regtype
  loop
    execute format(
      'revoke execute on function %s from public, anon, authenticated, service_role',
      fn.signature
    );
  end loop;
end
$$;

-- 3. Aides des regles reservees aux utilisateurs connectes.
revoke execute on function public.can_join_console_presence() from public, anon;
revoke execute on function public.current_role_name() from public, anon;
revoke execute on function public.is_conversation_participant(uuid) from public, anon;
revoke execute on function public.is_rh() from public, anon;
revoke execute on function public.is_rh_for(uuid) from public, anon;
revoke execute on function public.is_rh_verified() from public, anon;
revoke execute on function public.is_salarie() from public, anon;
grant execute on function public.can_join_console_presence() to authenticated, service_role;
grant execute on function public.current_role_name() to authenticated, service_role;
grant execute on function public.is_conversation_participant(uuid) to authenticated, service_role;
grant execute on function public.is_rh() to authenticated, service_role;
grant execute on function public.is_rh_for(uuid) to authenticated, service_role;
grant execute on function public.is_rh_verified() to authenticated, service_role;
grant execute on function public.is_salarie() to authenticated, service_role;

-- 4. search_path fige.
alter function public.move_document_folder(uuid, uuid, uuid) set search_path = '';
alter function public.soft_delete_document_folder(uuid, uuid) set search_path = '';
alter function public.restore_document_folder(uuid, uuid) set search_path = '';
alter function public.sync_profile_from_auth_users() set search_path = '';
alter function public.applications_update_only_status() set search_path = '';
alter function public.generate_invoice_number(date) set search_path = '';
alter function public.invoice_records_set_number() set search_path = '';
alter function public.invoice_records_validate_cra_link() set search_path = '';
alter function public.is_verified_professional() set search_path = '';
alter function public.set_document_folders_updated_at() set search_path = '';
alter function public.set_employee_documents_updated_at() set search_path = '';
alter function public.set_profiles_updated_at() set search_path = '';
alter function public.set_published_at() set search_path = '';
alter function public.set_updated_at() set search_path = '';
alter function public.set_updated_at_employee_documents() set search_path = '';
alter function public.set_updated_at_user_dashboard_preferences() set search_path = '';
alter function public.storage_path_owner_uid(text) set search_path = '';
