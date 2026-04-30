import { NextResponse } from "next/server";

import { getAccessTokenFromRequest, getAuthorizedActor, isAuthorizedActorError } from "@/lib/server-supabase";

type BillingProfilePayload = {
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

function parseBillingProfilePayload(payload: BillingProfilePayload) {
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

export async function GET(request: Request) {
  try {
    const accessToken = getAccessTokenFromRequest(request);
    if (!accessToken) {
      return NextResponse.json({ error: "Session salarie manquante." }, { status: 401 });
    }

    const authorized = await getAuthorizedActor(accessToken, ["salarie"]);
    if (isAuthorizedActorError(authorized)) {
      return NextResponse.json({ error: authorized.error }, { status: authorized.status });
    }

    const { adminClient, profile } = authorized;
    const { data, error } = await adminClient
      .from("employee_billing_profiles")
      .select("employee_id,first_name,last_name,company_name,esn_partenaire,address_line_1,address_line_2,postal_code,city,country,phone,email,siret,iban,bic,daily_rate,created_at,updated_at")
      .eq("employee_id", profile.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ profile: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const accessToken = getAccessTokenFromRequest(request);
    if (!accessToken) {
      return NextResponse.json({ error: "Session salarie manquante." }, { status: 401 });
    }

    const authorized = await getAuthorizedActor(accessToken, ["salarie"]);
    if (isAuthorizedActorError(authorized)) {
      return NextResponse.json({ error: authorized.error }, { status: authorized.status });
    }

    const { adminClient, profile } = authorized;
    const body = (await request.json().catch(() => null)) as BillingProfilePayload | null;
    if (!body) {
      return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
    }

    const payload = parseBillingProfilePayload(body);
    const { data, error } = await adminClient
      .from("employee_billing_profiles")
      .upsert({
        employee_id: profile.id,
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
