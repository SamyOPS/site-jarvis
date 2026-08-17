import { NextResponse } from "next/server";

import { ApiError, withActor } from "@/lib/api-handler";
import { getOptionalString, getRequiredString } from "@/lib/validation";

const RH_SESSION = { missingSession: "Session RH manquante." };

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
  employmentStatus?: unknown;
};

/** Statuts d'emploi acceptes pour un collaborateur. Liste fermee, validee cote serveur. */
const EMPLOYMENT_STATUSES = ["active", "inactive", "exited"] as const;
type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

function getOptionalDailyRate(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('Le champ "tarif journalier" est invalide.');
  }
  return parsed;
}

function parseBillingProfilePayload(payload: RhBillingProfilePayload) {
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
    siret: getOptionalString(payload.siret),
    iban: getOptionalString(payload.iban),
    bic: getOptionalString(payload.bic),
    daily_rate: getOptionalDailyRate(payload.dailyRate),
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

  return [];
}

export const GET = withActor(
  ["rh", "admin"],
  async ({ adminClient, profile }) => {
    let allowedEmployeeIds: string[] | null;
    try {
      allowedEmployeeIds = await loadAllowedEmployeeIds(adminClient, profile.role, profile.id);
    } catch (error) {
      throw new ApiError(error instanceof Error ? error.message : "Chargement des affectations RH impossible.", 400);
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
      throw new ApiError(profilesError.message, 400);
    }

    const employeeIds = (profiles ?? []).map((row: { employee_id: string }) => row.employee_id);
    const { data: employees, error: employeesError } = await adminClient
      .from("profiles")
      .select("id,full_name,email")
      .in("id", employeeIds);

    if (employeesError) {
      throw new ApiError(employeesError.message, 400);
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
  },
  RH_SESSION,
);

export const PUT = withActor(
  ["rh", "admin"],
  async ({ adminClient, profile, request }) => {
    const body = (await request.json().catch(() => null)) as RhBillingProfilePayload | null;
    if (!body) {
      throw new ApiError("Payload invalide.", 400);
    }

    const employeeId = String(body.employeeId ?? "").trim();
    if (!employeeId) {
      throw new ApiError("Collaborateur requis.", 400);
    }

    let allowedEmployeeIds: string[] | null;
    try {
      allowedEmployeeIds = await loadAllowedEmployeeIds(adminClient, profile.role, profile.id);
    } catch (error) {
      throw new ApiError(
        error instanceof Error ? error.message : "Chargement des affectations RH impossible.",
        400,
      );
    }

    if (allowedEmployeeIds && !allowedEmployeeIds.includes(employeeId)) {
      throw new ApiError("Acces refuse pour ce collaborateur.", 403);
    }

    let payload;
    try {
      payload = parseBillingProfilePayload(body);
    } catch (error) {
      throw new ApiError(error instanceof Error ? error.message : "Profil de facturation invalide.", 400);
    }

    // Le statut d'emploi du collaborateur est enregistre ici plutot que depuis le tableau de
    // bord : ecrit directement dans `profiles` avec la cle anon, il echappait au controle
    // d'affectation applique juste au-dessus.
    const employmentStatusValue = body.employmentStatus;
    if (employmentStatusValue !== undefined) {
      if (!EMPLOYMENT_STATUSES.includes(employmentStatusValue as EmploymentStatus)) {
        throw new ApiError("Statut d'emploi invalide.", 400);
      }
      const { error: employmentError } = await adminClient
        .from("profiles")
        .update({ employment_status: employmentStatusValue })
        .eq("id", employeeId)
        .eq("role", "salarie");
      if (employmentError) {
        throw new ApiError(employmentError.message, 400);
      }
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
      throw new ApiError(error?.message ?? "Enregistrement impossible.", 400);
    }

    return NextResponse.json({ success: true, profile: data });
  },
  RH_SESSION,
);
