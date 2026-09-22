-- ============================================================================
-- Rendre un compte supprimable
-- ----------------------------------------------------------------------------
-- CONSTAT (releve du 22/09/2026 sur la base reelle). Aucun des quatre comptes RH
-- n'etait supprimable depuis la page admin. La route purge bien ce dont le compte
-- est le SUJET — ses documents, ses CRA, ses demandes — mais rien de ce dont il est
-- l'AUTEUR :
--
--   employee_documents.uploaded_by       41 lignes pour un RH, et la colonne est NOT NULL
--   employee_documents.reviewed_by       les documents qu'il a valides ou refuses
--   document_requests.requested_by       les demandes qu'il a emises
--   rh_employee_assignments.created_by   les affectations qu'il a posees
--   job_offers.created_by                NOT NULL
--
-- (`user_dashboard_preferences.user_id` ne porte AUCUNE cle etrangere : ces lignes ne
-- bloquaient pas la suppression, mais restaient derriere le compte. La route les purge
-- desormais.)
--
-- Ces lignes concernent D'AUTRES personnes : le document televerse appartient au
-- collaborateur, pas au RH qui l'a depose. Les supprimer effacerait le dossier d'un
-- tiers ; les garder empeche la suppression du compte. La seule issue correcte est de
-- DETACHER l'auteur — le document reste, son deposant devient inconnu.
--
-- C'est exactement le parti deja pris par `messages.sender_id` (20260922000000) : la
-- suppression d'un compte ne doit pas trouer l'historique de son interlocuteur.
--
-- CE QUE CELA CHANGE POUR L'INTERFACE : un `uploaded_by` nul s'affiche deja
-- « Utilisateur » (rh-workspace.tsx), et `uploader_role` reste renseigne — on sait donc
-- toujours si le depot venait d'un RH ou du collaborateur.
--
-- Idempotente : reexecutable sans effet de bord.
-- ============================================================================

do $$
declare
  target record;
  fk_name text;
  referenced_table text;
  referenced_column text;
begin
  for target in
    select *
    from (values
      -- L'auteur est detache, la ligne survit : elle appartient a quelqu'un d'autre.
      ('employee_documents',         'uploaded_by',  'set null', true),
      ('employee_documents',         'reviewed_by',  'set null', true),
      ('document_requests',          'requested_by', 'set null', true),
      ('rh_employee_assignments',    'created_by',   'set null', true),
      ('job_offers',                 'created_by',   'set null', true),
      ('news',                       'author_id',    'set null', true),
      -- Preferences d'affichage : strictement personnelles, elles partent avec le compte.
      ('user_dashboard_preferences', 'user_id',      'cascade',  false)
    ) as t(table_name, column_name, on_delete, make_nullable)
  loop
    -- Table ou colonne absente de cet environnement : rien a faire.
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = target.table_name
        and column_name = target.column_name
    ) then
      continue;
    end if;

    if target.make_nullable then
      execute format(
        'alter table public.%I alter column %I drop not null',
        target.table_name, target.column_name
      );
    end if;

    /*
      La cle etrangere est retrouvee par son contenu, pas par son nom : le schema n'a pas
      ete cree par migration, et les noms varient. On ne retient que les contraintes
      portant sur CETTE seule colonne.
    */
    select con.conname,
           con.confrelid::regclass::text,
           att.attname
      into fk_name, referenced_table, referenced_column
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    join pg_attribute src
      on src.attrelid = con.conrelid and src.attname = target.column_name
    join pg_attribute att
      on att.attrelid = con.confrelid and att.attnum = con.confkey[1]
    where con.contype = 'f'
      and nsp.nspname = 'public'
      and rel.relname = target.table_name
      and con.conkey = array[src.attnum]
    limit 1;

    if fk_name is null then
      raise notice 'Aucune cle etrangere sur %.% : rien a reecrire.',
        target.table_name, target.column_name;
      continue;
    end if;

    execute format(
      'alter table public.%I drop constraint %I',
      target.table_name, fk_name
    );
    execute format(
      'alter table public.%I add constraint %I foreign key (%I) references %s (%I) on delete %s',
      target.table_name, fk_name, target.column_name,
      referenced_table, referenced_column, target.on_delete
    );

    raise notice 'Cle etrangere %.% recreee en ON DELETE %.',
      target.table_name, target.column_name, target.on_delete;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Garde-fou
-- ---------------------------------------------------------------------------

/*
  Interrompt la migration si une colonne d'auteur est restee NOT NULL : la suppression
  d'un compte echouerait encore, et le message d'erreur serait aussi obscur qu'aujourd'hui.
*/
do $$
declare
  fautives text;
begin
  select string_agg(format('%s.%s', table_name, column_name), ', ')
  into fautives
  from information_schema.columns
  where table_schema = 'public'
    and is_nullable = 'NO'
    and (table_name, column_name) in (
      ('employee_documents', 'uploaded_by'),
      ('employee_documents', 'reviewed_by'),
      ('document_requests', 'requested_by'),
      ('job_offers', 'created_by'),
      ('news', 'author_id')
    );

  if fautives is not null then
    raise exception
      'Colonnes d''auteur encore NOT NULL : %. La suppression d''un compte resterait bloquee.',
      fautives;
  end if;
end $$;
