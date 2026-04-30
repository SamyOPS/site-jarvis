import { NextResponse } from "next/server";

import { getAccessTokenFromRequest, getAuthorizedActor, isAuthorizedActorError, toIsoMonthStart } from "@/lib/server-supabase";

type CraEntryInput = {
  workDate?: unknown;
  dayQuantity?: unknown;
  label?: unknown;
};

type CraUpdatePayload = {
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

function getNotes(value: unknown, fallback: string | null) {
  if (value === undefined) return fallback;
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const { id } = await params;
    const { data: craRecord, error: craError } = await adminClient
      .from("cra_records")
      .select("id,period_month,status,worked_days_count,pdf_version,employee_document_id,notes,created_at,updated_at,submitted_at,validated_at,rejected_at")
      .eq("id", id)
      .eq("employee_id", profile.id)
      .single();

    if (craError || !craRecord) {
      return NextResponse.json({ error: craError?.message ?? "CRA introuvable." }, { status: 404 });
    }

    const { data: entries, error: entriesError } = await adminClient
      .from("cra_entries")
      .select("id,work_date,day_quantity,label,created_at,updated_at")
      .eq("cra_id", craRecord.id)
      .order("work_date", { ascending: true });

    if (entriesError) {
      return NextResponse.json({ error: entriesError.message }, { status: 400 });
    }

    return NextResponse.json({ cra: craRecord, entries: entries ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as CraUpdatePayload | null;
    if (!body) {
      return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
    }

    const { data: existingRecord, error: existingError } = await adminClient
      .from("cra_records")
      .select("id,period_month,status,notes")
      .eq("id", id)
      .eq("employee_id", profile.id)
      .single();

    if (existingError || !existingRecord) {
      return NextResponse.json({ error: existingError?.message ?? "CRA introuvable." }, { status: 404 });
    }

    if (existingRecord.status === "validated") {
      return NextResponse.json({ error: "Un CRA valide ne peut plus etre modifie." }, { status: 400 });
    }

    const { data: billingProfile, error: billingError } = await adminClient
      .from("employee_billing_profiles")
      .select("first_name,last_name,company_name,esn_partenaire,address_line_1,address_line_2,postal_code,city,country,phone,email,siret,iban,bic,daily_rate")
      .eq("employee_id", profile.id)
      .single();

    if (billingError || !billingProfile) {
      return NextResponse.json({ error: billingError?.message ?? "Profil de facturation introuvable." }, { status: 400 });
    }

    const entries = body.entries ? parseEntries(body.entries) : null;
    const nextPeriodMonth = body.periodMonth ? toIsoMonthStart(String(body.periodMonth)) : existingRecord.period_month;
    const workedDaysCount = entries ? entries.reduce((total, entry) => total + entry.day_quantity, 0) : undefined;

    const { data: updatedRecord, error: updateError } = await adminClient
      .from("cra_records")
      .update({
        ...billingProfile,
        period_month: nextPeriodMonth,
        notes: getNotes(body.notes, existingRecord.notes),
        worked_days_count: workedDaysCount,
        status: "draft",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingRecord.id)
      .select("id,period_month,status,worked_days_count,pdf_version,employee_document_id,notes,created_at,updated_at")
      .single();

    if (updateError || !updatedRecord) {
      return NextResponse.json({ error: updateError?.message ?? "Mise a jour du CRA impossible." }, { status: updateError?.code === "23505" ? 409 : 400 });
    }

    if (entries) {
      const { error: deleteError } = await adminClient.from("cra_entries").delete().eq("cra_id", existingRecord.id);
      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 400 });
      }

      if (entries.length) {
        const { error: insertEntriesError } = await adminClient.from("cra_entries").insert(
          entries.map((entry) => ({
            cra_id: existingRecord.id,
            ...entry,
          })),
        );
        if (insertEntriesError) {
          return NextResponse.json({ error: insertEntriesError.message }, { status: 400 });
        }
      }
    }

    return NextResponse.json({ success: true, cra: updatedRecord });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const { id } = await params;
    const { data: craRecord, error: craError } = await adminClient
      .from("cra_records")
      .select("id,employee_id,status,employee_document_id")
      .eq("id", id)
      .eq("employee_id", profile.id)
      .single();

    if (craError || !craRecord) {
      return NextResponse.json({ error: craError?.message ?? "CRA introuvable." }, { status: 404 });
    }

    if (craRecord.status === "validated") {
      return NextResponse.json({ error: "Un CRA valide ne peut pas etre supprime." }, { status: 400 });
    }

    let documentRow:
      | {
          id: string;
          status: string;
          storage_bucket: string | null;
          storage_path: string | null;
          document_type_id: string;
          period_month: string | null;
        }
      | null = null;

    if (craRecord.employee_document_id) {
      const { data: existingDocument, error: documentError } = await adminClient
        .from("employee_documents")
        .select("id,status,storage_bucket,storage_path,document_type_id,period_month")
        .eq("id", craRecord.employee_document_id)
        .eq("employee_id", profile.id)
        .single();

      if (documentError || !existingDocument) {
        return NextResponse.json({ error: documentError?.message ?? "Document CRA introuvable." }, { status: 400 });
      }

      if (existingDocument.status === "validated") {
        return NextResponse.json({ error: "Le document PDF valide lie a ce CRA ne peut pas etre supprime." }, { status: 400 });
      }

      documentRow = existingDocument;
    }

    if (documentRow) {
      const { data: matchingRequests } = await adminClient
        .from("document_requests")
        .select("id,status,period_month")
        .eq("employee_id", profile.id)
        .eq("document_type_id", documentRow.document_type_id)
        .in("status", ["uploaded", "rejected", "expired"])
        .order("created_at", { ascending: false })
        .limit(10);

      const matchingRequest =
        (matchingRequests ?? []).find((requestRow) => (requestRow.period_month ?? "") === (documentRow.period_month ?? "")) ??
        (matchingRequests ?? [])[0] ??
        null;

      const { error: eventsDeleteError } = await adminClient.from("document_events").delete().eq("document_id", documentRow.id);
      if (eventsDeleteError) {
        return NextResponse.json({ error: eventsDeleteError.message }, { status: 400 });
      }

      const { error: documentDeleteError } = await adminClient.from("employee_documents").delete().eq("id", documentRow.id);
      if (documentDeleteError) {
        return NextResponse.json({ error: documentDeleteError.message }, { status: 400 });
      }

      if (matchingRequest) {
        const { error: requestError } = await adminClient
          .from("document_requests")
          .update({ status: "pending", updated_at: new Date().toISOString() })
          .eq("id", matchingRequest.id);

        if (requestError) {
          return NextResponse.json({ error: requestError.message }, { status: 400 });
        }
      }

      if (documentRow.storage_path) {
        await adminClient.storage.from(documentRow.storage_bucket || "employee-documents").remove([documentRow.storage_path]);
      }
    }

    const { error: entriesDeleteError } = await adminClient.from("cra_entries").delete().eq("cra_id", craRecord.id);
    if (entriesDeleteError) {
      return NextResponse.json({ error: entriesDeleteError.message }, { status: 400 });
    }

    const { error: craDeleteError } = await adminClient.from("cra_records").delete().eq("id", craRecord.id);
    if (craDeleteError) {
      return NextResponse.json({ error: craDeleteError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur." }, { status: 500 });
  }
}
