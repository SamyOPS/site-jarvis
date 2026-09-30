-- ============================================================================
-- Rappel par e-mail des messages non lus : planification
-- ----------------------------------------------------------------------------
-- La route `/api/messages/notify-unread` sait deja composer et envoyer les rappels,
-- mais rien ne l'appelait. Ce job la frappe toutes les 15 minutes depuis la base.
--
-- Pourquoi pg_cron et non un cron Vercel : le plan gratuit de Vercel ne lance une tache
-- planifiee qu'une fois par jour, ce qui ferait d'un « message non lu depuis 15 min » un
-- rappel du lendemain.
--
-- L'URL du site et le secret partage ne sont PAS dans ce fichier : ils vivent dans le
-- Vault de Supabase, sous les noms ci-dessous, et se posent a la main une fois :
--
--   select vault.create_secret('https://<domaine>/api/messages/notify-unread', 'messaging_cron_url');
--   select vault.create_secret('<meme valeur que MESSAGING_CRON_SECRET sur Vercel>', 'messaging_cron_secret');
--
-- Sans eux, le job tourne a vide : il n'appelle rien.
--
-- Idempotente : reexecutable sans effet de bord.
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

/*
  Les messages anterieurs a la mise en service sont marques comme traites : sans cela, le
  premier passage enverrait des rappels pour des echanges vieux de plusieurs jours.
*/
update public.messages
set email_notified_at = now()
where email_notified_at is null
  and created_at < now() - interval '1 day';

select cron.unschedule('messaging-notify-unread')
where exists (select 1 from cron.job where jobname = 'messaging-notify-unread');

select cron.schedule(
  'messaging-notify-unread',
  '*/15 * * * *',
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'messaging_cron_url'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret',
        (select decrypted_secret from vault.decrypted_secrets where name = 'messaging_cron_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    )
    where exists (select 1 from vault.decrypted_secrets where name = 'messaging_cron_url')
      and exists (select 1 from vault.decrypted_secrets where name = 'messaging_cron_secret');
  $job$
);
