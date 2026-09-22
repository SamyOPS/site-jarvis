-- ============================================================================
-- Correctif : fermer l'execution de messaging_overview
-- ----------------------------------------------------------------------------
-- La migration 20260922000000 posait :
--
--   revoke execute on function public.messaging_overview(uuid) from public;
--
-- CE N'ETAIT PAS SUFFISANT. Supabase pose des privileges par defaut sur le schema
-- `public` :
--
--   alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
--
-- Chaque fonction creee recoit donc EXECUTE explicitement pour `anon` et `authenticated`,
-- en plus du privilege implicite de PUBLIC. Retirer celui de PUBLIC laissait les deux
-- autres intacts, et la fonction restait appelable par tout le monde.
--
-- CE QUE CELA EXPOSAIT : `messaging_overview` prend le profil en PARAMETRE, elle ne le
-- deduit pas de `auth.uid()` — elle est faite pour etre appelee par le service_role, qui
-- n'a pas de session. N'importe qui pouvait donc l'appeler via PostgREST avec
-- l'identifiant d'un autre et lire ses conversations : interlocuteurs, dernier message et
-- nombre de non-lus. Verifie le 22/09/2026 avec la seule cle anon, sans aucun compte.
--
-- Idempotente : reexecutable sans effet de bord.
-- ============================================================================

revoke execute on function public.messaging_overview(uuid) from public;
revoke execute on function public.messaging_overview(uuid) from anon;
revoke execute on function public.messaging_overview(uuid) from authenticated;

-- Seul appelant legitime : les routes d'API.
grant execute on function public.messaging_overview(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Garde-fou
-- ---------------------------------------------------------------------------

/*
  Interrompt la migration si l'un des deux roles conserve le privilege. Sans cette
  verification, un echec silencieux redonnerait exactement le trou que ce fichier ferme.
*/
do $$
declare
  fautif text;
begin
  select string_agg(role_name, ', ')
  into fautif
  from (
    select unnest(array['anon', 'authenticated']) as role_name
  ) roles
  where has_function_privilege(
    roles.role_name,
    'public.messaging_overview(uuid)',
    'EXECUTE'
  );

  if fautif is not null then
    raise exception
      'messaging_overview reste executable par : %. Les conversations d''autrui seraient lisibles.',
      fautif;
  end if;
end $$;
