-- ============================================================================
-- Bataille navale dans la messagerie
-- ----------------------------------------------------------------------------
-- Deux changements par rapport aux échecs (20260929000000_messaging_games.sql) :
--
-- 1. Le type 'battleship' rejoint la contrainte de `games.game_type`.
--
-- 2. La bataille navale a une information CACHÉE : la position des bateaux. Or la ligne
--    `games` est lisible par les deux joueurs — c'est ce qui permet à Realtime de pousser
--    les coups. Y ranger les flottes reviendrait à les montrer à l'adversaire, qui n'aurait
--    qu'à ouvrir les outils du navigateur. Elles vivent donc dans `game_secrets`, sous RLS
--    SANS AUCUNE policy : ni lecture ni écriture pour `authenticated`, seul le service_role
--    y accède, et la table n'est pas publiée dans Realtime.
--
-- Idempotente : réexécutable sans effet de bord.
-- ============================================================================

alter table public.games drop constraint if exists games_game_type_check;
alter table public.games
  add constraint games_game_type_check check (game_type in ('chess', 'battleship'));

create table if not exists public.game_secrets (
  game_id uuid not null references public.games (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  -- Bataille navale : { ships: [[cellule, ...], ...] }.
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (game_id, profile_id)
);

alter table public.game_secrets enable row level security;

/*
  Aucune policy, volontairement : c'est ce qui rend la table invisible au navigateur.
  Ne pas en ajouter une « lecture de ses propres données » sans y réfléchir — elle serait
  sans danger en soi, mais c'est l'API qui renvoie à chacun sa flotte, et une seule porte
  d'entrée est plus simple à auditer.
*/
revoke all on public.game_secrets from anon, authenticated;

comment on table public.game_secrets is
  'Données cachées d''une partie (flottes de bataille navale). Service_role uniquement, jamais publiée dans Realtime.';
