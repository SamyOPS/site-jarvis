import { NextResponse } from "next/server";

import {
  getAccessTokenFromRequest,
  getAuthorizedActor,
  isAuthorizedActorError,
} from "@/lib/server-supabase";

type ActivityRow = {
  userId: string;
  lastSignInAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  emailConfirmedAt: string | null;
};

export async function GET(request: Request) {
  try {
    const accessToken = getAccessTokenFromRequest(request);
    if (!accessToken) {
      return NextResponse.json({ error: "Session admin manquante." }, { status: 401 });
    }

    const authorized = await getAuthorizedActor(accessToken, ["admin"]);
    if (isAuthorizedActorError(authorized)) {
      return NextResponse.json({ error: authorized.error }, { status: authorized.status });
    }

    const { data, error } = await authorized.adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const rows: ActivityRow[] = (data.users ?? []).map((user) => ({
      userId: user.id,
      lastSignInAt: user.last_sign_in_at ?? null,
      createdAt: user.created_at ?? null,
      updatedAt: user.updated_at ?? null,
      emailConfirmedAt: user.email_confirmed_at ?? null,
    }));

    return NextResponse.json({ items: rows });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}

