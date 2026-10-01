-- ============================================================================
-- Suppression d'une discussion, pour soi seulement
-- ----------------------------------------------------------------------------
-- Supprimer une discussion ne detruit rien : la date `cleared_at` du participant marque
-- le point en dessous duquel il ne voit plus le fil. L'autre participant garde tout.
--
-- La discussion disparait de la liste tant qu'aucun message ne suit cette date. Un
-- nouveau message — de l'un ou de l'autre — la fait reapparaitre, avec ce seul message :
-- l'historique efface ne revient pas.
--
-- Idempotente : reexecutable sans effet de bord.
-- ============================================================================

alter table public.conversation_participants
  add column if not exists cleared_at timestamptz;

create or replace function public.messaging_overview(p_profile_id uuid)
returns table(
  conversation_id uuid,
  other_profile_id uuid,
  last_message_body text,
  last_message_at timestamp with time zone,
  last_message_sender_id uuid,
  unread_count bigint
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
  -- Discussion supprimee et rien de neuf depuis : elle n'apparait pas.
  where me.cleared_at is null or c.last_message_at > me.cleared_at
  order by c.last_message_at desc;
$$;
