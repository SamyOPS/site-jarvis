-- ============================================================================
-- Parametres du compte : photo de profil
-- ----------------------------------------------------------------------------
-- Les preferences d'apparence et de notification n'ont PAS besoin de migration :
-- elles se rangent dans `user_dashboard_preferences`, qui existe deja (RLS active
-- sans policy, donc ecriture et lecture par le service_role uniquement, via les
-- routes d'API). Seules deux nouvelles cles y sont introduites, cote application :
-- `account.appearance` et `account.notifications`.
--
-- Reste donc ici la photo de profil : une colonne, un bucket, ses regles.
--
-- Idempotente : reexecutable sans effet de bord.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Colonne
-- ---------------------------------------------------------------------------

/*
  On stocke le CHEMIN dans le bucket, pas une URL complete : une URL fige le domaine du
  projet Supabase et deviendrait fausse a la moindre migration d'environnement. L'URL
  publique se recompose a la lecture.
*/
alter table public.profiles
  add column if not exists avatar_url text;

comment on column public.profiles.avatar_url is
  'Chemin de la photo de profil dans le bucket `avatars`. Null = initiales affichees.';

-- ---------------------------------------------------------------------------
-- Bucket
-- ---------------------------------------------------------------------------

/*
  BUCKET PUBLIC, et c'est un arbitrage a connaitre.

  Une photo de profil s'affiche dans une balise <img>, qui ne sait pas porter d'en-tete
  d'autorisation. Les deux seules options sont donc un bucket public, ou des URL signees
  recalculees et glissees dans chaque reponse d'API ou un avatar apparait — liste des
  collaborateurs, annuaire, fil de messagerie, barre superieure.

  Le choix retenu est le bucket public avec un chemin non devinable :
  `<identifiant utilisateur>/<uuid>.<ext>`. Une photo reste donc lisible par qui connait
  son URL exacte, mais elle n'est pas enumerable et rien d'autre que des portraits
  d'utilisateurs internes n'y transite.

  Pour passer en prive : mettre `public = false` ci-dessous, puis signer les chemins dans
  les routes qui exposent un avatar. Le reste du schema ne bouge pas.
*/
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Regles d'acces au bucket
-- ---------------------------------------------------------------------------

/*
  L'ecriture est limitee au DOSSIER de l'utilisateur. `storage.foldername(name)` rend les
  segments du chemin : le premier doit etre son propre identifiant. Sans cette contrainte,
  n'importe quel compte authentifie pourrait remplacer la photo d'un autre.

  Les routes d'API passent par le service_role et ne sont pas soumises a ces policies ;
  elles restent la voie normale. Ces regles ferment la porte directe a PostgREST.
*/

drop policy if exists avatars_read_all on storage.objects;
create policy avatars_read_all
  on storage.objects
  for select
  to public
  using (bucket_id = 'avatars');

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
