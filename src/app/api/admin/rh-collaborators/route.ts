import { NextResponse } from "next/server";

import {
  getAccessTokenFromRequest,
  getAuthorizedActor,
  isAuthorizedActorError,
} from "@/lib/server-supabase";

type AssignmentPayload = {
  rhId?: unknown;
  employeeIds?: unknown;
};

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}

export async function GET(request: Request) {
  try {
    const accessToken = getAccessTokenFromRequest(request);
    if (!accessToken) {
      return NextResponse.json({ error: "Session admin manquante." }, { status: 401 });
    }

    const authorized = await getAuthorizedActor(accessToken, ["admin"]);
    if (isAuthorizedActorError(authorized)) {
      return NextResponse.json({ error: authorized.error }, { status: authorized.status });
    }

    const { adminClient } = authorized;

    const [{ data: rhProfiles, error: rhError }, { data: employees, error: employeesError }, { data: assignments, error: assignmentsError }] =
      await Promise.all([
        adminClient
          .from("profiles")
          .select("id,email,full_name")
          .eq("role", "rh")
          .order("email", { ascending: true }),
        adminClient
          .from("profiles")
          .select("id,email,full_name")
          .eq("role", "salarie")
          .order("email", { ascending: true }),
        adminClient
          .from("rh_employee_assignments")
          .select("rh_id,employee_id"),
      ]);

    if (rhError || employeesError || assignmentsError) {
      return NextResponse.json(
        {
          error:
            rhError?.message ??
            employeesError?.message ??
            assignmentsError?.message ??
            "Chargement des affectations impossible.",
        },
        { status: 400 },
      );
    }

    const assignmentsByRh = (assignments ?? []).reduce<Record<string, string[]>>((acc, row) => {
      const key = row.rh_id;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(row.employee_id);
      return acc;
    }, {});

    return NextResponse.json({
      rhs: rhProfiles ?? [],
      employees: employees ?? [],
      assignments: assignmentsByRh,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const accessToken = getAccessTokenFromRequest(request);
    if (!accessToken) {
      return NextResponse.json({ error: "Session admin manquante." }, { status: 401 });
    }

    const authorized = await getAuthorizedActor(accessToken, ["admin"]);
    if (isAuthorizedActorError(authorized)) {
      return NextResponse.json({ error: authorized.error }, { status: authorized.status });
    }

    const { adminClient } = authorized;
    const payload = (await request.json().catch(() => null)) as AssignmentPayload | null;
    const rhId = String(payload?.rhId ?? "").trim();
    const employeeIds = normalizeStringArray(payload?.employeeIds);

    if (!rhId) {
      return NextResponse.json({ error: "RH invalide." }, { status: 400 });
    }

    const [{ data: rhProfile, error: rhError }, { data: employeeProfiles, error: employeesError }] =
      await Promise.all([
        adminClient
          .from("profiles")
          .select("id,role")
          .eq("id", rhId)
          .single(),
        employeeIds.length
          ? adminClient
              .from("profiles")
              .select("id,role")
              .in("id", employeeIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

    if (rhError || !rhProfile || rhProfile.role !== "rh") {
      return NextResponse.json(
        { error: rhError?.message ?? "Profil RH introuvable." },
        { status: 400 },
      );
    }

    if (employeesError) {
      return NextResponse.json({ error: employeesError.message }, { status: 400 });
    }

    const invalidEmployees =
      (employeeProfiles ?? []).some((profile) => profile.role !== "salarie") ||
      (employeeProfiles ?? []).length !== employeeIds.length;
    if (invalidEmployees) {
      return NextResponse.json({ error: "Liste de collaborateurs invalide." }, { status: 400 });
    }

    const { error: deleteError } = await adminClient
      .from("rh_employee_assignments")
      .delete()
      .eq("rh_id", rhId);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    if (employeeIds.length) {
      const { error: insertError } = await adminClient
        .from("rh_employee_assignments")
        .insert(
          employeeIds.map((employeeId) => ({
            rh_id: rhId,
            employee_id: employeeId,
          })),
        );
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
