import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "@/lib/api-handler";

export type ActiveDocumentType = {
  id: string;
  label: string;
  /** Absent quand le type est charge par code : les generateurs n'en ont pas besoin. */
  requires_period?: boolean;
  allowed_uploader_roles: string[] | null;
  active: boolean;
};

const COLUMNS_BY_ID = "id,label,requires_period,allowed_uploader_roles,active";
const COLUMNS_BY_CODE = "id,label,allowed_uploader_roles,active";

/**
 * Charge un type de document actif.
 *
 * Deux formes de recherche coexistent et sont toutes deux legitimes : par identifiant
 * pour un depot (l'utilisateur a choisi le type), par code pour un generateur (le type est
 * impose par la nature du document). Un type inactif est traite comme introuvable.
 *
 * Le message d'erreur est fourni par l'appelant : « Type CRA introuvable. » est plus utile
 * a l'ecran que le libelle generique.
 */
export async function loadActiveDocumentType(
  adminClient: SupabaseClient,
  lookup: { id: string } | { code: string },
  notFoundMessage: string,
): Promise<ActiveDocumentType> {
  const byId = "id" in lookup;
  const { data, error } = await adminClient
    .from("document_types")
    .select(byId ? COLUMNS_BY_ID : COLUMNS_BY_CODE)
    .eq(byId ? "id" : "code", byId ? lookup.id : lookup.code)
    .single();

  const documentType = data as ActiveDocumentType | null;
  if (error || !documentType || documentType.active !== true) {
    throw new ApiError(notFoundMessage, 400);
  }
  return documentType;
}

/**
 * Verifie qu'un role a le droit de deposer ou generer ce type de document.
 *
 * Une liste vide ou absente signifie « tous les roles autorises » — c'est la convention
 * retenue en base, et elle est facile a inverser par erreur.
 */
export function assertUploaderRole(
  documentType: Pick<ActiveDocumentType, "allowed_uploader_roles">,
  role: string,
  forbiddenMessage: string,
) {
  const allowed = documentType.allowed_uploader_roles;
  if (Array.isArray(allowed) && allowed.length > 0 && !allowed.includes(role)) {
    throw new ApiError(forbiddenMessage, 403);
  }
}

/** Le type exige une periode mais aucune n'a ete fournie. */
export function assertPeriodProvided(
  documentType: Pick<ActiveDocumentType, "requires_period">,
  periodMonth: string | null,
) {
  if (documentType.requires_period && !periodMonth) {
    throw new ApiError("Ce type de document demande une periode.", 400);
  }
}
