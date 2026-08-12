import type { SupabaseClient } from "@supabase/supabase-js";

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
