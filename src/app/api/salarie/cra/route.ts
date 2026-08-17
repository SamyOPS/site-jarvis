import { NextResponse } from "next/server";

import { ApiError, unwrap, withActor } from "@/lib/api-handler";
import {
  CRA_ENTRY_UNIT_COLUMNS,
  parseCraEntries,
  sumAbsenceDays,
  toCraEntryUnit,
  type CraEntryInput,
} from "@/lib/cra-entries";
import { loadEmployeeMissions, syncCraMissionLines } from "@/lib/missions";
import { toIsoMonthStart } from "@/lib/server-supabase";

type CraCreatePayload = {
  periodMonth?: unknown;
  notes?: unknown;
  entries?: CraEntryInput[];
};

const craSelectFields =
  "id,period_month,status,worked_days_count,pdf_version,employee_document_id,created_at,updated_at";

const SALARIE_SESSION = { missingSession: "Session salarie manquante." };

function getNotes(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

export const GET = withActor(
  ["salarie"],
  async ({ adminClient, profile }) => {
    const data = unwrap(
      await adminClient
        .from("cra_records")
        .select(
          "id,period_month,status,worked_days_count,pdf_version,employee_document_id,created_at,updated_at,submitted_at,validated_at,rejected_at",
        )
        .eq("employee_id", profile.id)
        .order("period_month", { ascending: false }),
    );

    return NextResponse.json({ items: data ?? [] });
  },
  SALARIE_SESSION,
);

export const POST = withActor(
  ["salarie"],
  async ({ adminClient, profile, request }) => {
    const body = (await request.json().catch(() => null)) as CraCreatePayload | null;
    if (!body?.periodMonth) {
      throw new ApiError("La periode est obligatoire.", 400);
    }

    const periodMonth = toIsoMonthStart(String(body.periodMonth));
    // Unite de repli pour les lignes sans mission : le reglage historique du profil.
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

    const entries = parseCraEntries(body.entries, missionUnits, fallbackUnit);
    // Ne totalise que les journees TRAVAILLEES : une mission facturee a l'heure ne se
    // convertit plus en jours, et les absences ont leurs propres compteurs.
    const workedDaysCount = entries.reduce(
      (total, entry) => total + (entry.absence_type ? 0 : (entry.day_quantity ?? 0)),
      0,
    );
    // Les compteurs d'absence sont deduits des jours pointes sur le calendrier, plus
    // saisis a la main : ils ne peuvent donc plus diverger du detail.
    const leaveDays = sumAbsenceDays(entries);

    const existingRecord = unwrap(
      await adminClient
        .from("cra_records")
        .select("id,status,employee_document_id")
        .eq("employee_id", profile.id)
        .eq("period_month", periodMonth)
        .maybeSingle(),
    );

    // Vérifie que le document lié au CRA "validé" existe encore et n'est pas en corbeille.
    // Sinon on traite comme un CRA orphelin réutilisable.
    let linkedDocumentAlive = false;
    if (existingRecord?.status === "validated" && existingRecord.employee_document_id) {
      const { data: linkedDoc } = await adminClient
        .from("employee_documents")
        .select("id,deleted_at")
        .eq("id", existingRecord.employee_document_id)
        .maybeSingle();
      linkedDocumentAlive = Boolean(linkedDoc) && !linkedDoc?.deleted_at;
    }

    if (existingRecord?.status === "validated" && linkedDocumentAlive) {
      throw new ApiError("Un CRA valide existe deja pour cette periode.", 400);
    }

    if (existingRecord) {
      const { data: updatedRecord, error: updateError } = await adminClient
        .from("cra_records")
        .update({
          status: "draft",
          worked_days_count: workedDaysCount,
          ...leaveDays,
          notes: getNotes(body.notes),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingRecord.id)
        .select(craSelectFields)
        .single();

      if (updateError || !updatedRecord) {
        throw new ApiError(updateError?.message ?? "Mise a jour du CRA impossible.", 400);
      }

      unwrap(await adminClient.from("cra_entries").delete().eq("cra_id", existingRecord.id));

      if (entries.length) {
        unwrap(
          await adminClient
            .from("cra_entries")
            .insert(entries.map((entry) => ({ cra_id: existingRecord.id, ...entry }))),
        );
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

      return NextResponse.json({ success: true, cra: updatedRecord });
    }

    const { data: billingProfile, error: billingError } = await adminClient
      .from("employee_billing_profiles")
      .select(
        "first_name,last_name,company_name,esn_partenaire,address_line_1,address_line_2,postal_code,city,country,phone,email,siret,iban,bic,daily_rate",
      )
      .eq("employee_id", profile.id)
      .single();

    if (billingError || !billingProfile) {
      throw new ApiError(billingError?.message ?? "Profil de facturation introuvable.", 400);
    }

    const { data: craRecord, error: insertError } = await adminClient
      .from("cra_records")
      .insert({
        employee_id: profile.id,
        period_month: periodMonth,
        status: "draft",
        ...billingProfile,
        worked_days_count: workedDaysCount,
        ...leaveDays,
        notes: getNotes(body.notes),
      })
      .select(craSelectFields)
      .single();

    if (insertError || !craRecord) {
      // 23505 = violation d'unicite : un CRA existe deja pour cette periode, ce qui est un
      // conflit et non une requete malformee. Le front distingue les deux.
      throw new ApiError(
        insertError?.message ?? "Creation du CRA impossible.",
        insertError?.code === "23505" ? 409 : 400,
      );
    }

    if (entries.length) {
      const { error: entriesError } = await adminClient
        .from("cra_entries")
        .insert(entries.map((entry) => ({ cra_id: craRecord.id, ...entry })));

      if (entriesError) {
        // Le CRA vient d'etre cree : sans ce retrait il resterait sans ses lignes.
        await adminClient.from("cra_records").delete().eq("id", craRecord.id);
        throw new ApiError(entriesError.message, 400);
      }
    }

    try {
      await syncCraMissionLines(adminClient, craRecord.id, entries, missions);
    } catch (linesError) {
      await adminClient.from("cra_records").delete().eq("id", craRecord.id);
      throw new ApiError(
        linesError instanceof Error
          ? linesError.message
          : "Creation du recapitulatif par entreprise impossible.",
        400,
      );
    }

    return NextResponse.json({ success: true, cra: craRecord });
  },
  SALARIE_SESSION,
);
