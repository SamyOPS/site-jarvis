import type { SupabaseClient } from "@supabase/supabase-js";

// Type de document "conge" utilise pour les demandes de conge (salarie & RH).
// Auto-provisionne a la premiere generation : evite une etape de seed manuelle.
export async function ensureLeaveDocumentType(adminClient: SupabaseClient) {
  const { data: existing } = await adminClient
    .from("document_types")
    .select("id,label,allowed_uploader_roles,active")
    .eq("code", "conge")
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await adminClient
    .from("document_types")
    .insert({
      code: "conge",
      label: "Demande de congé",
      category: "administratif",
      allowed_uploader_roles: ["salarie", "rh"],
      requires_period: false,
      active: true,
    })
    .select("id,label,allowed_uploader_roles,active")
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "Type de document conge introuvable.");
  }

  return created;
}
