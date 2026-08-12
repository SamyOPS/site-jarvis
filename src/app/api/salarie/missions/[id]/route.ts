import { NextResponse } from "next/server";

import { MISSION_COLUMNS, parseMissionPayload, type MissionPayload } from "@/lib/missions";
import {
  getAccessTokenFromRequest,
  getAuthorizedActor,
  isAuthorizedActorError,
} from "@/lib/server-supabase";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const accessToken = getAccessTokenFromRequest(request);
    if (!accessToken) {
      return NextResponse.json({ error: "Session salarie manquante." }, { status: 401 });
    }

    const authorized = await getAuthorizedActor(accessToken, ["salarie"]);
    if (isAuthorizedActorError(authorized)) {
      return NextResponse.json({ error: authorized.error }, { status: authorized.status });
    }
    const { adminClient, profile } = authorized;

    const { id } = await context.params;
    const missionId = String(id ?? "").trim();
    if (!missionId) {
      return NextResponse.json({ error: "Mission introuvable." }, { status: 400 });
    }

    const body = (await request.json().catch(() => null)) as
      | (MissionPayload & { archived?: unknown })
      | null;

    // Reactiver ou archiver une mission se fait sans toucher a son contenu.
    if (body && Object.keys(body).length === 1 && body.archived !== undefined) {
      const { data, error } = await adminClient
        .from("employee_missions")
        .update({
          archived_at: body.archived === true ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", missionId)
        .eq("employee_id", profile.id)
        .select(MISSION_COLUMNS)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (!data) {
        return NextResponse.json({ error: "Mission introuvable." }, { status: 404 });
      }
      return NextResponse.json({ mission: data });
    }

    let payload;
    try {
      payload = parseMissionPayload(body);
    } catch (parseError) {
      return NextResponse.json(
        { error: parseError instanceof Error ? parseError.message : "Mission invalide." },
        { status: 400 },
      );
    }

    // Le filtre sur employee_id fait office de controle d'appartenance : une mission
    // d'autrui ne renvoie simplement aucune ligne.
    const { data, error } = await adminClient
      .from("employee_missions")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", missionId)
      .eq("employee_id", profile.id)
      .select(MISSION_COLUMNS)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!data) {
      return NextResponse.json({ error: "Mission introuvable." }, { status: 404 });
    }

    return NextResponse.json({ mission: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}

/**
 * Archivage, jamais suppression : une mission citee par un CRA passe doit rester lisible.
 * Une mission encore inutilisee est en revanche reellement supprimee, pour ne pas encombrer
 * la liste d'essais.
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const accessToken = getAccessTokenFromRequest(request);
    if (!accessToken) {
      return NextResponse.json({ error: "Session salarie manquante." }, { status: 401 });
    }

    const authorized = await getAuthorizedActor(accessToken, ["salarie"]);
    if (isAuthorizedActorError(authorized)) {
      return NextResponse.json({ error: authorized.error }, { status: authorized.status });
    }
    const { adminClient, profile } = authorized;

    const { id } = await context.params;
    const missionId = String(id ?? "").trim();
    if (!missionId) {
      return NextResponse.json({ error: "Mission introuvable." }, { status: 400 });
    }

    const { data: mission, error: missionError } = await adminClient
      .from("employee_missions")
      .select("id")
      .eq("id", missionId)
      .eq("employee_id", profile.id)
      .maybeSingle();

    if (missionError) {
      return NextResponse.json({ error: missionError.message }, { status: 400 });
    }
    if (!mission) {
      return NextResponse.json({ error: "Mission introuvable." }, { status: 404 });
    }

    const [{ count: entriesCount }, { count: linesCount }] = await Promise.all([
      adminClient
        .from("cra_entries")
        .select("id", { count: "exact", head: true })
        .eq("mission_id", missionId),
      adminClient
        .from("cra_mission_lines")
        .select("id", { count: "exact", head: true })
        .eq("mission_id", missionId),
    ]);

    const isUsed = (entriesCount ?? 0) > 0 || (linesCount ?? 0) > 0;

    if (isUsed) {
      const { error: archiveError } = await adminClient
        .from("employee_missions")
        .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", missionId)
        .eq("employee_id", profile.id);
      if (archiveError) {
        return NextResponse.json({ error: archiveError.message }, { status: 400 });
      }
      return NextResponse.json({ success: true, archived: true });
    }

    const { error: deleteError } = await adminClient
      .from("employee_missions")
      .delete()
      .eq("id", missionId)
      .eq("employee_id", profile.id);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, archived: false });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
