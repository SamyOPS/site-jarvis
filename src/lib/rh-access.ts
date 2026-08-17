import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "@/lib/api-handler";

/**
 * Message rendu quand la table d'affectations est absente.
 *
 * Nomme parce que les appelants doivent pouvoir distinguer ce cas d'une vraie erreur SQL :
 * une indisponibilite du controle se traduit par un refus silencieux, une erreur SQL doit
 * remonter. Compare ce constante plutot que de reecrire la chaine.
 */
export const RH_ASSIGNMENTS_UNAVAILABLE = "Controle des affectations RH indisponible.";

/**
 * Habilitation d'un RH sur un collaborateur donne.
 *
 * Deux conditions : le collaborateur doit lui etre affecte, et le type de document doit
 * figurer dans son perimetre quand une restriction est posee. Un tableau vide ou nul dans
 * `allowed_document_type_ids` signifie « tous les types autorises ».
 *
 * Implementation unique, partagee par les routes RH : elle etait auparavant recopiee dans
 * chaque route, avec le risque qu'une copie diverge des autres.
 */
export async function canRhAccessEmployee(
  adminClient: SupabaseClient,
  rhId: string,
  employeeId: string,
  documentTypeId?: string,
) {
  if (!employeeId || employeeId === rhId) {
    return { allowed: true as const };
  }

  const { data, error } = await adminClient
    .from("rh_employee_assignments")
    .select("employee_id,allowed_document_type_ids")
    .eq("rh_id", rhId)
    .eq("employee_id", employeeId)
    .maybeSingle();

  const missingTable = !!error && /rh_employee_assignments/i.test(error.message ?? "");
  if (missingTable) {
    return { allowed: false as const, error: RH_ASSIGNMENTS_UNAVAILABLE };
  }
  if (error) {
    return { allowed: false as const, error: error.message };
  }
  if (!data?.employee_id) {
    return { allowed: false as const };
  }

  // Empty / null array = no restriction (all document types allowed).
  const allowedTypes = Array.isArray(data.allowed_document_type_ids)
    ? data.allowed_document_type_ids.filter(Boolean)
    : [];
  if (documentTypeId && allowedTypes.length > 0 && !allowedTypes.includes(documentTypeId)) {
    return { allowed: false as const };
  }
  return { allowed: true as const };
}

/**
 * Meme controle, mais leve au lieu de rendre un resultat.
 *
 * Le mapping « acces refuse -> reponse HTTP » etait recopie dans chaque route RH, avec des
 * libelles de 403 qui divergeaient sans raison. Il est parametrable ici pour que chaque
 * appelant garde son message exact : les uniformiser est une decision produit.
 *
 * Un admin n'est jamais restreint : le controle ne s'applique qu'au role `rh`.
 */
export async function assertRhAccess(
  adminClient: SupabaseClient,
  actor: { id: string; role: string | null },
  employeeId: string,
  documentTypeId?: string,
  forbiddenMessage = "Collaborateur ou type de document non autorise pour ce RH.",
) {
  if (actor.role === "admin") return;

  const access = await canRhAccessEmployee(adminClient, actor.id, employeeId, documentTypeId);
  if (access.allowed) return;

  // Une indisponibilite du controle (table absente) n'est pas un refus : elle ressort en
  // 400 avec son propre message, comme le faisaient les routes.
  if (access.error) {
    throw new ApiError(access.error, 400);
  }
  throw new ApiError(forbiddenMessage, 403);
}

/**
 * Identifiants des collaborateurs qu'un acteur peut voir.
 *
 * Rend `null` pour un admin : aucune restriction, et c'est volontairement distinct d'un
 * tableau vide, qui signifie « ce RH n'a aucun collaborateur affecte ». Confondre les deux
 * donnerait tout voir a un RH sans affectation.
 *
 * Le compte de l'acteur lui-meme est inclus : un RH depose aussi des documents internes,
 * rattaches a son propre profil.
 *
 * Si la table d'affectations est absente, on rend une liste vide plutot qu'une erreur :
 * le controle est indisponible, on ne montre donc rien.
 */
export async function listAssignedEmployeeIds(
  adminClient: SupabaseClient,
  actor: { id: string; role: string | null },
): Promise<string[] | null> {
  if (actor.role !== "rh") {
    return null;
  }

  const { data, error } = await adminClient
    .from("rh_employee_assignments")
    .select("employee_id")
    .eq("rh_id", actor.id);

  const missingTable = !!error && /rh_employee_assignments/i.test(error.message ?? "");
  if (missingTable) {
    return [actor.id];
  }
  if (error) {
    throw new ApiError(error.message, 400);
  }

  const assigned = (data ?? [])
    .map((row: { employee_id: string | null }) => row.employee_id)
    .filter((value: string | null): value is string => Boolean(value));

  return Array.from(new Set([...assigned, actor.id]));
}
