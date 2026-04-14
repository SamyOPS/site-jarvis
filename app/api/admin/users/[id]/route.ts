import { NextResponse } from "next/server";

import {
  getAccessTokenFromRequest,
  getAuthorizedActor,
  isAuthorizedActorError,
} from "@/lib/server-supabase";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const accessToken = getAccessTokenFromRequest(request);
    if (!accessToken) {
      return NextResponse.json({ error: "Session admin manquante." }, { status: 401 });
    }

    const authorized = await getAuthorizedActor(accessToken, ["admin"]);
    if (isAuthorizedActorError(authorized)) {
      return NextResponse.json({ error: authorized.error }, { status: authorized.status });
    }

    const { id } = await context.params;
    const targetUserId = String(id ?? "").trim();
    if (!targetUserId) {
      return NextResponse.json({ error: "Utilisateur cible invalide." }, { status: 400 });
    }
    if (targetUserId === authorized.user.id) {
      return NextResponse.json(
        { error: "Tu ne peux pas supprimer ton propre compte admin." },
        { status: 400 },
      );
    }

    const { error: deleteAuthError } = await authorized.adminClient.auth.admin.deleteUser(
      targetUserId,
    );
    if (deleteAuthError) {
      return NextResponse.json({ error: deleteAuthError.message }, { status: 400 });
    }

    const { error: deleteProfileError } = await authorized.adminClient
      .from("profiles")
      .delete()
      .eq("id", targetUserId);
    if (deleteProfileError) {
      return NextResponse.json(
        { error: `Compte auth supprime, mais profil non supprime: ${deleteProfileError.message}` },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}

