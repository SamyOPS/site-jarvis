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
      return NextResponse.json({ error: "Session RH manquante." }, { status: 401 });
    }

    const authorized = await getAuthorizedActor(accessToken, ["rh", "admin"]);
    if (isAuthorizedActorError(authorized)) {
      return NextResponse.json({ error: authorized.error }, { status: authorized.status });
    }

    const payload = (await request.json().catch(() => null)) as
      | { ids?: unknown }
      | null;
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

    const { adminClient } = authorized;
    const { data, error } = await adminClient
      .from("profiles")
      .select("id,full_name,email")
      .in("id", ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const items = (data ?? []).map((row) => ({
      id: row.id as string,
      fullName: (row.full_name as string | null) ?? null,
      email: row.email as string,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
