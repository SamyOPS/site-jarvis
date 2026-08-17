import { NextResponse } from "next/server";

import { ApiError, withActor } from "@/lib/api-handler";

type ActivityRow = {
  userId: string;
  lastSignInAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  emailConfirmedAt: string | null;
};

export const GET = withActor(
  ["admin"],
  async ({ adminClient }) => {
    // `listUsers` rend une union discriminee dont la branche d'erreur porte un `data`
    // plus etroit : `unwrap`, taille pour PostgREST, ne s'y applique pas.
    const { data, error } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (error) {
      throw new ApiError(error.message, 400);
    }

    const rows: ActivityRow[] = (data.users ?? []).map((user) => ({
      userId: user.id,
      lastSignInAt: user.last_sign_in_at ?? null,
      createdAt: user.created_at ?? null,
      updatedAt: user.updated_at ?? null,
      emailConfirmedAt: user.email_confirmed_at ?? null,
    }));

    return NextResponse.json({ items: rows });
  },
  { missingSession: "Session admin manquante." },
);
