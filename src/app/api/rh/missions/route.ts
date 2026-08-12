import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { MISSION_COLUMNS, parseMissionPayload, type MissionPayload } from "@/lib/missions";
import { canRhAccessEmployee } from "@/lib/rh-access";
import {
  getAccessTokenFromRequest,
  getAuthorizedActor,
  isAuthorizedActorError,
} from "@/lib/server-supabase";

export const runtime = "nodejs";

type RhMissionPayload = MissionPayload & {
  employeeId?: unknown;
  missionId?: unknown;
  archived?: unknown;
};

/** Union discriminee : soit une reponse d'erreur prete, soit le client autorise. */
type AuthorizeResult =
  | { response: NextResponse; adminClient?: undefined }
  | { response?: undefined; adminClient: SupabaseClient };

/**
 * Missions vues et gerees par le RH depuis la fiche d'un collaborateur.
 *
 * Le controle d'affectation est le meme que pour les documents : un RH ne voit que les
 * collaborateurs qui lui sont affectes, un admin les voit tous.
 */
async function authorizeEmployee(request: Request, employeeId: string): Promise<AuthorizeResult> {
  const accessToken = getAccessTokenFromRequest(request);
  if (!accessToken) {
    return { response: NextResponse.json({ error: "Session RH manquante." }, { status: 401 }) };
  }

  const authorized = await getAuthorizedActor(accessToken, ["rh", "admin"]);
  if (isAuthorizedActorError(authorized)) {
    return {
      response: NextResponse.json({ error: authorized.error }, { status: authorized.status }),
    };
  }

  if (!employeeId) {
    return {
      response: NextResponse.json({ error: "Collaborateur requis." }, { status: 400 }),
    };
  }

  const { adminClient, profile: actorProfile } = authorized;

  const { data: employeeProfile, error: employeeError } = await adminClient
    .from("profiles")
    .select("id,role")
    .eq("id", employeeId)
    .maybeSingle();

  if (employeeError) {
    return { response: NextResponse.json({ error: employeeError.message }, { status: 400 }) };
  }
  if (!employeeProfile || employeeProfile.role !== "salarie") {
    return {
      response: NextResponse.json({ error: "Collaborateur invalide." }, { status: 400 }),
    };
  }

  if (actorProfile.role !== "admin") {
    const access = await canRhAccessEmployee(adminClient, actorProfile.id, employeeId);
    if (!access.allowed) {
      if (access.error) {
        return { response: NextResponse.json({ error: access.error }, { status: 400 }) };
      }
      return {
        response: NextResponse.json(
          { error: "Collaborateur non autorise pour ce RH." },
          { status: 403 },
        ),
      };
    }
  }

  return { adminClient };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const employeeId = (url.searchParams.get("employeeId") ?? "").trim();
    const includeArchived = url.searchParams.get("archived") === "1";

    const auth = await authorizeEmployee(request, employeeId);
    if (auth.response) return auth.response;
    const { adminClient } = auth;

    let query = adminClient
      .from("employee_missions")
      .select(MISSION_COLUMNS)
      .eq("employee_id", employeeId)
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
    const body = (await request.json().catch(() => null)) as RhMissionPayload | null;
    const employeeId = String(body?.employeeId ?? "").trim();

    const auth = await authorizeEmployee(request, employeeId);
    if (auth.response) return auth.response;
    const { adminClient } = auth;

    let payload;
    try {
      payload = parseMissionPayload(body);
    } catch (parseError) {
      return NextResponse.json(
        { error: parseError instanceof Error ? parseError.message : "Mission invalide." },
        { status: 400 },
      );
    }

    const { data: lastMission } = await adminClient
      .from("employee_missions")
      .select("position")
      .eq("employee_id", employeeId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data, error } = await adminClient
      .from("employee_missions")
      .insert({
        employee_id: employeeId,
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

export async function PATCH(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as RhMissionPayload | null;
    const employeeId = String(body?.employeeId ?? "").trim();
    const missionId = String(body?.missionId ?? "").trim();

    const auth = await authorizeEmployee(request, employeeId);
    if (auth.response) return auth.response;
    const { adminClient } = auth;

    if (!missionId) {
      return NextResponse.json({ error: "Mission introuvable." }, { status: 400 });
    }

    // Archivage / reactivation sans toucher au contenu.
    if (body?.archived !== undefined && body?.companyName === undefined) {
      const { data, error } = await adminClient
        .from("employee_missions")
        .update({
          archived_at: body.archived === true ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", missionId)
        .eq("employee_id", employeeId)
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

    const { data, error } = await adminClient
      .from("employee_missions")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", missionId)
      .eq("employee_id", employeeId)
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
