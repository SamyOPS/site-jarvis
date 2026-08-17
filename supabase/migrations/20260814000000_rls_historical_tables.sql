-- ============================================================================
-- RLS sur les tables lues depuis le navigateur.
--
-- POURQUOI
-- Le tableau de bord RH lit `profiles`, `employee_documents`, `document_requests`,
-- `document_types`, `job_offers` et `applications` directement avec la cle anon, et
-- filtre les habilitations DANS LE NAVIGATEUR (closures `canAccessEmployee` /
-- `canAccessDocumentType` de rh-workspace.tsx). Un utilisateur authentifie qui appelle
-- l'API PostgREST a la main contourne donc entierement ce filtrage.
--
-- Les routes API ne sont PAS concernees : elles utilisent la cle service_role, qui
-- contourne RLS par construction.
--
-- ECRIT CONTRE LE SCHEMA REEL (releve du 14/08/2026). Points verifies :
--   applications.candidate_id, applications.job_id  (et non job_offer_id)
--   job_offers.created_by, job_offers.status
--   news.author_id, news.status
--   profile_cvs.user_id
--   rh_employee_assignments (rh_id, employee_id)
-- `contact_messages` n'existait pas alors que le formulaire de contact y insere : cette
-- migration la cree (voir le bloc dedie plus bas).
--
-- `is_admin()` existait SANS SECURITY DEFINER, ce qui aurait provoque une recursion
-- infinie sur `profiles` des l'activation. Corrige ci-dessous, avec un garde-fou qui
-- interrompt la migration si le cas se represente.
--
-- CE QUI PEUT CASSER
-- `job_offers` et `news` sont ecrites depuis le navigateur (creation et edition d'offre
-- cote admin et pro, editeur d'actualites). Sans policy d'ecriture, ces ecrans cessent
-- de fonctionner. Elles sont incluses ci-dessous — ne pas les retirer sans avoir
-- d'abord deplace ces ecritures vers une route serveur.
--
-- AVANT D'APPLIQUER
-- 1. Passer DIAGNOSTIC_rls.sql. Ce fichier ne remplace jamais une policy existante :
--    une policy deja en place et plus permissive annulerait le benefice.
-- 2. Appliquer sur une preproduction, puis parcourir : tableau de bord RH
--    (collaborateurs, documents, demandes, offres, candidatures), espace salarie,
--    creation et edition d'offre depuis l'admin ET depuis le pro, editeur d'actualites,
--    site public (/offres, /actus).
-- 3. En cas de blocage : `alter table public.<nom> disable row level security;`
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Fonctions d'aide
-- ---------------------------------------------------------------------------

-- `is_admin()` existe deja (verifie le 14/08/2026) mais N'EST PAS SECURITY DEFINER.
--
-- C'EST BLOQUANT. Son corps lit `public.profiles`, et la policy `profiles_select_scoped`
-- ci-dessous l'appelle. Sans SECURITY DEFINER, la fonction s'execute avec les droits de
-- l'appelant, donc soumise a RLS :
--
--   evaluer la policy de profiles -> appeler is_admin() -> lire profiles
--     -> evaluer la policy de profiles -> ... => infinite recursion detected
--
-- C'est le piege classique de RLS sous Supabase, et il ferait tomber tout le tableau de
-- bord des l'activation. SECURITY DEFINER fait tourner la fonction avec les droits de
-- son proprietaire (postgres, qui possede les tables) : RLS est alors contournee et la
-- boucle disparait. `auth.uid()` continue de fonctionner, il lit la revendication du
-- JWT dans la session — la semantique de la fonction est donc inchangee.
--
-- `search_path` fige pour la meme raison que dans 20260807000000 : sans cela, une table
-- `profiles` placee dans un schema prioritaire detournerait le controle d'admin.
--
-- Effet de bord assume : protect_profile_critical_fields appelle aussi is_admin(). Le
-- changement le rend plus fiable — le declencheur doit connaitre le role reel de
-- l'appelant, que RLS l'autorise ou non a lire sa propre ligne.
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_admin'
  ) then
    alter function public.is_admin() security definer;
    alter function public.is_admin() set search_path = public, pg_temp;
    raise notice 'public.is_admin() passee en SECURITY DEFINER (evite la recursion RLS).';
  else
    execute $fn$
      create function public.is_admin()
      returns boolean
      language sql
      stable
      security definer
      set search_path = public, pg_temp
      as $body$
        select exists (
          select 1 from public.profiles
          where id = auth.uid() and role = 'admin'
        );
      $body$;
    $fn$;
    raise notice 'public.is_admin() etait absente : creee.';
  end if;
end $$;

-- Equivalent SQL de `canRhAccessEmployee` (src/lib/rh-access.ts), restriction par type
-- de document exceptee — celle-ci reste appliquee cote serveur, ou elle dispose du
-- contexte du document.
--
-- SECURITY DEFINER est indispensable : la fonction lit `rh_employee_assignments` et
-- `profiles`, sur lesquelles l'appelant n'a par definition pas de droit de lecture
-- generalise. `search_path` fige pour la meme raison que dans 20260807000000 : sans
-- cela, une table homonyme dans un schema prioritaire detournerait le controle.
create or replace function public.is_rh_for(target_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles me
    where me.id = auth.uid() and me.role = 'rh'
  )
  and (
    target_employee_id = auth.uid()
    or exists (
      select 1 from public.rh_employee_assignments a
      where a.rh_id = auth.uid() and a.employee_id = target_employee_id
    )
  );
$$;

comment on function public.is_rh_for(uuid) is
  'Vrai si l''appelant est un RH affecte a ce collaborateur, ou le collaborateur lui-meme. Equivalent SQL de canRhAccessEmployee (src/lib/rh-access.ts).';

-- Le role de l'appelant, pour les policies qui ne dependent pas d'un collaborateur.
create or replace function public.current_role_name()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- contact_messages : table manquante
--
-- src/app/contact/page.tsx:179 insere dans cette table, qui n'existe pas. Le formulaire
-- envoie donc bien son e-mail, puis affiche « Impossible d'envoyer le message pour le
-- moment. » au visiteur, qui le renvoie sans doute.
--
-- Les colonnes reprennent exactement le payload envoye par le formulaire.
-- Si tu preferes retirer cette insertion du code plutot que stocker les messages,
-- supprime ce bloc ET la policy `contact_messages_insert_public` plus bas.
-- ---------------------------------------------------------------------------

create table if not exists public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  first_name  text,
  last_name   text,
  subject     text,
  message     text not null,
  source      text not null default 'contact-page',
  created_at  timestamp with time zone not null default now()
);

create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);

-- ---------------------------------------------------------------------------
-- Activation
-- ---------------------------------------------------------------------------

alter table public.profiles                   enable row level security;
alter table public.employee_documents         enable row level security;
alter table public.document_requests          enable row level security;
alter table public.document_types             enable row level security;
alter table public.job_offers                 enable row level security;
alter table public.applications               enable row level security;
alter table public.profile_cvs                enable row level security;
alter table public.news                       enable row level security;
alter table public.contact_messages           enable row level security;

-- Jamais lues depuis le navigateur : RLS SANS policy, donc fermees a anon et
-- authenticated. Le service_role continue de passer, donc les routes API fonctionnent.
alter table public.document_folders           enable row level security;
alter table public.cra_records                enable row level security;
alter table public.cra_entries                enable row level security;
alter table public.employee_billing_profiles  enable row level security;
alter table public.document_events            enable row level security;
alter table public.rh_employee_assignments    enable row level security;
alter table public.user_dashboard_preferences enable row level security;

-- ---------------------------------------------------------------------------
-- Garde-fou anti-recursion
--
-- Les trois fonctions appelees par les policies lisent `profiles`. Si l'une d'elles
-- n'est pas SECURITY DEFINER, les policies posees juste apres provoqueront une recursion
-- infinie a la premiere requete — et le tableau de bord tombera. On refuse donc de les
-- creer plutot que de laisser passer.
--
-- Le proprietaire compte autant que le drapeau : SECURITY DEFINER ne contourne RLS que
-- si le proprietaire de la fonction possede aussi la table (postgres, sous Supabase).
-- ---------------------------------------------------------------------------
do $$
declare
  fautives text;
begin
  select string_agg(p.proname, ', ')
  into fautives
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('is_admin', 'is_rh_for', 'current_role_name')
    and not p.prosecdef;

  if fautives is not null then
    raise exception
      'Fonctions non SECURITY DEFINER : %. Les policies ci-dessous provoqueraient une recursion infinie sur profiles. Migration interrompue.',
      fautives;
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join pg_roles r on r.oid = p.proowner
    join pg_class c on c.relname = 'profiles'
    join pg_namespace cn on cn.oid = c.relnamespace and cn.nspname = 'public'
    where n.nspname = 'public'
      and p.proname = 'is_admin'
      and p.proowner = c.relowner
  ) then
    raise warning
      'is_admin() n''appartient pas au proprietaire de public.profiles : SECURITY DEFINER pourrait ne pas contourner RLS. A verifier apres application.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Policies — creees uniquement si absentes, pour rester rejouable (meme motif que la
-- migration 20260811000000).
-- ---------------------------------------------------------------------------

do $$
begin

  -- profiles ----------------------------------------------------------------
  -- Son propre profil ; ses collaborateurs affectes pour un RH ; tout pour un admin.
  -- L'ecriture de `role` et `professional_status` reste verrouillee par le declencheur
  -- protect_profile_critical_fields, conserve tel quel.
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_select_scoped') then
    create policy profiles_select_scoped on public.profiles
      for select to authenticated
      using (id = auth.uid() or public.is_admin() or public.is_rh_for(id));
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_update_own') then
    create policy profiles_update_own on public.profiles
      for update to authenticated
      using (id = auth.uid() or public.is_admin())
      with check (id = auth.uid() or public.is_admin());
  end if;

  -- employee_documents ------------------------------------------------------
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='employee_documents' and policyname='employee_documents_select_scoped') then
    create policy employee_documents_select_scoped on public.employee_documents
      for select to authenticated
      using (
        employee_id = auth.uid()
        or uploaded_by = auth.uid()
        or public.is_admin()
        or public.is_rh_for(employee_id)
      );
  end if;

  -- document_requests -------------------------------------------------------
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='document_requests' and policyname='document_requests_select_scoped') then
    create policy document_requests_select_scoped on public.document_requests
      for select to authenticated
      using (
        employee_id = auth.uid()
        or requested_by = auth.uid()
        or public.is_admin()
        or public.is_rh_for(employee_id)
      );
  end if;

  -- document_types ----------------------------------------------------------
  -- Table de configuration, sans donnee personnelle.
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='document_types' and policyname='document_types_select_all') then
    create policy document_types_select_all on public.document_types
      for select to authenticated
      using (true);
  end if;

  -- job_offers --------------------------------------------------------------
  -- Les offres publiees alimentent le site public, donc lisibles par `anon`.
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='job_offers' and policyname='job_offers_select_published') then
    create policy job_offers_select_published on public.job_offers
      for select to anon, authenticated
      using (status = 'published');
  end if;

  -- Un auteur voit ses propres brouillons et archives.
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='job_offers' and policyname='job_offers_select_own') then
    create policy job_offers_select_own on public.job_offers
      for select to authenticated
      using (created_by = auth.uid() or public.is_admin());
  end if;

  -- Le RH voit TOUTES les offres, y compris brouillons et archives d'autrui.
  -- Ce n'est pas une largesse : rh-workspace.tsx fait `mappedJobOffers = offersRes.data`
  -- sans aucun filtre, et affiche les onglets « Offres actives / Candidatures /
  -- Archives ». Sans cette policy, un RH perdrait les offres creees par l'admin.
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='job_offers' and policyname='job_offers_select_rh') then
    create policy job_offers_select_rh on public.job_offers
      for select to authenticated
      using (public.current_role_name() = 'rh');
  end if;

  -- Ecritures depuis le navigateur : espaces admin et pro.
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='job_offers' and policyname='job_offers_insert_own') then
    create policy job_offers_insert_own on public.job_offers
      for insert to authenticated
      with check (created_by = auth.uid() or public.is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='job_offers' and policyname='job_offers_update_own') then
    create policy job_offers_update_own on public.job_offers
      for update to authenticated
      using (created_by = auth.uid() or public.is_admin())
      with check (created_by = auth.uid() or public.is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='job_offers' and policyname='job_offers_delete_own') then
    create policy job_offers_delete_own on public.job_offers
      for delete to authenticated
      using (created_by = auth.uid() or public.is_admin());
  end if;

  -- applications ------------------------------------------------------------
  -- Reprend le filtrage deja applique dans le navigateur : rh-workspace.tsx garde les
  -- candidatures dont le CANDIDAT est un collaborateur affecte
  -- (`.filter((a) => canAccessEmployee(a.candidateId))`). On y ajoute le lien par
  -- l'offre, que le schema expose via `applications.job_id` : un RH ou un pro doit voir
  -- les candidatures deposees sur les offres qu'il a publiees.
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='applications' and policyname='applications_select_scoped') then
    create policy applications_select_scoped on public.applications
      for select to authenticated
      using (
        candidate_id = auth.uid()
        or public.is_admin()
        or public.is_rh_for(candidate_id)
        or exists (
          select 1 from public.job_offers o
          where o.id = applications.job_id and o.created_by = auth.uid()
        )
      );
  end if;

  -- Le candidat depose sa candidature depuis le navigateur.
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='applications' and policyname='applications_insert_own') then
    create policy applications_insert_own on public.applications
      for insert to authenticated
      with check (candidate_id = auth.uid());
  end if;

  -- profile_cvs -------------------------------------------------------------
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profile_cvs' and policyname='profile_cvs_select_own') then
    create policy profile_cvs_select_own on public.profile_cvs
      for select to authenticated
      using (user_id = auth.uid() or public.is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profile_cvs' and policyname='profile_cvs_write_own') then
    create policy profile_cvs_write_own on public.profile_cvs
      for all to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;

  -- news --------------------------------------------------------------------
  -- Les actualites publiees alimentent le site public.
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='news' and policyname='news_select_published') then
    create policy news_select_published on public.news
      for select to anon, authenticated
      using (status = 'published');
  end if;

  -- L'editeur d'actualites ecrit depuis le navigateur, et /dashboard/actus refuse tout
  -- role autre qu'admin (`if (profileData.role !== "admin")`). La policy reprend ce
  -- perimetre a l'identique.
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='news' and policyname='news_all_admin') then
    create policy news_all_admin on public.news
      for all to authenticated
      using (public.is_admin())
      with check (public.is_admin());
  end if;

  -- contact_messages --------------------------------------------------------
  -- Le formulaire public depose un message sans etre connecte. Personne ne relit la
  -- table depuis le navigateur : pas de policy SELECT, seul le service_role y accede.
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='contact_messages' and policyname='contact_messages_insert_public') then
    create policy contact_messages_insert_public on public.contact_messages
      for insert to anon, authenticated
      with check (true);
  end if;

end $$;

-- ---------------------------------------------------------------------------
-- Verification : aucune table active ne doit rester sans policy, hors celles
-- volontairement fermees.
-- ---------------------------------------------------------------------------
do $$
declare
  orpheline text;
begin
  select string_agg(c.relname, ', ')
  into orpheline
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relrowsecurity
    and c.relname not in (
      'document_folders', 'cra_records', 'cra_entries',
      'employee_billing_profiles', 'document_events',
      'rh_employee_assignments', 'user_dashboard_preferences',
      'job_applications', 'employee_missions', 'cra_mission_lines'
    )
    and not exists (
      select 1 from pg_policies p
      where p.schemaname = 'public' and p.tablename = c.relname
    );

  if orpheline is not null then
    raise exception 'RLS active sans policy sur : %. Ces tables sont inaccessibles depuis le navigateur.', orpheline;
  end if;
end $$;

-- ============================================================================
-- NOTE
--
-- `public.job_applications` (migration 20260713000000) porte deja RLS sans policy : les
-- candidatures avec CV ne transitent que par la route serveur. Rien a faire ici.
-- ============================================================================
