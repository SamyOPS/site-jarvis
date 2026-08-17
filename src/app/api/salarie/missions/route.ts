import { NextResponse } from "next/server";

import { ApiError, unwrap, withActor } from "@/lib/api-handler";
import { MISSION_COLUMNS, parseMissionPayload, type MissionPayload } from "@/lib/missions";

export const runtime = "nodejs";

const SALARIE_SESSION = { missingSession: "Session salarie manquante." };

/**
 * Missions du collaborateur : ses entreprises clientes, chacune avec son tarif et son
 * unite de saisie. Le collaborateur les gere librement.
 */
export const GET = withActor(
  ["salarie"],
  async ({ adminClient, profile, request }) => {
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

    return NextResponse.json({ items: unwrap(await query) ?? [] });
  },
  SALARIE_SESSION,
);

export const POST = withActor(
  ["salarie"],
  async ({ adminClient, profile, request }) => {
    const body = (await request.json().catch(() => null)) as MissionPayload | null;

    let payload;
    try {
      payload = parseMissionPayload(body);
    } catch (parseError) {
      throw new ApiError(
        parseError instanceof Error ? parseError.message : "Mission invalide.",
        400,
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
      throw new ApiError(error?.message ?? "Creation de la mission impossible.", 400);
    }

    return NextResponse.json({ mission: data });
  },
  SALARIE_SESSION,
);
