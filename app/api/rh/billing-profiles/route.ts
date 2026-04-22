import { NextResponse } from "next/server";

import { getAccessTokenFromRequest, getAuthorizedActor, isAuthorizedActorError } from "@/lib/server-supabase";

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
    let allowedEmployeeIds: string[] | null = null;

    if (profile.role === "rh") {
      const { data: assignments, error: assignmentsError } = await adminClient
        .from("rh_employee_assignments")
        .select("employee_id")
        .eq("rh_id", profile.id);

      const missingAssignmentsTable =
        !!assignmentsError &&
        /rh_employee_assignments/i.test(assignmentsError.message ?? "");

      if (assignmentsError && !missingAssignmentsTable) {
        return NextResponse.json({ error: assignmentsError.message }, { status: 400 });
      }

      if (!missingAssignmentsTable) {
        allowedEmployeeIds = (assignments ?? [])
          .map((row: { employee_id: string | null }) => row.employee_id)
          .filter((value): value is string => Boolean(value));
      }
    }

    let query = adminClient
      .from("employee_billing_profiles")
      .select("employee_id,first_name,last_name,company_name,daily_rate,updated_at,created_at")
      .order("updated_at", { ascending: false });

    if (allowedEmployeeIds && allowedEmployeeIds.length > 0) {
      query = query.in("employee_id", allowedEmployeeIds);
    } else if (allowedEmployeeIds && allowedEmployeeIds.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const { data: profiles, error: profilesError } = await query;
    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 400 });
    }

    const employeeIds = (profiles ?? []).map((row: { employee_id: string }) => row.employee_id);
    const { data: employees, error: employeesError } = await adminClient
      .from("profiles")
      .select("id,full_name,email")
      .in("id", employeeIds);

    if (employeesError) {
      return NextResponse.json({ error: employeesError.message }, { status: 400 });
    }

    const employeesById = new Map(
      (employees ?? []).map((row: { id: string; full_name: string | null; email: string | null }) => [
        row.id,
        row,
      ]),
    );

    const items = (profiles ?? []).map(
      (row: {
        employee_id: string;
        first_name: string;
        last_name: string;
        company_name: string;
        daily_rate: number;
        updated_at: string | null;
        created_at: string | null;
      }) => {
        const employee = employeesById.get(row.employee_id);
        return {
          employeeId: row.employee_id,
          profileLabel: `${row.first_name} ${row.last_name} · ${row.company_name}`.trim(),
          employeeName: employee?.full_name ?? employee?.email ?? "Collaborateur",
          dailyRate: row.daily_rate,
          updatedAt: row.updated_at ?? row.created_at,
        };
      },
    );

    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
