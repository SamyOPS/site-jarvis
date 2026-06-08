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
      .select("employee_id,allowed_document_type_ids")
      .eq("rh_id", profile.id);

    const assignmentsTableMissing =
      !!error && /rh_employee_assignments/i.test(error.message ?? "");
    if (assignmentsTableMissing) {
      return NextResponse.json({ restricted: false, employeeIds: [], documentTypeRestrictions: {} });
    }
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const employeeIds = Array.from(
      new Set((data ?? []).map((row) => row.employee_id).filter(Boolean)),
    );

    // employeeId -> allowed document type ids. Only includes employees with an
    // actual restriction; an empty / missing array means all types are allowed.
    const documentTypeRestrictions = (data ?? []).reduce<Record<string, string[]>>((acc, row) => {
      if (!row.employee_id) return acc;
      const allowed = Array.isArray(row.allowed_document_type_ids)
        ? row.allowed_document_type_ids.filter(Boolean)
        : [];
      if (allowed.length > 0) {
        acc[row.employee_id] = allowed;
      }
      return acc;
    }, {});

    return NextResponse.json({ restricted: true, employeeIds, documentTypeRestrictions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}

