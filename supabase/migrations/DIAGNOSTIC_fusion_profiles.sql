-- ============================================================================
-- A EXECUTER DANS LE SQL EDITOR SUPABASE. Ne modifie rien.
--
-- Repond a la question : peut-on fusionner `profiles` et `employee_billing_profiles`
-- sans perdre de donnees ? Le raisonnement mene sur le code et les migrations dit
-- « structurellement oui, mais c'est deconseille ». Ces requetes le verifient sur les
-- donnees reelles, qui seules font foi : le schema de base n'est pas versionne dans le
-- depot.
-- ============================================================================

-- 1) La relation est-elle bien 1:1 ?
--    `doublons` DOIT valoir 0. Une seule valeur > 1 rend la fusion impossible en l'etat :
--    il faudrait choisir quel profil de facturation survit, donc perdre les autres.
select
  count(*)                                   as lignes_facturation,
  count(distinct employee_id)                as collaborateurs_distincts,
  count(*) - count(distinct employee_id)     as doublons
from public.employee_billing_profiles;

-- 2) Y a-t-il des profils de facturation ORPHELINS (sans profil correspondant) ?
--    S'il y en a, une fusion par jointure les perdrait silencieusement.
select count(*) as facturations_orphelines
from public.employee_billing_profiles b
left join public.profiles p on p.id = b.employee_id
where p.id is null;

-- 3) Combien de profils porteraient 15 colonnes vides apres fusion ?
--    Mesure le cout de la fusion : les roles qui n'ont pas de facturation.
select
  p.role,
  count(*)                                          as profils,
  count(b.employee_id)                              as avec_facturation,
  count(*) - count(b.employee_id)                   as sans_facturation
from public.profiles p
left join public.employee_billing_profiles b on b.employee_id = p.id
group by p.role
order by p.role;

-- 4) LES COLLISIONS DE NOMS portent-elles des valeurs DIFFERENTES ?
--    C'est le coeur de la question « sans perdre de donnees ». Chaque compteur > 0
--    signale des lignes ou fusionner la colonne ecraserait une vraie valeur.
select
  count(*) filter (
    where p.email is distinct from b.email
      and b.email is not null and btrim(b.email) <> ''
  ) as email_divergent,
  count(*) filter (
    where p.phone is distinct from b.phone
      and b.phone is not null and btrim(b.phone) <> ''
  ) as phone_divergent,
  count(*) filter (
    where p.company_name is distinct from b.company_name
      and b.company_name is not null and btrim(b.company_name) <> ''
  ) as company_name_divergent,
  count(*) filter (
    where p.esn_partenaire is distinct from b.esn_partenaire
      and b.esn_partenaire is not null and btrim(b.esn_partenaire) <> ''
  ) as esn_partenaire_divergent
from public.employee_billing_profiles b
join public.profiles p on p.id = b.employee_id;

-- 5) Les colonnes DEPRECIEES par la migration multi-missions du 11/08 sont-elles encore
--    utilisees ? Elles sont censees etre remplacees par `employee_missions`, mais la route
--    RH exige toujours un `daily_rate` strictement positif : l'incoherence est a trancher.
--    C'est le nettoyage le plus rentable, bien avant une fusion.
select
  count(*)                                                        as profils_facturation,
  count(*) filter (where coalesce(btrim(company_name), '') <> '')  as company_name_rempli,
  count(*) filter (where coalesce(btrim(esn_partenaire), '') <> '') as esn_partenaire_rempli,
  count(*) filter (where daily_rate is not null and daily_rate > 0) as daily_rate_rempli
from public.employee_billing_profiles;

-- 6) Combien de collaborateurs ont deja bascule sur les missions ?
--    Si ce nombre couvre tout le monde, les colonnes depreciees ne servent plus qu'aux
--    CRA historiques et peuvent etre retirees du CODE (pas forcement de la base).
select
  count(distinct employee_id) as collaborateurs_avec_mission
from public.employee_missions
where archived_at is null;

-- 7) Rappel du contraste RLS, qui est la vraie raison de ne pas fusionner.
--    `employee_billing_profiles` doit apparaitre avec rls_active = true et AUCUNE policy ;
--    `profiles` avec des policies. Fusionner ferait passer IBAN, SIRET et adresse sous le
--    regime, bien plus ouvert, de `profiles` — que le navigateur interroge en direct.
select
  c.relname                                              as table_name,
  c.relrowsecurity                                       as rls_active,
  count(pol.polname)                                     as nb_policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy pol on pol.polrelid = c.oid
where n.nspname = 'public'
  and c.relname in ('profiles', 'employee_billing_profiles')
group by c.relname, c.relrowsecurity
order by c.relname;
