import { NextResponse } from "next/server";

import { MISSION_COLUMNS, parseMissionPayload, type MissionPayload } from "@/lib/missions";
import {
  getAccessTokenFromRequest,
  getAuthorizedActor,
  isAuthorizedActorError,
} from "@/lib/server-supabase";

export const runtime = "nodejs";

/**
 * Missions du collaborateur : ses entreprises clientes, chacune avec son tarif et son
 * unite de saisie. Le collaborateur les gere librement.
 */
export async function GET(request: Request) {
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

    const url = new URL(request.url);
    const includeArchived = url.searchParams.get("archived") === "1";

    let query = adminClient
      .from("employee_missions")
      .select(MISSION_COLUMNS)
      .eq("employee_id", profile.id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });

    if (!includeArchived) {
      query = query.is("archived_at", null);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ items: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
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
    const { adminClient, profile } = authorized;

    const body = (await request.json().catch(() => null)) as MissionPayload | null;

    let payload;
    try {
      payload = parseMissionPayload(body);
    } catch (parseError) {
      return NextResponse.json(
        { error: parseError instanceof Error ? parseError.message : "Mission invalide." },
        { status: 400 },
      );
    }

    // La nouvelle mission se place en fin de liste.
    const { data: lastMission } = await adminClient
      .from("employee_missions")
      .select("position")
      .eq("employee_id", profile.id)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data, error } = await adminClient
      .from("employee_missions")
      .insert({
        employee_id: profile.id,
        ...payload,
        position: payload.position ?? Number(lastMission?.position ?? -1) + 1,
      })
      .select(MISSION_COLUMNS)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Creation de la mission impossible." },
        { status: 400 },
      );
    }

    return NextResponse.json({ mission: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
