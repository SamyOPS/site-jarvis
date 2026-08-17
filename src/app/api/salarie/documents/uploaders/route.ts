import { NextResponse } from "next/server";

import { unwrap, withActor } from "@/lib/api-handler";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/**
 * Nom du deposant de chaque document demande.
 *
 * L'entree porte des identifiants de DOCUMENTS, et la premiere requete les restreint aux
 * documents du collaborateur : les profils resolus ensuite sont donc necessairement des
 * deposants qu'il a le droit de voir. C'est le modele que la route RH equivalente doit
 * adopter (cf. TODO lot 8 dans `api/rh/documents/uploaders`).
 */
export const POST = withActor(
  ["salarie"],
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

    const docsRows = unwrap(
      await adminClient
        .from("employee_documents")
        .select("id,uploaded_by")
        .eq("employee_id", profile.id)
        .in("id", documentIds),
    );

    const uploaderIds = Array.from(
      new Set(
        (docsRows ?? [])
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

    const uploaderById = new Map(
      (uploaderRows ?? []).map((row) => [
        row.id as string,
        {
          fullName: (row.full_name as string | null) ?? null,
          email: row.email as string,
        },
      ]),
    );

    const items = (docsRows ?? [])
      .map((row) => {
        const uploadedBy = row.uploaded_by as string | null;
        if (!uploadedBy) return null;
        const uploader = uploaderById.get(uploadedBy);
        if (!uploader) return null;
        return {
          documentId: row.id as string,
          uploaderName: uploader.fullName ?? uploader.email,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ items });
  },
  { missingSession: "Session salarie manquante." },
);
