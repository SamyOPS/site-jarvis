import { NextResponse } from "next/server";

import { CRA_ENTRY_UNIT_COLUMNS, parseCraEntries, sumAbsenceDays, toCraEntryUnit, type CraEntryInput } from "@/lib/cra-entries";
import { loadEmployeeMissions, syncCraMissionLines } from "@/lib/missions";
import { ApiError, withActor } from "@/lib/api-handler";
import { toIsoMonthStart } from "@/lib/server-supabase";

type RouteContext = { params: Promise<{ id: string }> };

const SALARIE_SESSION = { missingSession: "Session salarie manquante." };

type CraUpdatePayload = {
  periodMonth?: unknown;
  notes?: unknown;
  entries?: CraEntryInput[];
};

function getNotes(value: unknown, fallback: string | null) {
  if (value === undefined) return fallback;
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

export const GET = withActor<RouteContext>(
  ["salarie"],
  async ({ adminClient, profile }, { params }) => {
    const { id } = await params;
    const { data: craRecord, error: craError } = await adminClient
      .from("cra_records")
      .select("id,period_month,status,worked_days_count,pdf_version,employee_document_id,notes,created_at,updated_at,submitted_at,validated_at,rejected_at")
      .eq("id", id)
      .eq("employee_id", profile.id)
      .single();

    if (craError || !craRecord) {
      throw new ApiError(craError?.message ?? "CRA introuvable.", 404);
    }

    const { data: entries, error: entriesError } = await adminClient
      .from("cra_entries")
      // `hours` et `mission_id` sont indispensables : sans eux, recharger un CRA horaire
      // perdait les heures explicites saisies par le collaborateur.
      .select("id,work_date,mission_id,day_quantity,hours,label,created_at,updated_at")
      .eq("cra_id", craRecord.id)
      .order("work_date", { ascending: true });

    if (entriesError) {
      throw new ApiError(entriesError.message, 400);
    }

    return NextResponse.json({ cra: craRecord, entries: entries ?? [] });
  },
  SALARIE_SESSION,
);

export const PATCH = withActor<RouteContext>(
  ["salarie"],
  async ({ adminClient, profile, request }, { params }) => {
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as CraUpdatePayload | null;
    if (!body) {
      throw new ApiError("Payload invalide.", 400);
    }

    const { data: existingRecord, error: existingError } = await adminClient
      .from("cra_records")
      .select("id,period_month,status,notes,paid_leave_days,sick_leave_days,exceptional_leave_days,unpaid_leave_days")
      .eq("id", id)
      .eq("employee_id", profile.id)
      .single();

    if (existingError || !existingRecord) {
      throw new ApiError(existingError?.message ?? "CRA introuvable.", 404);
    }

    if (existingRecord.status === "validated") {
      throw new ApiError("Un CRA valide ne peut plus etre modifie.", 400);
    }

    const { data: entryUnitRow } = await adminClient
      .from("employee_billing_profiles")
      .select(CRA_ENTRY_UNIT_COLUMNS)
      .eq("employee_id", profile.id)
      .maybeSingle();
    const fallbackUnit = toCraEntryUnit(entryUnitRow);

    let missions;
    let missionUnits;
    try {
      ({ missions, units: missionUnits } = await loadEmployeeMissions(adminClient, profile.id));
    } catch (missionError) {
      throw new ApiError(
        missionError instanceof Error
          ? missionError.message
          : "Chargement des entreprises impossible.",
        400,
      );
    }

    const entries = body.entries
      ? parseCraEntries(body.entries, missionUnits, fallbackUnit)
      : null;
    const nextPeriodMonth = body.periodMonth ? toIsoMonthStart(String(body.periodMonth)) : existingRecord.period_month;
    // Ne totalise que les journees TRAVAILLEES : les heures ne se convertissent plus, et
    // les absences ont leurs propres compteurs.
    const workedDaysCount = entries
      ? entries.reduce(
          (total, entry) => total + (entry.absence_type ? 0 : (entry.day_quantity ?? 0)),
          0,
        )
      : undefined;
    // Deduits des jours pointes sur le calendrier des que les lignes sont fournies.
    const leaveDays = entries ? sumAbsenceDays(entries) : null;

    const { data: updatedRecord, error: updateError } = await adminClient
      .from("cra_records")
      .update({
        period_month: nextPeriodMonth,
        notes: getNotes(body.notes, existingRecord.notes),
        worked_days_count: workedDaysCount,
        paid_leave_days: leaveDays?.paid_leave_days ?? Number(existingRecord.paid_leave_days ?? 0),
        sick_leave_days: leaveDays?.sick_leave_days ?? Number(existingRecord.sick_leave_days ?? 0),
        exceptional_leave_days:
          leaveDays?.exceptional_leave_days ?? Number(existingRecord.exceptional_leave_days ?? 0),
        unpaid_leave_days:
          leaveDays?.unpaid_leave_days ?? Number(existingRecord.unpaid_leave_days ?? 0),
        status: "draft",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingRecord.id)
      .select("id,period_month,status,worked_days_count,pdf_version,employee_document_id,notes,created_at,updated_at")
      .single();

    if (updateError || !updatedRecord) {
      throw new ApiError(updateError?.message ?? "Mise a jour du CRA impossible.", updateError?.code === "23505" ? 409 : 400);
    }

    if (entries) {
      const { error: deleteError } = await adminClient.from("cra_entries").delete().eq("cra_id", existingRecord.id);
      if (deleteError) {
        throw new ApiError(deleteError.message, 400);
      }

      if (entries.length) {
        const { error: insertEntriesError } = await adminClient.from("cra_entries").insert(
          entries.map((entry) => ({
            cra_id: existingRecord.id,
            ...entry,
          })),
        );
        if (insertEntriesError) {
          throw new ApiError(insertEntriesError.message, 400);
        }
      }

      try {
        await syncCraMissionLines(adminClient, existingRecord.id, entries, missions);
      } catch (linesError) {
        throw new ApiError(
          linesError instanceof Error
            ? linesError.message
            : "Mise a jour du recapitulatif par entreprise impossible.",
          400,
        );
      }
    }

    return NextResponse.json({ success: true, cra: updatedRecord });
  },
  SALARIE_SESSION,
);

export const DELETE = withActor<RouteContext>(
  ["salarie"],
  async ({ adminClient, profile }, { params }) => {
    const { id } = await params;
    const { data: craRecord, error: craError } = await adminClient
      .from("cra_records")
      .select("id,employee_id,status,employee_document_id")
      .eq("id", id)
      .eq("employee_id", profile.id)
      .single();

    if (craError || !craRecord) {
      throw new ApiError(craError?.message ?? "CRA introuvable.", 404);
    }

    if (craRecord.status === "validated") {
      throw new ApiError("Un CRA valide ne peut pas etre supprime.", 400);
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
        throw new ApiError(documentError?.message ?? "Document CRA introuvable.", 400);
      }

      if (existingDocument.status === "validated") {
        throw new ApiError("Le document PDF valide lie a ce CRA ne peut pas etre supprime.", 400);
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
        // Rapprochement strict sur la periode : sans cela, une demande d'un autre mois etait
        // remise en attente a tort.
        (matchingRequests ?? []).find((requestRow) => (requestRow.period_month ?? "") === (documentRow.period_month ?? "")) ??
        null;

      const { error: eventsDeleteError } = await adminClient.from("document_events").delete().eq("document_id", documentRow.id);
      if (eventsDeleteError) {
        throw new ApiError(eventsDeleteError.message, 400);
      }

      const { error: documentDeleteError } = await adminClient.from("employee_documents").delete().eq("id", documentRow.id);
      if (documentDeleteError) {
        throw new ApiError(documentDeleteError.message, 400);
      }

      if (matchingRequest) {
        const { error: requestError } = await adminClient
          .from("document_requests")
          .update({ status: "pending", updated_at: new Date().toISOString() })
          .eq("id", matchingRequest.id);

        if (requestError) {
          throw new ApiError(requestError.message, 400);
        }
      }

      if (documentRow.storage_path) {
        await adminClient.storage.from(documentRow.storage_bucket || "employee-documents").remove([documentRow.storage_path]);
      }
    }

    const { error: entriesDeleteError } = await adminClient.from("cra_entries").delete().eq("cra_id", craRecord.id);
    if (entriesDeleteError) {
      throw new ApiError(entriesDeleteError.message, 400);
    }

    const { error: craDeleteError } = await adminClient.from("cra_records").delete().eq("id", craRecord.id);
    if (craDeleteError) {
      throw new ApiError(craDeleteError.message, 400);
    }

    return NextResponse.json({ success: true });
  },
  SALARIE_SESSION,
);
