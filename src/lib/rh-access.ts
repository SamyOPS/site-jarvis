import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "@/lib/api-handler";

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
    return {
      allowed: false as const,
      error: "Controle des affectations RH indisponible.",
    };
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
