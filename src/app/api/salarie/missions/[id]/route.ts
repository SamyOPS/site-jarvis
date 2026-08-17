import { NextResponse } from "next/server";

import { ApiError, unwrap, withActor } from "@/lib/api-handler";
import { MISSION_COLUMNS, parseMissionPayload, type MissionPayload } from "@/lib/missions";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const SALARIE_SESSION = { missingSession: "Session salarie manquante." };

async function resolveMissionId(context: RouteContext) {
  const { id } = await context.params;
  const missionId = String(id ?? "").trim();
  if (!missionId) {
    throw new ApiError("Mission introuvable.", 400);
  }
  return missionId;
}

/** La mission mise a jour, ou une 404 : un identifiant d'autrui ne renvoie aucune ligne. */
function requireMission<T>(data: T | null) {
  if (!data) {
    throw new ApiError("Mission introuvable.", 404);
  }
  return data;
}

export const PATCH = withActor<RouteContext>(
  ["salarie"],
  async ({ adminClient, profile, request }, context) => {
    const missionId = await resolveMissionId(context);

    const body = (await request.json().catch(() => null)) as
      | (MissionPayload & { archived?: unknown })
      | null;

    // Reactiver ou archiver une mission se fait sans toucher a son contenu.
    if (body && Object.keys(body).length === 1 && body.archived !== undefined) {
      const data = unwrap(
        await adminClient
          .from("employee_missions")
          .update({
            archived_at: body.archived === true ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", missionId)
          .eq("employee_id", profile.id)
          .select(MISSION_COLUMNS)
          .maybeSingle(),
      );
      return NextResponse.json({ mission: requireMission(data) });
    }

    let payload;
    try {
      payload = parseMissionPayload(body);
    } catch (parseError) {
      throw new ApiError(
        parseError instanceof Error ? parseError.message : "Mission invalide.",
        400,
      );
    }

    // Le filtre sur employee_id fait office de controle d'appartenance : une mission
    // d'autrui ne renvoie simplement aucune ligne.
    const data = unwrap(
      await adminClient
        .from("employee_missions")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", missionId)
        .eq("employee_id", profile.id)
        .select(MISSION_COLUMNS)
        .maybeSingle(),
    );

    return NextResponse.json({ mission: requireMission(data) });
  },
  SALARIE_SESSION,
);

/**
 * Archivage, jamais suppression : une mission citee par un CRA passe doit rester lisible.
 * Une mission encore inutilisee est en revanche reellement supprimee, pour ne pas encombrer
 * la liste d'essais.
 */
export const DELETE = withActor<RouteContext>(
  ["salarie"],
  async ({ adminClient, profile }, context) => {
    const missionId = await resolveMissionId(context);

    const mission = unwrap(
      await adminClient
        .from("employee_missions")
        .select("id")
        .eq("id", missionId)
        .eq("employee_id", profile.id)
        .maybeSingle(),
    );
    requireMission(mission);

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
      unwrap(
        await adminClient
          .from("employee_missions")
          .update({
            archived_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", missionId)
          .eq("employee_id", profile.id),
      );
      return NextResponse.json({ success: true, archived: true });
    }

    unwrap(
      await adminClient
        .from("employee_missions")
        .delete()
        .eq("id", missionId)
        .eq("employee_id", profile.id),
    );

    return NextResponse.json({ success: true, archived: false });
  },
  SALARIE_SESSION,
);
