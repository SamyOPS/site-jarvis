import { NextResponse } from "next/server";

import { unwrap, withActor } from "@/lib/api-handler";
import { listAssignedEmployeeIds } from "@/lib/rh-access";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/**
 * Nom des deposants des documents demandes.
 *
 * L'entree porte des identifiants de DOCUMENTS, jamais de profils. La version precedente
 * acceptait jusqu'a 500 UUID de profils arbitraires et les resolvait en nom + email avec
 * la cle `service_role`, sans aucun filtre d'habilitation : tout compte RH ou admin
 * pouvait ainsi lire l'identite de profils hors de son perimetre.
 *
 * Desormais les documents sont d'abord restreints aux collaborateurs affectes a ce RH ;
 * les profils resolus ensuite sont donc necessairement des deposants qu'il a le droit de
 * voir. Meme modele que `api/salarie/documents/uploaders`.
 *
 * Les identifiants autorises sont charges UNE fois : un controle par ligne ferait autant
 * de requetes que de documents.
 */
export const POST = withActor(
  ["rh", "admin"],
  async ({ adminClient, profile, request }) => {
    const payload = (await request.json().catch(() => null)) as
      | { documentIds?: unknown }
      | null;

    const documentIds = Array.from(
      new Set(
        (Array.isArray(payload?.documentIds) ? payload.documentIds : [])
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter((value) => isUuid(value)),
      ),
    ).slice(0, 500);

    if (!documentIds.length) {
      return NextResponse.json({ items: [] });
    }

    // `null` = admin, aucune restriction. Un tableau vide serait au contraire une
    // restriction totale : les deux cas ne se confondent pas.
    const allowedEmployeeIds = await listAssignedEmployeeIds(adminClient, {
      id: profile.id,
      role: profile.role,
    });

    let documentsQuery = adminClient
      .from("employee_documents")
      .select("uploaded_by")
      .in("id", documentIds);

    if (allowedEmployeeIds) {
      if (!allowedEmployeeIds.length) {
        return NextResponse.json({ items: [] });
      }
      documentsQuery = documentsQuery.in("employee_id", allowedEmployeeIds);
    }

    const documentRows = unwrap(await documentsQuery);

    const uploaderIds = Array.from(
      new Set(
        (documentRows ?? [])
          .map((row) => row.uploaded_by as string | null)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    if (!uploaderIds.length) {
      return NextResponse.json({ items: [] });
    }

    const uploaderRows = unwrap(
      await adminClient.from("profiles").select("id,full_name,email").in("id", uploaderIds),
    );

    const items = (uploaderRows ?? []).map((row) => ({
      id: row.id as string,
      fullName: (row.full_name as string | null) ?? null,
      email: row.email as string,
    }));

    return NextResponse.json({ items });
  },
  { missingSession: "Session RH manquante." },
);
