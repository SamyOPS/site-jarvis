import { NextResponse } from "next/server";

import {
  getAccessTokenFromRequest,
  getAuthorizedActor,
  isAuthorizedActorError,
} from "@/lib/server-supabase";

export async function GET(request: Request) {
  try {
    const accessToken = getAccessTokenFromRequest(request);
    if (!accessToken) {
      return NextResponse.json({ error: "Session RH manquante." }, { status: 401 });
    }

    const authorized = await getAuthorizedActor(accessToken, ["rh", "admin"]);
    if (isAuthorizedActorError(authorized)) {
      return NextResponse.json({ error: authorized.error }, { status: authorized.status });
    }

    const { adminClient, profile } = authorized;
    const { data, error } = await adminClient
      .from("rh_employee_assignments")
      .select("employee_id")
      .eq("rh_id", profile.id);

    const assignmentsTableMissing =
      !!error && /rh_employee_assignments/i.test(error.message ?? "");
    if (assignmentsTableMissing) {
      return NextResponse.json({ restricted: false, employeeIds: [] });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const employeeIds = Array.from(
      new Set((data ?? []).map((row) => row.employee_id).filter(Boolean)),
    );
    return NextResponse.json({ restricted: true, employeeIds });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}

