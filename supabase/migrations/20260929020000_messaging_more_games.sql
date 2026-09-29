-- ============================================================================
-- Nouveaux jeux de la messagerie : Puissance 4, morpion, dames, Qui est-ce ?, Mastermind
-- ----------------------------------------------------------------------------
-- Rien d'autre que la contrainte de type : l'état de chaque jeu tient dans
-- `games.state`, et ses données cachées (personnage de Qui est-ce ?, code du Mastermind)
-- dans `game_secrets`, déjà fermée au navigateur (20260929010000_messaging_battleship.sql).
--
-- Idempotente : réexécutable sans effet de bord.
-- ============================================================================

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
      'mastermind'
    )
  );
