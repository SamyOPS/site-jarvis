/**
 * Types metier partages. Regle : ce dossier ne doit importer AUCUN module du projet
 * (ni @/lib, ni @/features, ni @/components, ni @/app). TypeScript natif uniquement.
 */

/**
 * Nom affichable porte par les metadonnees du compte, ou `null` si aucune n'est renseignee.
 *
 * Supabase expose trois cles selon le fournisseur d'identite (`full_name` pour un compte
 * cree par formulaire, `name` ou `display_name` selon l'OAuth) : c'est cet ordre de
 * preference qui etait recopie a l'identique dans les deux workspaces et dans l'en-tete
 * public.
 *
 * La CHAINE DE REPLI reste chez l'appelant, volontairement : un workspace retombe sur le
 * profil puis sur « utilisateur », l'en-tete public sur l'e-mail puis sur « Mon espace ».
 * Ces textes sont visibles par l'utilisateur et n'ont aucune raison d'etre unifies ici.
 */
export function displayNameFromMetadata(metadata: unknown): string | null {
  const meta = (metadata ?? {}) as {
    full_name?: string;
    name?: string;
    display_name?: string;
  };
  return meta.full_name ?? meta.name ?? meta.display_name ?? null;
}

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
