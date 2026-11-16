-- ============================================================================
-- Rappel de fin de mois : CRA et/ou facture
-- ----------------------------------------------------------------------------
-- La route `/api/cra/monthly-reminder` relance les collaborateurs en mission dont le CRA
-- du mois n'est pas soumis, ou dont la facture du mois manque. Elle part le 3e jour
-- ouvre avant la fin du mois, a 9 h (Paris) — c'est la route qui decide du jour.
--
-- 1. `cra_reminder_emails` : une ligne par collaborateur et par mois relance. La route la
--    reserve AVANT l'envoi : un collaborateur ne recoit jamais deux rappels pour le meme
--    mois, meme si deux passages se chevauchent. Ecrite par le role de service seulement.
--
-- 2. Job pg_cron `cra-monthly-reminder` : chaque matin a 7 h et 8 h UTC. Selon l'heure
--    d'ete ou d'hiver, l'un des deux tombe a 9 h a Paris ; l'autre, trop tot ou deja
--    servi, ne fait rien. Le second passage rattrape aussi un envoi echoue.
--
-- Adresse et secret : ceux du job de messagerie, deja dans le Vault
-- (`messaging_cron_url`, `messaging_cron_secret`). L'adresse de cette route s'en deduit :
-- meme domaine, autre chemin. Le secret est le meme (`MESSAGING_CRON_SECRET` sur Vercel,
-- cf. src/lib/cron-auth.ts). Sans eux, le job tourne a vide.
--
-- Idempotente : reexecutable sans effet de bord.
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.cra_reminder_emails (
  employee_id uuid not null references public.profiles (id) on delete cascade,
  -- Premier jour du mois concerne.
  period_month date not null
    constraint cra_reminder_emails_period_check check (extract(day from period_month) = 1),
  sent_at timestamptz not null default now(),
  primary key (employee_id, period_month)
);

-- Aucune politique : ni lecture ni ecriture depuis le navigateur.
alter table public.cra_reminder_emails enable row level security;

select cron.unschedule('cra-monthly-reminder')
where exists (select 1 from cron.job where jobname = 'cra-monthly-reminder');

select cron.schedule(
  'cra-monthly-reminder',
  '0 7,8 * * *',
  $job$
    select net.http_post(
      -- Domaine de l'adresse de messagerie (quel que soit son chemin) + chemin de cette route.
      url := regexp_replace(
        (select decrypted_secret from vault.decrypted_secrets where name = 'messaging_cron_url'),
        '^(https?://[^/]+).*$',
        '\1'
      ) || '/api/cra/monthly-reminder',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret',
        (select decrypted_secret from vault.decrypted_secrets where name = 'messaging_cron_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    )
    where exists (select 1 from vault.decrypted_secrets where name = 'messaging_cron_url')
      and exists (select 1 from vault.decrypted_secrets where name = 'messaging_cron_secret');
  $job$
);
