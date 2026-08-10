import { NextResponse } from "next/server";

import {
  getAccessTokenFromRequest,
  getAuthorizedActor,
  isAuthorizedActorError,
} from "@/lib/server-supabase";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** Roles assignables depuis la page admin. Liste fermee, validee cote serveur. */
const ASSIGNABLE_ROLES = ["candidate", "professional", "salarie", "rh", "admin"] as const;
type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

function isAssignableRole(value: unknown): value is AssignableRole {
  return ASSIGNABLE_ROLES.includes(value as AssignableRole);
}

export async function PATCH(request: Request, context: RouteContext) {
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

    const body = (await request.json().catch(() => null)) as { role?: unknown } | null;
    if (!isAssignableRole(body?.role)) {
      return NextResponse.json({ error: "Type de compte invalide." }, { status: 400 });
    }
    const nextRole = body.role;

    // Changer son propre role reviendrait a se retirer l'acces a cette page en un clic,
    // sans moyen de revenir en arriere depuis l'interface.
    if (targetUserId === authorized.user.id) {
      return NextResponse.json(
        { error: "Tu ne peux pas changer le type de ton propre compte." },
        { status: 400 },
      );
    }

    const { data: targetProfile, error: targetError } = await authorized.adminClient
      .from("profiles")
      .select("id,role,email")
      .eq("id", targetUserId)
      .maybeSingle();

    if (targetError) {
      return NextResponse.json({ error: targetError.message }, { status: 400 });
    }
    if (!targetProfile) {
      return NextResponse.json({ error: "Profil introuvable." }, { status: 404 });
    }
    if (targetProfile.role === nextRole) {
      return NextResponse.json({ success: true, profile: targetProfile });
    }

    // Retrograder le dernier administrateur fermerait le back-office a tout le monde,
    // sans recours depuis l'application.
    if (targetProfile.role === "admin") {
      const { count, error: countError } = await authorized.adminClient
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");

      if (countError) {
        return NextResponse.json({ error: countError.message }, { status: 400 });
      }
      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          { error: "Impossible de retirer le dernier compte administrateur." },
          { status: 400 },
        );
      }
    }

    // Les affectations RH sont volontairement conservees : elles restent sans effet tant
    // que le role n'est pas "rh", et redonner le role restitue le perimetre a l'identique.
    const { data: updatedProfile, error: updateError } = await authorized.adminClient
      .from("profiles")
      .update({ role: nextRole })
      .eq("id", targetUserId)
      .select("id,email,full_name,role,professional_status,company_name")
      .single();

    if (updateError || !updatedProfile) {
      return NextResponse.json(
        { error: updateError?.message ?? "Mise a jour du type de compte impossible." },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, profile: updatedProfile });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}

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

