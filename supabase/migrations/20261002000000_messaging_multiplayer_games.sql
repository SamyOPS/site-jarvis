-- ============================================================================
-- Jeux à plusieurs : UNO, morpion à 3, petits chevaux, quiz
-- ----------------------------------------------------------------------------
-- Les jeux à deux gardent leurs deux places (`player_one_id`, `player_two_id`). Les jeux
-- à plusieurs rangent leurs joueurs dans `players`, dans l'ordre du tour, et leur
-- gagnant dans `winner_id` (`result = 'winner'`).
--
-- Rien d'autre à ouvrir : les mains d'UNO et les réponses du quiz vivent dans
-- `game_secrets`, déjà fermée au navigateur, une ligne par joueur.
--
-- Idempotente : réexécutable sans effet de bord.
-- ============================================================================

alter table public.games
  add column if not exists players uuid[] not null default '{}',
  add column if not exists winner_id uuid references public.profiles(id) on delete set null;

alter table public.games drop constraint if exists games_game_type_check;
alter table public.games
  add constraint games_game_type_check check (
    game_type in (
      'chess',
      'battleship',
      'connect_four',
      'tic_tac_toe',
      'checkers',
      'guess_who',
      'mastermind',
      'uno',
      'tic_tac_toe_3',
      'ludo',
      'quiz'
    )
  );

alter table public.games drop constraint if exists games_result_check;
alter table public.games
  add constraint games_result_check check (result in ('player_one', 'player_two', 'draw', 'winner'));
