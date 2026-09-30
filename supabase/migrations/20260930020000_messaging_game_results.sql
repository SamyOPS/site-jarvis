-- ============================================================================
-- Resultat des parties dans le fil, et score entre deux joueurs
-- ----------------------------------------------------------------------------
-- A la fin d'une partie, un message de type `game_result` est poste dans la
-- conversation. Il porte dans `meta` le score cumule des deux participants a CE jeu
-- (victoires de chacun, nuls), fige au moment de la partie : relire un vieux resultat
-- montre le score d'alors, pas celui d'aujourd'hui.
--
-- Le texte (« 3 victoires - 1 defaite ») n'est pas stocke : il depend de qui lit.
-- `body` ne sert qu'a l'apercu de la liste des conversations.
--
-- Un message de resultat n'est PAS un message a lire : il ne compte pas dans les non-lus
-- (`messaging_overview`) et ne declenche pas de rappel par e-mail (la route de rappel
-- filtre sur `kind`, et il est cree deja marque comme notifie).
--
-- Idempotente : reexecutable sans effet de bord.
-- ============================================================================

alter table public.messages
  add column if not exists kind text not null default 'message',
  add column if not exists meta jsonb;

alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages
  add constraint messages_kind_check check (kind in ('message', 'game_result'));

-- Un seul resultat par partie : filet contre une double cloture.
create unique index if not exists messages_game_result_unique
  on public.messages (game_id)
  where kind = 'game_result';

-- Non-lus : les messages de resultat sont exclus.
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
     order by m.created_at desc
     limit 1
  ) last_message on true
  left join lateral (
    select count(*) as total
      from public.messages m
     where m.conversation_id = c.id
       and m.kind = 'message'
       and m.created_at > me.last_read_at
       and (m.sender_id is null or m.sender_id <> p_profile_id)
  ) unread on true
  order by c.last_message_at desc;
$$;

-- ----------------------------------------------------------------------------
-- Reprise des parties deja terminees : un resultat chacune, a sa date de fin, avec le
-- score cumule jusqu'a elle. Le catalogue (icone, nom) reprend src/domain/games.ts.
-- ----------------------------------------------------------------------------
with finished as (
  select
    g.*,
    case g.result
      when 'player_one' then g.player_one_id
      when 'player_two' then g.player_two_id
    end as winner_id
  from public.games g
  where g.status = 'finished'
    and not exists (
      select 1 from public.messages m where m.game_id = g.id and m.kind = 'game_result'
    )
),
catalog(game_type, icon, name) as (
  values
    ('chess', '♟️', 'Échecs'),
    ('checkers', '⚪', 'Dames'),
    ('connect_four', '🔴', 'Puissance 4'),
    ('tic_tac_toe', '❌', 'Morpion'),
    ('battleship', '🚢', 'Bataille navale'),
    ('guess_who', '🕵️', 'Qui est-ce ?'),
    ('mastermind', '🎯', 'Mastermind')
)
insert into public.messages (conversation_id, sender_id, body, created_at, game_id, kind, meta, email_notified_at)
select
  f.conversation_id,
  null,
  c.icon || ' Partie de ' || c.name || case when f.result is null then ' annulée' else ' terminée' end,
  f.updated_at,
  f.id,
  'game_result',
  jsonb_build_object(
    'gameType', f.game_type,
    'outcome', case when f.result is null then 'cancelled' when f.result = 'draw' then 'draw' else 'win' end,
    'winnerId', f.winner_id,
    'reason', f.result_reason,
    'players', jsonb_build_array(f.player_one_id, f.player_two_id),
    'wins', jsonb_build_object(
      f.player_one_id::text, (
        select count(*) from public.games h
        where h.conversation_id = f.conversation_id and h.game_type = f.game_type
          and h.status = 'finished' and h.updated_at <= f.updated_at
          and ((h.result = 'player_one' and h.player_one_id = f.player_one_id)
            or (h.result = 'player_two' and h.player_two_id = f.player_one_id))
      ),
      coalesce(f.player_two_id::text, 'none'), (
        select count(*) from public.games h
        where h.conversation_id = f.conversation_id and h.game_type = f.game_type
          and h.status = 'finished' and h.updated_at <= f.updated_at
          and ((h.result = 'player_one' and h.player_one_id = f.player_two_id)
            or (h.result = 'player_two' and h.player_two_id = f.player_two_id))
      )
    ) - 'none',
    'draws', (
      select count(*) from public.games h
      where h.conversation_id = f.conversation_id and h.game_type = f.game_type
        and h.status = 'finished' and h.result = 'draw' and h.updated_at <= f.updated_at
    )
  ),
  now()
from finished f
join catalog c on c.game_type = f.game_type
where f.player_one_id is not null;

-- Le declencheur d'insertion a recale `last_message_at` sur la date de ces resultats
-- anciens : on le remet sur le vrai dernier message.
update public.conversations c
set last_message_at = latest.created_at
from (
  select conversation_id, max(created_at) as created_at
  from public.messages
  group by conversation_id
) latest
where latest.conversation_id = c.id
  and c.last_message_at is distinct from latest.created_at;
