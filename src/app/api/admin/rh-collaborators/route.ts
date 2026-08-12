import { NextResponse } from "next/server";

import {
  getAccessTokenFromRequest,
  getAuthorizedActor,
  isAuthorizedActorError,
} from "@/lib/server-supabase";

type AssignmentPayload = {
  rhId?: unknown;
  employeeIds?: unknown;
  restrictions?: unknown;
};

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}

// employeeId -> allowed document type ids. Empty array = no restriction (all types).
function normalizeRestrictions(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, string[]> = {};
  for (const [employeeId, typeIds] of Object.entries(value as Record<string, unknown>)) {
    const key = String(employeeId ?? "").trim();
    if (!key) continue;
    result[key] = normalizeStringArray(typeIds);
  }
  return result;
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

    const [
      { data: rhProfiles, error: rhError },
      { data: employees, error: employeesError },
      { data: assignments, error: assignmentsError },
      { data: documentTypes, error: documentTypesError },
    ] = await Promise.all([
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
        .select("rh_id,employee_id,allowed_document_type_ids"),
      adminClient
        .from("document_types")
        .select("id,label,code")
        .eq("active", true)
        .order("label", { ascending: true }),
    ]);

    if (rhError || employeesError || assignmentsError || documentTypesError) {
      return NextResponse.json(
        {
          error:
            rhError?.message ??
            employeesError?.message ??
            assignmentsError?.message ??
            documentTypesError?.message ??
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

    // rhId -> employeeId -> allowed document type ids (empty = all types allowed).
    const restrictionsByRh = (assignments ?? []).reduce<Record<string, Record<string, string[]>>>(
      (acc, row) => {
        const allowed = Array.isArray(row.allowed_document_type_ids)
          ? row.allowed_document_type_ids.filter(Boolean)
          : [];
        if (!acc[row.rh_id]) {
          acc[row.rh_id] = {};
        }
        acc[row.rh_id][row.employee_id] = allowed;
        return acc;
      },
      {},
    );

    return NextResponse.json({
      rhs: rhProfiles ?? [],
      employees: employees ?? [],
      documentTypes: documentTypes ?? [],
      assignments: assignmentsByRh,
      restrictions: restrictionsByRh,
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
    const restrictions = normalizeRestrictions(payload?.restrictions);

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

    // Validate any document type ids referenced in the restrictions: they must exist and be active.
    const requestedTypeIds = Array.from(
      new Set(Object.values(restrictions).flat()),
    );
    if (requestedTypeIds.length) {
      const { data: typeRows, error: typeError } = await adminClient
        .from("document_types")
        .select("id")
        .in("id", requestedTypeIds)
        .eq("active", true);
      if (typeError) {
        return NextResponse.json({ error: typeError.message }, { status: 400 });
      }
      const validTypeIds = new Set((typeRows ?? []).map((row) => row.id));
      const hasInvalidType = requestedTypeIds.some((id) => !validTypeIds.has(id));
      if (hasInvalidType) {
        return NextResponse.json({ error: "Type de document invalide." }, { status: 400 });
      }
    }

    // Le perimetre est mis a jour par differences, pas par « tout supprimer puis tout
    // reinserer » : un echec de la reinsertion laissait le RH sans aucune affectation, et
    // l'admin ne recevait qu'une erreur, sans savoir que l'etat avait deja ete detruit.
    //
    // Les retraits sont appliques en premier : si la suite echoue, il reste des acces
    // manquants — reparables en rejouant l'enregistrement — plutot que des acces qui auraient
    // du etre revoques.
    const { data: existingRows, error: existingError } = await adminClient
      .from("rh_employee_assignments")
      .select("employee_id,allowed_document_type_ids")
      .eq("rh_id", rhId);
    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 400 });
    }

    const existingByEmployee = new Map(
      (
        (existingRows ?? []) as Array<{
          employee_id: string;
          allowed_document_type_ids: string[] | null;
        }>
      ).map((row) => [row.employee_id, row.allowed_document_type_ids ?? null] as const),
    );

    const nextEmployeeIds = new Set(employeeIds);
    const removedEmployeeIds = Array.from(existingByEmployee.keys()).filter(
      (employeeId) => !nextEmployeeIds.has(employeeId),
    );

    if (removedEmployeeIds.length) {
      const { error: removeError } = await adminClient
        .from("rh_employee_assignments")
        .delete()
        .eq("rh_id", rhId)
        .in("employee_id", removedEmployeeIds);
      if (removeError) {
        return NextResponse.json({ error: removeError.message }, { status: 400 });
      }
    }

    const sameRestrictions = (left: string[] | null, right: string[] | null) => {
      if (!left?.length && !right?.length) return true;
      if (!left || !right || left.length !== right.length) return false;
      const sortedLeft = [...left].sort();
      const sortedRight = [...right].sort();
      return sortedLeft.every((value, index) => value === sortedRight[index]);
    };

    const rowsToInsert: Array<{
      rh_id: string;
      employee_id: string;
      allowed_document_type_ids: string[] | null;
    }> = [];

    for (const employeeId of employeeIds) {
      const allowed = restrictions[employeeId] ?? [];
      // Empty array = no restriction (all document types allowed).
      const nextAllowed = allowed.length ? allowed : null;

      if (!existingByEmployee.has(employeeId)) {
        rowsToInsert.push({
          rh_id: rhId,
          employee_id: employeeId,
          allowed_document_type_ids: nextAllowed,
        });
        continue;
      }

      if (sameRestrictions(existingByEmployee.get(employeeId) ?? null, nextAllowed)) {
        continue;
      }

      const { error: updateError } = await adminClient
        .from("rh_employee_assignments")
        .update({ allowed_document_type_ids: nextAllowed })
        .eq("rh_id", rhId)
        .eq("employee_id", employeeId);
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }
    }

    if (rowsToInsert.length) {
      const { error: insertError } = await adminClient
        .from("rh_employee_assignments")
        .insert(rowsToInsert);
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
