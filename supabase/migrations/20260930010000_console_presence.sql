-- ============================================================================
-- Presence en ligne dans la console
-- ----------------------------------------------------------------------------
-- Chaque onglet ouvert sur la console rejoint le canal Realtime PRIVE
-- `console-presence` et y annonce l'identifiant de son utilisateur. La messagerie s'en
-- sert pour dire si l'interlocuteur est connecte.
--
-- Canal prive, et non public : un canal public est joignable avec la seule cle anonyme,
-- et n'importe qui pourrait y lire qui est connecte. Ici Realtime evalue les policies
-- ci-dessous avec le jeton de l'utilisateur : seul un compte de la console (RH, salarie
-- verifie, admin) peut lire la presence ou y annoncer la sienne.
--
-- Idempotente : reexecutable sans effet de bord.
-- ============================================================================

create or replace function public.can_join_console_presence()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (
        role = 'admin'
        or (role in ('rh', 'salarie') and professional_status = 'verified')
      )
  );
$$;

revoke all on function public.can_join_console_presence() from public;
grant execute on function public.can_join_console_presence() to authenticated;

drop policy if exists "console_presence_read" on realtime.messages;
create policy "console_presence_read"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.topic() = 'console-presence'
    and extension = 'presence'
    and public.can_join_console_presence()
  );

drop policy if exists "console_presence_track" on realtime.messages;
create policy "console_presence_track"
  on realtime.messages
  for insert
  to authenticated
  with check (
    realtime.topic() = 'console-presence'
    and extension = 'presence'
    and public.can_join_console_presence()
  );
