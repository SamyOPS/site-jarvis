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
      return NextResponse.json({ error: "Session RH manquante." }, { status: 401 });
    }

    const authorized = await getAuthorizedActor(accessToken, ["rh", "admin"]);
    if (isAuthorizedActorError(authorized)) {
      return NextResponse.json({ error: authorized.error }, { status: authorized.status });
    }

    const { adminClient, profile } = authorized;

    let allowedEmployeeIds: string[] = [];
    const assignmentsRes = await adminClient
      .from("rh_employee_assignments")
      .select("employee_id")
      .eq("rh_id", profile.id);
    const assignmentsTableMissing =
      !!assignmentsRes.error &&
      /rh_employee_assignments/i.test(assignmentsRes.error.message ?? "");

    if (assignmentsTableMissing) {
      const { data: allEmployees, error: allEmployeesError } = await adminClient
        .from("profiles")
        .select("id")
        .eq("role", "salarie");
      if (allEmployeesError) {
        return NextResponse.json({ error: allEmployeesError.message }, { status: 400 });
      }
      allowedEmployeeIds = (allEmployees ?? []).map((row) => row.id);
    } else if (assignmentsRes.error) {
      return NextResponse.json({ error: assignmentsRes.error.message }, { status: 400 });
    } else {
      allowedEmployeeIds = Array.from(
        new Set((assignmentsRes.data ?? []).map((row) => row.employee_id).filter(Boolean)),
      );
    }

    if (!allowedEmployeeIds.length) {
      return NextResponse.json({ items: [] });
    }

    const { data, error } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const allowedSet = new Set(allowedEmployeeIds);
    const rows: ActivityRow[] = (data.users ?? [])
      .filter((user) => allowedSet.has(user.id))
      .map((user) => ({
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

