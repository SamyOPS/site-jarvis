import { NextResponse } from "next/server";

import {
  getAccessTokenFromRequest,
  getAuthorizedActor,
  isAuthorizedActorError,
} from "@/lib/server-supabase";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function POST(request: Request) {
  try {
    const accessToken = getAccessTokenFromRequest(request);
    if (!accessToken) {
      return NextResponse.json({ error: "Session salarie manquante." }, { status: 401 });
    }

    const authorized = await getAuthorizedActor(accessToken, ["salarie"]);
    if (isAuthorizedActorError(authorized)) {
      return NextResponse.json({ error: authorized.error }, { status: authorized.status });
    }

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

    const { adminClient, profile } = authorized;
    const { data: docsRows, error: docsError } = await adminClient
      .from("employee_documents")
      .select("id,uploaded_by")
      .eq("employee_id", profile.id)
      .in("id", documentIds);

    if (docsError) {
      return NextResponse.json({ error: docsError.message }, { status: 400 });
    }

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

    const { data: uploaderRows, error: uploaderError } = await adminClient
      .from("profiles")
      .select("id,full_name,email")
      .in("id", uploaderIds);

    if (uploaderError) {
      return NextResponse.json({ error: uploaderError.message }, { status: 400 });
    }

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
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
