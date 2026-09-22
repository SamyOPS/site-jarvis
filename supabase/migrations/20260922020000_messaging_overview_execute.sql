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
-- CE QUE CELA EXPOSE, EXACTEMENT. Rien, en pratique — et la premiere redaction de ce
-- fichier se trompait sur ce point. `messaging_overview` est SECURITY INVOKER : elle
-- s'execute avec les droits de l'APPELANT, et les policies RLS de `conversations`,
-- `conversation_participants` et `messages` s'appliquent donc a l'interieur. Un appelant
-- anonyme ne voit aucune ligne ; un utilisateur connecte qui passerait l'identifiant d'un
-- tiers ne voit que les conversations auxquelles il participe deja.
--
-- Verifie le 22/09/2026 sur la base reelle : appel anonyme sur un compte ayant des
-- conversations, 0 ligne rendue.
--
-- Ce revoke reste donc une mesure de DEFENSE EN PROFONDEUR, pas la fermeture d'une porte
-- ouverte. Il ne doit interrompre aucune migration.
--
-- Idempotente : reexecutable sans effet de bord.
-- ============================================================================

revoke execute on function public.messaging_overview(uuid) from public;
revoke execute on function public.messaging_overview(uuid) from anon;
revoke execute on function public.messaging_overview(uuid) from authenticated;

-- Seul appelant legitime : les routes d'API.
grant execute on function public.messaging_overview(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Constat, sans interruption
-- ---------------------------------------------------------------------------

/*
  La premiere version de ce fichier se terminait par un `raise exception` si `anon`
  conservait le privilege. C'ETAIT UN DEFAUT : dans l'editeur SQL de Supabase, le script
  forme une seule transaction, et cette exception annulait les `revoke` qui la
  precedaient. La migration defaisait donc son propre effet, sans rien signaler d'autre
  qu'une erreur en fin de course.

  Un `notice` rapporte l'etat sans jamais rien annuler.
*/
do $$
begin
  if has_function_privilege('anon', 'public.messaging_overview(uuid)', 'EXECUTE') then
    raise notice 'anon conserve EXECUTE sur messaging_overview. Sans consequence : la fonction est SECURITY INVOKER, RLS s''applique a l''interieur.';
  else
    raise notice 'EXECUTE retire a anon et authenticated.';
  end if;
end $$;

/*
  AVERTISSEMENT POUR PLUS TARD. La protection reelle de cette fonction tient a ce qu'elle
  est SECURITY INVOKER. La passer en SECURITY DEFINER lui ferait contourner RLS, et elle
  rendrait alors les conversations de n'importe quel profil passe en parametre. Ne pas le
  faire sans deplacer le controle a l'interieur du corps.
*/
comment on function public.messaging_overview(uuid) is
  'Conversations d''un profil. SECURITY INVOKER a dessein : RLS restreint ce que l''appelant peut lire. Ne jamais passer en SECURITY DEFINER.';
