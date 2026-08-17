/**
 * Types metier partages. Regle : ce dossier ne doit importer AUCUN module du projet
 * (ni @/lib, ni @/features, ni @/components, ni @/app). TypeScript natif uniquement.
 */

/**
 * Slug d'article, tel que le produit l'espace actualites.
 *
 * Ne borne pas la longueur et n'elague pas les tirets de bordure : un titre commencant
 * par un caractere non alphanumerique donne un slug commencant par un tiret. Ce
 * comportement est conserve tel quel — les slugs deja publies servent d'URL.
 */
export function slugifyArticle(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Slug d'offre d'emploi : tirets de bordure elagues et longueur plafonnee a 120.
 *
 * Differe volontairement de `slugifyArticle`. Les unifier changerait les slugs generes
 * de l'un des deux cotes : c'est un arbitrage produit, pas une simplification.
 */
export function slugifyOffer(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/**
 * Slug d'offre suffixe d'un fragment aleatoire, pour garantir l'unicite sans aller
 * interroger la base.
 */
export function buildUniqueOfferSlug(title: string) {
  const base = slugifyOffer(title) || "offre";
  const suffix = crypto.randomUUID().slice(0, 8);
  return `${base}-${suffix}`;
}
