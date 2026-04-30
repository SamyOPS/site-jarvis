# Supabase — versioning du schéma

Ce dossier contient le schéma versionné de la base Supabase du projet.

## Setup initial (à faire UNE fois)

1. **Installer la CLI** (déjà fait — listée dans `package.json` en devDependency).

2. **Se connecter à Supabase**
   ```bash
   npx supabase login
   ```

3. **Lier le projet local au projet Supabase distant**
   ```bash
   npx supabase link --project-ref <PROJECT_REF>
   ```
   `<PROJECT_REF>` se trouve dans l'URL du dashboard Supabase (ex : `https://supabase.com/dashboard/project/abcdefghijkl` → `abcdefghijkl`).

4. **Importer le schéma actuel en migrations**
   ```bash
   npx supabase db pull
   ```
   Crée un fichier `supabase/migrations/<timestamp>_remote_schema.sql` qui contient l'état actuel des tables, RLS, fonctions, triggers.

5. **Commit le résultat** :
   ```bash
   git add supabase/migrations/ supabase/config.toml
   git commit -m "Capture l'état actuel du schéma Supabase"
   ```

## Workflow quotidien

Quand tu modifies le schéma (depuis le SQL editor du dashboard ou en local) :

```bash
npx supabase db pull           # récupère les nouveaux changements distants
# ou
npx supabase migration new <nom>  # crée une migration vide à éditer manuellement
npx supabase db push           # applique tes migrations locales sur la DB distante
```

## Bénéfices

- **Audit RLS** : les policies de sécurité deviennent visibles dans le repo et reviewables en PR.
- **Reproductibilité** : possible de rebuilder une DB de dev/test à partir des migrations.
- **Historique** : chaque évolution du schéma est tracée dans git.

## Fichiers ignorés (`.gitignore`)

- `supabase/.branches/`, `supabase/.temp/` : état local de la CLI.
- `supabase/seed.sql` : données de seed locales (à committer manuellement si voulu).
