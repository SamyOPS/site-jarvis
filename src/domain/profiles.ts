/**
 * Types metier partages. Regle : ce dossier ne doit importer AUCUN module du projet
 * (ni @/lib, ni @/features, ni @/components, ni @/app). TypeScript natif uniquement.
 */

/**
 * Socle d'un profil utilisateur, commun aux quatre roles. Les roles qui ont besoin de
 * plus de colonnes l'etendent par intersection plutot que de redeclarer ces champs.
 */
export type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  professional_status: string | null;
};
