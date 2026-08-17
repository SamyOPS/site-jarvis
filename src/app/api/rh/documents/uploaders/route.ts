import { NextResponse } from "next/server";

import { unwrap, withActor } from "@/lib/api-handler";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

// TODO lot 8 : cette route accepte des identifiants de PROFILS arbitraires et les resout
// en nom + email avec la cle service_role, sans aucun filtre d'habilitation. Son entree
// doit devenir une liste d'identifiants de DOCUMENTS, dont on derive les deposants
// effectivement visibles par ce RH.
export const POST = withActor(
  ["rh", "admin"],
  async ({ adminClient, request }) => {
    const payload = (await request.json().catch(() => null)) as { ids?: unknown } | null;

    const rawIds = Array.isArray(payload?.ids) ? payload?.ids : [];
    const ids = Array.from(
      new Set(
        rawIds
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter((value) => isUuid(value)),
      ),
    ).slice(0, 500);

    if (!ids.length) {
      return NextResponse.json({ items: [] });
    }

    const data = unwrap(
      await adminClient.from("profiles").select("id,full_name,email").in("id", ids),
    );

    const items = (data ?? []).map((row) => ({
      id: row.id as string,
      fullName: (row.full_name as string | null) ?? null,
      email: row.email as string,
    }));

    return NextResponse.json({ items });
  },
  { missingSession: "Session RH manquante." },
);
