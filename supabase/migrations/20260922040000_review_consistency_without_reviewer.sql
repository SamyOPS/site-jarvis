-- ============================================================================
-- Un document controle peut perdre son controleur
-- ----------------------------------------------------------------------------
-- CONSTAT. La suppression d'un compte RH echouait sur :
--
--   code 23514 — new row for relation "employee_documents"
--   violates check constraint "employee_documents_review_consistency"
--
-- La contrainte exige qu'un document valide ou refuse NOMME son controleur. Detacher ce
-- controleur — indispensable pour supprimer son compte — la viole donc, et la suppression
-- s'arrete. Elle ne concernait que les RH : eux seuls valident des documents.
--
-- CE QUE LA CONTRAINTE PROTEGE, tel que le montrent les 176 documents en base et la seule
-- route qui les ecrit (api/rh/documents/review) :
--
--   pending              -> reviewed_by NUL,     reviewed_at NUL       (30 lignes)
--   validated / rejected -> reviewed_by renseigne, reviewed_at renseigne (146 lignes)
--
-- CE QUI CHANGE. Une seule chose : l'IDENTITE du controleur n'est plus exigee. Le FAIT du
-- controle l'est toujours — `reviewed_at` reste obligatoire —, et un document en attente
-- ne peut toujours pas porter de trace de revue. Le controleur devient simplement inconnu
-- quand son compte disparait, exactement comme le deposant (20260922030000) et comme
-- l'auteur d'un message (20260922000000).
--
-- La definition d'origine n'etait pas versionnee : elle avait ete posee depuis le tableau
-- de bord Supabase. Le bloc ci-dessous l'IMPRIME avant de la remplacer, pour qu'elle
-- figure dans le journal d'execution de cette migration.
--
-- Idempotente : reexecutable sans effet de bord.
-- ============================================================================

do $$
declare
  ancienne text;
begin
  select pg_get_constraintdef(con.oid)
    into ancienne
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'employee_documents'
    and con.conname = 'employee_documents_review_consistency';

  if ancienne is null then
    raise notice 'employee_documents_review_consistency absente : elle sera simplement creee.';
  else
    raise notice 'Ancienne definition remplacee : %', ancienne;
    alter table public.employee_documents
      drop constraint employee_documents_review_consistency;
  end if;
end $$;

/*
  `not valid` n'est PAS utilise : les lignes existantes doivent etre verifiees. Si l'une
  d'elles ne respecte pas la nouvelle regle, la migration echoue ici — ce qui vaut mieux
  que d'installer une contrainte a laquelle la table ne se conforme pas.
*/
alter table public.employee_documents
  add constraint employee_documents_review_consistency check (
    case
      -- En attente : aucune trace de revue, ni date ni controleur.
      when status = 'pending' then reviewed_by is null and reviewed_at is null
      -- Controle : la date du controle est exigee. Le controleur, lui, peut etre inconnu —
      -- son compte a pu etre supprime depuis.
      else reviewed_at is not null
    end
  );

comment on constraint employee_documents_review_consistency on public.employee_documents is
  'Un document en attente ne porte aucune trace de revue ; un document controle porte sa date. Le controleur peut etre nul : son compte a pu etre supprime.';
