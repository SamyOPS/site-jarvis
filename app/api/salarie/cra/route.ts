import { NextResponse } from "next/server";

import { getAccessTokenFromRequest, getAuthorizedActor, isAuthorizedActorError, toIsoMonthStart } from "@/lib/server-supabase";

type CraEntryInput = {
  workDate?: unknown;
  dayQuantity?: unknown;
  label?: unknown;
};

type CraCreatePayload = {
  periodMonth?: unknown;
  notes?: unknown;
  entries?: CraEntryInput[];
};

function parseEntries(entries: CraEntryInput[] | undefined) {
  return (entries ?? []).map((entry, index) => {
    const workDate = String(entry.workDate ?? "").trim();
    const parsedDate = new Date(workDate);
    const dayQuantity = Number(entry.dayQuantity);
    if (!workDate || Number.isNaN(parsedDate.getTime())) {
      throw new Error(`La date de la ligne ${index + 1} est invalide.`);
    }
    if (!Number.isFinite(dayQuantity) || dayQuantity <= 0 || dayQuantity > 1) {
      throw new Error(`La quantite de la ligne ${index + 1} doit etre comprise entre 0 et 1.`);
    }

    return {
      work_date: parsedDate.toISOString().slice(0, 10),
      day_quantity: dayQuantity,
      label: String(entry.label ?? "").trim() || null,
    };
  });
}

function getNotes(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
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
      .from("cra_records")
      .select("id,period_month,status,worked_days_count,pdf_version,employee_document_id,created_at,updated_at,submitted_at,validated_at,rejected_at")
      .eq("employee_id", profile.id)
      .order("period_month", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ items: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
    const body = (await request.json().catch(() => null)) as CraCreatePayload | null;
    if (!body?.periodMonth) {
      return NextResponse.json({ error: "La periode est obligatoire." }, { status: 400 });
    }

    const periodMonth = toIsoMonthStart(String(body.periodMonth));
    const entries = parseEntries(body.entries);
    const workedDaysCount = entries.reduce((total, entry) => total + entry.day_quantity, 0);

    const { data: billingProfile, error: billingError } = await adminClient
      .from("employee_billing_profiles")
      .select("first_name,last_name,company_name,esn_partenaire,address_line_1,address_line_2,postal_code,city,country,phone,email,siret,iban,bic,daily_rate")
      .eq("employee_id", profile.id)
      .single();

    if (billingError || !billingProfile) {
      return NextResponse.json({ error: billingError?.message ?? "Profil de facturation introuvable." }, { status: 400 });
    }

    const { data: craRecord, error: insertError } = await adminClient
      .from("cra_records")
      .insert({
        employee_id: profile.id,
        period_month: periodMonth,
        status: "draft",
        ...billingProfile,
        worked_days_count: workedDaysCount,
        notes: getNotes(body.notes),
      })
      .select("id,period_month,status,worked_days_count,pdf_version,employee_document_id,created_at,updated_at")
      .single();

    if (insertError || !craRecord) {
      return NextResponse.json({ error: insertError?.message ?? "Creation du CRA impossible." }, { status: insertError?.code === "23505" ? 409 : 400 });
    }

    if (entries.length) {
      const { error: entriesError } = await adminClient.from("cra_entries").insert(
        entries.map((entry) => ({
          cra_id: craRecord.id,
          ...entry,
        })),
      );

      if (entriesError) {
        await adminClient.from("cra_records").delete().eq("id", craRecord.id);
        return NextResponse.json({ error: entriesError.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true, cra: craRecord });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur." }, { status: 500 });
  }
}
