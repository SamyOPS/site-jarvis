-- Anti-spam du formulaire de candidature publique.
--
-- À EXÉCUTER DANS LE PROJET SUPABASE « CV » (SUPABASE_CV_URL), comme
-- 20260713000000_job_applications_table.sql qui a créé la table. Ce dossier versionne les
-- deux projets ; l'en-tête de chaque fichier dit lequel.
--
-- `/api/applications` est la seule route d'écriture OUVERTE À TOUS du site : chaque appel
-- uploade un fichier de 5 Mo, insère une ligne et envoie un e-mail, sans authentification.
-- Une simple boucle saturait donc la boîte de réception et le Storage.
--
-- Les plafonds se comptent sur `job_applications` elle-même : la table EST le registre. Pas
-- de seconde table à garder cohérente, pas de purge supplémentaire, et un plafond qui ne
-- peut pas diverger de ce qui a réellement été enregistré.

-- L'IP est une donnée personnelle, et le plafond n'a besoin que de reconnaître deux envois
-- venant du même endroit : on stocke une empreinte, jamais l'adresse. Le sel vit côté
-- serveur (APPLICATION_IP_SALT, à défaut la clé service_role du projet CV) — sans sel,
-- l'empreinte d'une IPv4 se retrouve par force brute en quelques secondes, l'espace
-- d'adressage tenant sur 32 bits.
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS ip_hash text;

COMMENT ON COLUMN public.job_applications.ip_hash IS
  'SHA-256 sale de l''IP d''envoi. Sert au plafond anti-spam, jamais a identifier un candidat.';

-- Plafond par IP : « combien d'envois depuis cette IP depuis une heure ».
CREATE INDEX IF NOT EXISTS job_applications_ip_hash_created_at_idx
  ON public.job_applications (ip_hash, created_at DESC);

-- Doublons : « ce candidat a-t-il deja postule a cette offre ». Pas d'index UNIQUE : une
-- candidature re-deposee des mois plus tard est legitime, c'est la FENETRE qui compte, et
-- une contrainte ne sait pas l'exprimer.
CREATE INDEX IF NOT EXISTS job_applications_email_job_id_created_at_idx
  ON public.job_applications (email, job_id, created_at DESC);

-- Le plafond global s'appuie sur job_applications_created_at_idx, deja cree en 20260713000000.
