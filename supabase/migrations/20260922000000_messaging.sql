-- ============================================================================
-- Messagerie interne
-- ----------------------------------------------------------------------------
-- Conversations a deux entre comptes de la console : consultant, RH, admin.
--
-- PARTAGE DES RESPONSABILITES ENTRE RLS ET LES ROUTES
-- La regle « qui a le droit d'ecrire a qui » depend des affectations RH
-- (`rh_employee_assignments`) et n'est PAS exprimable simplement en policy. Elle est
-- donc tenue par les routes d'API, qui utilisent la cle service_role et contournent RLS
-- par construction (voir src/lib/messaging-access.ts).
--
-- RLS ne porte ici que la LECTURE, et pour une raison precise : le navigateur s'abonne
-- au flux Realtime de `messages`. Realtime evalue les policies de SELECT avec le jeton
-- de l'utilisateur — sans policy, personne ne recoit rien ; avec une policy trop large,
-- tout le monde recoit tout. Les policies ci-dessous disent exactement « les lignes des
-- conversations auxquelles je participe ».
--
-- AUCUNE policy d'ecriture n'est posee, volontairement : `insert`, `update` et `delete`
-- restent le privilege du service_role. Un utilisateur ne peut donc pas forger un
-- message depuis le navigateur en appelant PostgREST a la main, ni se rajouter a une
-- conversation. Ne pas ajouter de policy d'ecriture sans deplacer d'abord le controle
-- d'habilitation dans la base.
--
-- Idempotente : reexecutable sans effet de bord.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  /*
    Cle de binome : les deux identifiants de participants tries et concatenes.
    Denormalise a dessein. C'est ce qui rend « ouvrir la conversation avec X »
    idempotent ET a l'abri des courses : deux onglets qui cliquent en meme temps
    produisent la meme cle, et l'unicite fait echouer le second insert au lieu de creer
    un doublon. Sans elle, il faudrait interroger les participants puis inserer, avec
    une fenetre entre les deux.

    Nullable pour ne pas fermer la porte aux conversations de groupe : elles n'ont pas
    de binome, et porteront leur propre titre.
  */
  pair_key text unique,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  /*
    Date du dernier message, tenue par un declencheur plutot que par les routes : le tri
    de la liste des conversations ne doit pas dependre du fait qu'un appelant ait pense
    a la mettre a jour.
  */
  last_message_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  /*
    Marque de lecture. Le nombre de non-lus se deduit : les messages de la conversation
    posterieurs a cette date et dont je ne suis pas l'auteur. Pas de table de lecture
    par message — a deux participants, la date suffit et se met a jour en une ecriture.
  */
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, profile_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  /*
    ON DELETE SET NULL : la suppression d'un compte ne doit pas trouer la conversation
    de son interlocuteur. Le message reste, son auteur devient inconnu.
  */
  sender_id uuid references public.profiles (id) on delete set null,
  body text not null check (length(btrim(body)) > 0),
  created_at timestamptz not null default now(),
  /*
    Date d'envoi du rappel par e-mail. Nulle tant qu'aucun rappel n'est parti. Sert
    d'idempotence a la tache de notification : un message n'est jamais rappele deux fois,
    meme si la tache est rejouee.
  */
  email_notified_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Index
-- ---------------------------------------------------------------------------

-- Fil d'une conversation, du plus recent au plus ancien : c'est la seule lecture chaude.
create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at desc);

-- Balayage de la tache de rappel : uniquement les messages jamais notifies.
create index if not exists messages_pending_notification_idx
  on public.messages (created_at)
  where email_notified_at is null;

-- « Mes conversations », et jointure vers les participants.
create index if not exists conversation_participants_profile_idx
  on public.conversation_participants (profile_id);

create index if not exists conversations_last_message_idx
  on public.conversations (last_message_at desc);

-- ---------------------------------------------------------------------------
-- Declencheur : remonter la conversation a chaque message
-- ---------------------------------------------------------------------------

create or replace function public.touch_conversation_last_message()
returns trigger
language plpgsql
security definer
-- Fige comme dans 20260807000000 : sans cela, une table homonyme placee dans un schema
-- prioritaire detournerait l'ecriture.
set search_path = public
as $$
begin
  update public.conversations
     set last_message_at = new.created_at
   where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation
  after insert on public.messages
  for each row
  execute function public.touch_conversation_last_message();

-- ---------------------------------------------------------------------------
-- Appartenance a une conversation
-- ---------------------------------------------------------------------------

/*
  SECURITY DEFINER, et ce n'est pas un detail.

  La policy de `conversation_participants` doit repondre « cette ligne appartient-elle a
  une conversation ou je figure ? ». La reponse se lit dans conversation_participants
  elle-meme : evaluer la policy declencherait une lecture de la table, donc l'evaluation
  de la policy, donc... `infinite recursion detected in policy`. C'est le meme piege que
  `is_admin()` dans 20260814000000, et il est ici structurel, pas accidentel.

  SECURITY DEFINER fait tourner la fonction avec les droits de son proprietaire : RLS est
  contournee a l'interieur, la boucle disparait. `auth.uid()` continue de lire la
  revendication du jeton de l'appelant — la semantique est donc inchangee.
*/
create or replace function public.is_conversation_participant(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.conversation_participants
     where conversation_id = target_conversation_id
       and profile_id = auth.uid()
  );
$$;

comment on function public.is_conversation_participant(uuid) is
  'Vrai si l''appelant participe a la conversation. SECURITY DEFINER pour eviter la recursion des policies.';

-- ---------------------------------------------------------------------------
-- RLS : lecture seule, restreinte aux participants
-- ---------------------------------------------------------------------------

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

drop policy if exists conversations_select_participant on public.conversations;
create policy conversations_select_participant
  on public.conversations
  for select
  to authenticated
  using (public.is_conversation_participant(id));

drop policy if exists conversation_participants_select_participant on public.conversation_participants;
create policy conversation_participants_select_participant
  on public.conversation_participants
  for select
  to authenticated
  using (public.is_conversation_participant(conversation_id));

drop policy if exists messages_select_participant on public.messages;
create policy messages_select_participant
  on public.messages
  for select
  to authenticated
  using (public.is_conversation_participant(conversation_id));

-- ---------------------------------------------------------------------------
-- Vue d'ensemble des conversations
-- ---------------------------------------------------------------------------

/*
  Une conversation de la liste demande quatre choses : l'autre participant, le dernier
  message, sa date et le nombre de non-lus. Les obtenir depuis la route ferait deux
  requetes PAR conversation — le dernier message et le compte — soit un nombre d'appels
  proportionnel au nombre de fils. Les trois `lateral` ci-dessous les ramenent en une
  seule passe, en s'appuyant sur l'index (conversation_id, created_at desc).

  ACCES : la fonction prend le profil en parametre, elle ne le deduit pas de `auth.uid()`
  — elle est appelee avec la cle service_role, qui n'a pas de session. L'execution est
  donc RETIREE a `public` juste apres : sans ce revoke, n'importe quel utilisateur
  authentifie pourrait l'appeler via PostgREST avec l'identifiant d'un autre et lire ses
  conversations. C'est le point sensible de ce fichier.
*/
create or replace function public.messaging_overview(p_profile_id uuid)
returns table (
  conversation_id uuid,
  other_profile_id uuid,
  last_message_body text,
  last_message_at timestamptz,
  last_message_sender_id uuid,
  unread_count bigint
)
language sql
stable
set search_path = public
as $$
  select
    c.id,
    other.profile_id,
    last_message.body,
    c.last_message_at,
    last_message.sender_id,
    coalesce(unread.total, 0)
  from public.conversations c
  join public.conversation_participants me
    on me.conversation_id = c.id
   and me.profile_id = p_profile_id
  left join lateral (
    select p.profile_id
      from public.conversation_participants p
     where p.conversation_id = c.id
       and p.profile_id <> p_profile_id
     limit 1
  ) other on true
  left join lateral (
    select m.body, m.sender_id
      from public.messages m
     where m.conversation_id = c.id
     order by m.created_at desc
     limit 1
  ) last_message on true
  left join lateral (
    select count(*) as total
      from public.messages m
     where m.conversation_id = c.id
       and m.created_at > me.last_read_at
       and (m.sender_id is null or m.sender_id <> p_profile_id)
  ) unread on true
  order by c.last_message_at desc;
$$;

revoke execute on function public.messaging_overview(uuid) from public;
grant execute on function public.messaging_overview(uuid) to service_role;

comment on function public.messaging_overview(uuid) is
  'Liste des conversations d''un profil, avec dernier message et non-lus. Reservee au service_role.';

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

/*
  Seule `messages` est publiee. La liste des conversations se recalcule a la reception
  d'un message : publier `conversations` en plus ferait un second evenement pour le meme
  fait, et le declencheur ci-dessus garantit qu'ils arriveraient dans un ordre non defini.

  `add table` echoue si la table est deja publiee : le garde rend la migration rejouable.
*/
do $$
begin
  if not exists (
    select 1
      from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
exception
  when undefined_object then
    -- Publication absente (base locale montee sans Realtime) : la messagerie retombe
    -- alors sur son rafraichissement periodique, ce n'est pas une raison d'interrompre.
    raise notice 'publication supabase_realtime absente, Realtime non active pour messages';
end;
$$;

comment on table public.conversations is
  'Conversation de messagerie interne. pair_key porte le binome et garantit l''unicite.';
comment on table public.conversation_participants is
  'Participants d''une conversation, avec leur marque de lecture.';
comment on table public.messages is
  'Messages de la messagerie interne. Ecriture reservee au service_role.';
