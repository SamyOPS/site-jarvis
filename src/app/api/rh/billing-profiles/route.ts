import { NextResponse } from "next/server";

import { getAccessTokenFromRequest, getAuthorizedActor, isAuthorizedActorError } from "@/lib/server-supabase";

type RhBillingProfilePayload = {
  employeeId?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  companyName?: unknown;
  esnPartenaire?: unknown;
  addressLine1?: unknown;
  addressLine2?: unknown;
  postalCode?: unknown;
  city?: unknown;
  country?: unknown;
  phone?: unknown;
  email?: unknown;
  siret?: unknown;
  iban?: unknown;
  bic?: unknown;
  dailyRate?: unknown;
};

function getRequiredString(value: unknown, label: string) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new Error(`Le champ "${label}" est obligatoire.`);
  }
  return normalized;
}

function getOptionalString(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function parseBillingProfilePayload(payload: RhBillingProfilePayload) {
  const dailyRate = Number(payload.dailyRate);
  if (!Number.isFinite(dailyRate) || dailyRate <= 0) {
    throw new Error('Le champ "tarif journalier" est invalide.');
  }

  return {
    first_name: getRequiredString(payload.firstName, "prenom"),
    last_name: getRequiredString(payload.lastName, "nom"),
    company_name: getRequiredString(payload.companyName, "nom de la societe"),
    esn_partenaire: getOptionalString(payload.esnPartenaire),
    address_line_1: getRequiredString(payload.addressLine1, "adresse"),
    address_line_2: getOptionalString(payload.addressLine2),
    postal_code: getRequiredString(payload.postalCode, "code postal"),
    city: getRequiredString(payload.city, "ville"),
    country: getRequiredString(payload.country ?? "France", "pays"),
    phone: getRequiredString(payload.phone, "telephone"),
    email: getRequiredString(payload.email, "email"),
    siret: getRequiredString(payload.siret, "SIRET"),
    iban: getRequiredString(payload.iban, "IBAN"),
    bic: getRequiredString(payload.bic, "BIC"),
    daily_rate: dailyRate,
    updated_at: new Date().toISOString(),
  };
}

async function loadAllowedEmployeeIds(
  adminClient: any,
  role: string | null,
  rhId: string,
) {
  if (role !== "rh") {
    return null as string[] | null;
  }

  const { data: assignments, error: assignmentsError } = await adminClient
    .from("rh_employee_assignments")
    .select("employee_id")
    .eq("rh_id", rhId);

  const missingAssignmentsTable =
    !!assignmentsError &&
    /rh_employee_assignments/i.test(assignmentsError.message ?? "");

  if (assignmentsError && !missingAssignmentsTable) {
    throw new Error(assignmentsError.message);
  }

  if (!missingAssignmentsTable) {
    return (assignments ?? [])
      .map((row: { employee_id: string | null }) => row.employee_id)
      .filter((value: string | null): value is string => Boolean(value));
  }

  return null;
}

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
    let allowedEmployeeIds: string[] | null;
    try {
      allowedEmployeeIds = await loadAllowedEmployeeIds(adminClient, profile.role, profile.id);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Chargement des affectations RH impossible." }, { status: 400 });
    }

    let query = adminClient
      .from("employee_billing_profiles")
      .select("employee_id,first_name,last_name,company_name,esn_partenaire,address_line_1,address_line_2,postal_code,city,country,phone,email,siret,iban,bic,daily_rate,updated_at,created_at")
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
        esn_partenaire: string | null;
        address_line_1: string | null;
        address_line_2: string | null;
        postal_code: string | null;
        city: string | null;
        country: string | null;
        phone: string | null;
        email: string | null;
        siret: string | null;
        iban: string | null;
        bic: string | null;
        daily_rate: number;
        updated_at: string | null;
        created_at: string | null;
      }) => {
        const employee = employeesById.get(row.employee_id);
        return {
          employeeId: row.employee_id,
          profileLabel: `${row.first_name} ${row.last_name} - ${row.company_name}`.trim(),
          employeeName: employee?.full_name ?? employee?.email ?? "Collaborateur",
          firstName: row.first_name,
          lastName: row.last_name,
          companyName: row.company_name,
          esnPartenaire: row.esn_partenaire,
          addressLine1: row.address_line_1,
          addressLine2: row.address_line_2,
          postalCode: row.postal_code,
          city: row.city,
          country: row.country,
          phone: row.phone,
          email: row.email,
          siret: row.siret,
          iban: row.iban,
          bic: row.bic,
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

export async function PUT(request: Request) {
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
    const body = (await request.json().catch(() => null)) as RhBillingProfilePayload | null;
    if (!body) {
      return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
    }

    const employeeId = String(body.employeeId ?? "").trim();
    if (!employeeId) {
      return NextResponse.json({ error: "Collaborateur requis." }, { status: 400 });
    }

    let allowedEmployeeIds: string[] | null;
    try {
      allowedEmployeeIds = await loadAllowedEmployeeIds(adminClient, profile.role, profile.id);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Chargement des affectations RH impossible." }, { status: 400 });
    }

    if (allowedEmployeeIds && !allowedEmployeeIds.includes(employeeId)) {
      return NextResponse.json({ error: "Acces refuse pour ce collaborateur." }, { status: 403 });
    }

    let payload;
    try {
      payload = parseBillingProfilePayload(body);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Profil de facturation invalide." }, { status: 400 });
    }

    const { data, error } = await adminClient
      .from("employee_billing_profiles")
      .upsert({
        employee_id: employeeId,
        ...payload,
      })
      .select("employee_id,first_name,last_name,company_name,esn_partenaire,address_line_1,address_line_2,postal_code,city,country,phone,email,siret,iban,bic,daily_rate,created_at,updated_at")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Enregistrement impossible." }, { status: 400 });
    }

    return NextResponse.json({ success: true, profile: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur." }, { status: 500 });
  }
}
