-- ============================================================================
-- Jeux dans la messagerie
-- ----------------------------------------------------------------------------
-- Une partie naît d'une conversation : l'un des participants la propose, un message
-- d'invitation part dans le fil, l'autre la rejoint en cliquant dessus.
--
-- Même partage des responsabilités que 20260922000000_messaging.sql : RLS ne porte que
-- la LECTURE (pour que Realtime pousse les coups aux deux joueurs), toute écriture passe
-- par les routes d'API en service_role. C'est là, et seulement là, qu'un coup est
-- validé contre les règles : une policy d'écriture laisserait un joueur réécrire
-- l'échiquier depuis la console du navigateur.
--
-- Idempotente : réexécutable sans effet de bord.
-- ============================================================================

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  /*
    Type de jeu. La contrainte ne connaît que les échecs pour l'instant : chaque nouveau
    jeu élargit la liste, ce qui force à écrire sa validation côté serveur avant de
    pouvoir en créer une partie.
  */
  game_type text not null check (game_type in ('chess')),
  /*
    pending  : invitation envoyée, personne n'a rejoint ;
    active   : les deux joueurs sont assis, la partie se joue ;
    finished : terminée (mat, pat, nulle, abandon).
  */
  status text not null default 'pending' check (status in ('pending', 'active', 'finished')),
  created_by uuid references public.profiles (id) on delete set null,
  /*
    Joueurs. Pour les échecs : player_one a les blancs, player_two les noirs. Des noms
    neutres plutôt que white/black : les prochains jeux n'auront pas de couleurs.
  */
  player_one_id uuid references public.profiles (id) on delete set null,
  player_two_id uuid references public.profiles (id) on delete set null,
  /*
    État propre au jeu, en jsonb pour ne pas ajouter une table par jeu. Pour les échecs :
    { fen, moves: [SAN...], lastMove: {from, to} }. La liste des coups est gardée, pas
    seulement la position : la nulle par triple répétition ne se détecte qu'avec
    l'historique.
  */
  state jsonb not null default '{}'::jsonb,
  -- Issue : 'player_one' | 'player_two' | 'draw', et sa raison (checkmate, resign...).
  result text check (result in ('player_one', 'player_two', 'draw')),
  result_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists games_conversation_idx
  on public.games (conversation_id, created_at desc);

/*
  Le message d'invitation pointe vers sa partie. ON DELETE SET NULL : si la partie
  disparaît, le message reste lisible comme un message ordinaire.
*/
alter table public.messages
  add column if not exists game_id uuid references public.games (id) on delete set null;

-- ---------------------------------------------------------------------------
-- RLS : lecture seule, restreinte aux participants de la conversation
-- ---------------------------------------------------------------------------

alter table public.games enable row level security;

drop policy if exists games_select_participant on public.games;
create policy games_select_participant
  on public.games
  for select
  to authenticated
  using (public.is_conversation_participant(conversation_id));

-- ---------------------------------------------------------------------------
-- Realtime : chaque coup est un UPDATE de la ligne, poussé aux deux joueurs
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
      from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'games'
  ) then
    alter publication supabase_realtime add table public.games;
  end if;
exception
  when undefined_object then
    raise notice 'publication supabase_realtime absente, Realtime non active pour games';
end;
$$;

comment on table public.games is
  'Parties lancées depuis la messagerie. Écriture réservée au service_role, coups validés par l''API.';
comment on column public.messages.game_id is
  'Partie à laquelle ce message invite, le cas échéant.';
