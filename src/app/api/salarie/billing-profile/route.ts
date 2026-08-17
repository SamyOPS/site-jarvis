import { NextResponse } from "next/server";

import { ApiError, unwrap, withActor } from "@/lib/api-handler";
import { getOptionalString, getRequiredString } from "@/lib/validation";

type BillingProfilePayload = {
  firstName?: unknown;
  lastName?: unknown;
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
  timeUnit?: unknown;
};

function getTimeUnit(value: unknown) {
  const raw = String(value ?? "").trim() || "day";
  if (raw !== "day" && raw !== "hour") {
    throw new Error('Le champ "unite de saisie" est invalide.');
  }
  return raw;
}

function parseBillingProfilePayload(payload: BillingProfilePayload) {
  return {
    // L'entreprise cliente, l'ESN et le tarif ne sont plus ici : ils varient d'une mission
    // a l'autre et vivent dans `employee_missions`. Les colonnes correspondantes de
    // `employee_billing_profiles` sont conservees en base pour les CRA deja emis, mais ne
    // sont plus ni exigees ni ecrites.
    first_name: getRequiredString(payload.firstName, "prenom"),
    last_name: getRequiredString(payload.lastName, "nom"),
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
    time_unit: getTimeUnit(payload.timeUnit),
    updated_at: new Date().toISOString(),
  };
}

const SALARIE_SESSION = { missingSession: "Session salarie manquante." };

const BILLING_PROFILE_COLUMNS =
  "employee_id,first_name,last_name,company_name,esn_partenaire,address_line_1,address_line_2,postal_code,city,country,phone,email,siret,iban,bic,daily_rate,time_unit,created_at,updated_at";

export const GET = withActor(
  ["salarie"],
  async ({ adminClient, profile }) => {
    const data = unwrap(
      await adminClient
        .from("employee_billing_profiles")
        .select(BILLING_PROFILE_COLUMNS)
        .eq("employee_id", profile.id)
        .maybeSingle(),
    );

    return NextResponse.json({ profile: data });
  },
  SALARIE_SESSION,
);

export const PUT = withActor(
  ["salarie"],
  async ({ adminClient, profile, request }) => {
    const body = (await request.json().catch(() => null)) as BillingProfilePayload | null;
    if (!body) {
      throw new ApiError("Payload invalide.", 400);
    }

    const payload = parseBillingProfilePayload(body);
    const { data, error } = await adminClient
      .from("employee_billing_profiles")
      .upsert({ employee_id: profile.id, ...payload })
      .select(BILLING_PROFILE_COLUMNS)
      .single();

    if (error || !data) {
      throw new ApiError(error?.message ?? "Enregistrement impossible.", 400);
    }

    return NextResponse.json({ success: true, profile: data });
  },
  SALARIE_SESSION,
);
