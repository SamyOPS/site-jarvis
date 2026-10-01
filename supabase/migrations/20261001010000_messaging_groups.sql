-- ============================================================================
-- Groupes de discussion
-- ----------------------------------------------------------------------------
-- Un groupe est une conversation sans cle de binome (`pair_key` nulle), avec un nom et
-- autant de participants que voulu. Tout le reste est commun aux discussions a deux :
-- messages, lecture, suppression pour soi, rappels par e-mail, RLS (participation).
--
-- `created_by` gere le groupe (nom, membres). S'il le quitte, la gestion passe au plus
-- ancien membre restant (voir la route de depart).
--
-- Les evenements du groupe (creation, ajout, retrait, depart, renommage) sont des
-- messages `system` : sans auteur, ni non lus ni rappeles par e-mail.
--
-- Idempotente : reexecutable sans effet de bord.
-- ============================================================================

alter table public.conversations
  add column if not exists is_group boolean not null default false,
  add column if not exists title text;

alter table public.conversations drop constraint if exists conversations_group_shape_check;
alter table public.conversations
  add constraint conversations_group_shape_check check (
    (is_group and pair_key is null and title is not null and length(btrim(title)) between 1 and 80)
    or (not is_group and title is null)
  );

alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages
  add constraint messages_kind_check check (kind in ('message', 'game_result', 'system'));

-- Nouvelles colonnes rendues : changement de signature, la fonction est recreee.
drop function if exists public.messaging_overview(uuid);

create function public.messaging_overview(p_profile_id uuid)
returns table(
  conversation_id uuid,
  other_profile_id uuid,
  last_message_body text,
  last_message_at timestamp with time zone,
  last_message_sender_id uuid,
  unread_count bigint,
  is_group boolean,
  title text,
  created_by uuid
)
language sql
stable
set search_path to 'public'
as $$
  select
    c.id,
    other.profile_id,
    last_message.body,
    c.last_message_at,
    last_message.sender_id,
    coalesce(unread.total, 0),
    c.is_group,
    c.title,
    c.created_by
  from public.conversations c
  join public.conversation_participants me
    on me.conversation_id = c.id
   and me.profile_id = p_profile_id
  -- L'interlocuteur d'une discussion a deux. Un groupe n'en a pas : ses membres sont
  -- resolus a part.
  left join lateral (
    select p.profile_id
      from public.conversation_participants p
     where p.conversation_id = c.id
       and p.profile_id <> p_profile_id
       and not c.is_group
     limit 1
  ) other on true
  left join lateral (
    select m.body, m.sender_id
      from public.messages m
     where m.conversation_id = c.id
       and (me.cleared_at is null or m.created_at > me.cleared_at)
     order by m.created_at desc
     limit 1
  ) last_message on true
  left join lateral (
    select count(*) as total
      from public.messages m
     where m.conversation_id = c.id
       and m.kind = 'message'
       and m.created_at > me.last_read_at
       and (me.cleared_at is null or m.created_at > me.cleared_at)
       and (m.sender_id is null or m.sender_id <> p_profile_id)
  ) unread on true
  where me.cleared_at is null or c.last_message_at > me.cleared_at
  order by c.last_message_at desc;
$$;

/*
  Memes droits qu'avant : serveur seulement. Recreee, la fonction serait executable par
  tous par defaut — et elle prend l'identifiant du profil en parametre : n'importe qui
  lirait les conversations de n'importe qui.
*/
revoke all on function public.messaging_overview(uuid) from public, anon, authenticated;
grant execute on function public.messaging_overview(uuid) to service_role;
