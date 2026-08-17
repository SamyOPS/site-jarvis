import { NextResponse } from "next/server";

import { sumCraEntryHours } from "@/lib/cra-entries";
import { buildCraPdfBuffer } from "@/lib/cra-pdf";
import { buildEmployeeDocumentPath } from "@/lib/document-storage";
import { getRhRecipientsForEmployee, notifyRhOfDocument } from "@/lib/email";
import { ApiError, withActor } from "@/lib/api-handler";
import { assertUploaderRole, loadActiveDocumentType } from "@/lib/document-types";
import { readPdfLogoBase64 } from "@/lib/pdf-logo";
import { toDocumentDate } from "@/lib/server-supabase";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withActor<RouteContext>(
  ["salarie"],
  async ({ adminClient, profile, user }, { params }) => {
    // Lu apres l'autorisation : la version precedente lisait le logo sur disque avant meme
    // de verifier le jeton.
    const logoRgbBase64 = await readPdfLogoBase64();
    const { id } = await params;

    const { data: craRecord, error: craError } = await adminClient
      .from("cra_records")
      .select("id,employee_id,period_month,status,first_name,last_name,company_name,esn_partenaire,address_line_1,address_line_2,postal_code,city,country,phone,email,siret,iban,bic,daily_rate,worked_days_count,paid_leave_days,sick_leave_days,exceptional_leave_days,unpaid_leave_days,notes,pdf_version,employee_document_id")
      .eq("id", id)
      .eq("employee_id", profile.id)
      .single();

    if (craError || !craRecord) {
      throw new ApiError(craError?.message ?? "CRA introuvable.", 404);
    }

    if (craRecord.status === "validated") {
      throw new ApiError("Un CRA valide ne peut plus etre regenere.", 400);
    }

    const { data: entries, error: entriesError } = await adminClient
      .from("cra_entries")
      .select("work_date,mission_id,day_quantity,hours,label")
      .eq("cra_id", craRecord.id)
      .order("work_date", { ascending: true });

    if (entriesError) {
      throw new ApiError(entriesError.message, 400);
    }

    // Recapitulatif par entreprise, fige au moment du CRA. Vide pour un CRA anterieur au
    // multi-entreprises : le PDF reprend alors exactement sa forme historique.
    const { data: missionLines, error: missionLinesError } = await adminClient
      .from("cra_mission_lines")
      .select("mission_id,company_name,esn_partenaire,rate_unit,quantity")
      .eq("cra_id", craRecord.id)
      .order("company_name", { ascending: true });

    if (missionLinesError) {
      throw new ApiError(missionLinesError.message, 400);
    }

    const companyByMissionId = new Map(
      (missionLines ?? []).map((line: { mission_id: string | null; company_name: string }) => [
        line.mission_id,
        line.company_name,
      ]),
    );

    const documentType = await loadActiveDocumentType(
      adminClient,
      { code: "cra" },
      "Type CRA introuvable.",
    );
    assertUploaderRole(
      documentType,
      "salarie",
      "Le salarie ne peut pas generer ce type de document.",
    );

    const nextPdfVersion = craRecord.employee_document_id ? craRecord.pdf_version + 1 : craRecord.pdf_version;
    const fileName = `cra-${craRecord.period_month.slice(0, 7)}-v${nextPdfVersion}.pdf`;
    const storageBucket = "employee-documents";
    const storagePath = buildEmployeeDocumentPath({
      employeeId: profile.id,
      documentTypeId: documentType.id,
      periodMonth: craRecord.period_month,
      fileName,
    });

    const pdfBuffer = buildCraPdfBuffer(
      {
        firstName: craRecord.first_name,
        lastName: craRecord.last_name,
        companyName: craRecord.company_name,
        esnPartenaire: craRecord.esn_partenaire,
        addressLine1: craRecord.address_line_1,
        addressLine2: craRecord.address_line_2,
        postalCode: craRecord.postal_code,
        city: craRecord.city,
        country: craRecord.country,
        phone: craRecord.phone,
        email: craRecord.email,
        siret: craRecord.siret,
        iban: craRecord.iban,
        bic: craRecord.bic,
        dailyRate: Number(craRecord.daily_rate),
        workedDaysCount: Number(craRecord.worked_days_count),
        // Somme des heures des entrees : nul pour un CRA saisi en journees, la ligne
        // d'heures du PDF reste alors absente.
        workedHoursCount: sumCraEntryHours(entries ?? []),
        paidLeaveDays: Number(craRecord.paid_leave_days ?? 0),
        sickLeaveDays: Number(craRecord.sick_leave_days ?? 0),
        exceptionalLeaveDays: Number(craRecord.exceptional_leave_days ?? 0),
        unpaidLeaveDays: Number(craRecord.unpaid_leave_days ?? 0),
        periodMonth: craRecord.period_month,
        notes: craRecord.notes,
        entries: (entries ?? []).map((entry) => ({
          workDate: entry.work_date,
          dayQuantity: Number(entry.day_quantity ?? 0),
          label: entry.label,
          companyName: companyByMissionId.get(entry.mission_id) ?? null,
        })),
        companies: (missionLines ?? []).map(
          (line: {
            company_name: string;
            esn_partenaire: string | null;
            rate_unit: string;
            quantity: number;
          }) => ({
            companyName: line.company_name,
            esnPartenaire: line.esn_partenaire,
            quantity: Number(line.quantity ?? 0),
            unit: line.rate_unit === "hour" ? ("hour" as const) : ("day" as const),
          }),
        ),
      },
      logoRgbBase64.trim(),
    );

    const { error: uploadError } = await adminClient.storage.from(storageBucket).upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });

    if (uploadError) {
      throw new ApiError(uploadError.message, 400);
    }

    const now = new Date().toISOString();
    const documentDate = toDocumentDate();
    const { data: matchingRequest } = await adminClient
      .from("document_requests")
      .select("id,status,period_month")
      .eq("employee_id", profile.id)
      .eq("document_type_id", documentType.id)
      .in("status", ["pending", "uploaded", "rejected", "expired"])
      .order("created_at", { ascending: false })
      .limit(10);

    const requestRow =
      // Rapprochement strict sur la periode : sans cela, une demande d'un autre mois etait
      // marquee satisfaite par ce depot.
      (matchingRequest ?? []).find((row) => (row.period_month ?? "") === (craRecord.period_month ?? "")) ??
      null;

    let documentId = craRecord.employee_document_id;
    let previousStoragePath: string | null = null;
    let eventType = "uploaded";

    if (craRecord.employee_document_id) {
      const { data: existingDocument, error: existingDocumentError } = await adminClient
        .from("employee_documents")
        .select("id,status,storage_path")
        .eq("id", craRecord.employee_document_id)
        .eq("employee_id", profile.id)
        .single();

      if (existingDocumentError || !existingDocument) {
        await adminClient.storage.from(storageBucket).remove([storagePath]);
        throw new ApiError(existingDocumentError?.message ?? "Document CRA introuvable.", 400);
      }

      if (existingDocument.status === "validated") {
        await adminClient.storage.from(storageBucket).remove([storagePath]);
        throw new ApiError("Le PDF CRA deja valide ne peut plus etre remplace.", 400);
      }

      previousStoragePath = existingDocument.storage_path ?? null;
      const { error: updateDocumentError } = await adminClient
        .from("employee_documents")
        .update({
          document_type_id: documentType.id,
          period_month: craRecord.period_month,
          document_date: documentDate,
          status: "pending",
          storage_bucket: storageBucket,
          storage_path: storagePath,
          file_name: fileName,
          mime_type: "application/pdf",
          size_bytes: pdfBuffer.byteLength,
          reviewed_by: null,
          reviewed_at: null,
          review_comment: null,
          request_id: requestRow?.id ?? null,
          source_kind: "generated",
          updated_at: now,
        })
        .eq("id", existingDocument.id);

      if (updateDocumentError) {
        await adminClient.storage.from(storageBucket).remove([storagePath]);
        throw new ApiError(updateDocumentError.message, 400);
      }

      eventType = "updated";
      documentId = existingDocument.id;
    } else {
      const { data: insertedDocument, error: insertDocumentError } = await adminClient
        .from("employee_documents")
        .insert({
          employee_id: profile.id,
          uploaded_by: user.id,
          uploader_role: "salarie",
          document_type_id: documentType.id,
          period_month: craRecord.period_month,
          document_date: documentDate,
          status: "pending",
          storage_bucket: storageBucket,
          storage_path: storagePath,
          file_name: fileName,
          mime_type: "application/pdf",
          size_bytes: pdfBuffer.byteLength,
          request_id: requestRow?.id ?? null,
          source_kind: "generated",
        })
        .select("id")
        .single();

      if (insertDocumentError || !insertedDocument) {
        await adminClient.storage.from(storageBucket).remove([storagePath]);
        throw new ApiError(insertDocumentError?.message ?? "Insertion du document CRA impossible.", 400);
      }

      documentId = insertedDocument.id;
    }

    const requestPromise = requestRow
      ? adminClient.from("document_requests").update({ status: "uploaded", updated_at: now }).eq("id", requestRow.id)
      : Promise.resolve({ error: null });

    const craUpdatePromise = adminClient
      .from("cra_records")
      .update({
        employee_document_id: documentId,
        pdf_version: nextPdfVersion,
        status: "submitted",
        submitted_at: now,
        updated_at: now,
      })
      .eq("id", craRecord.id);

    const eventPromise = adminClient.from("document_events").insert({
      document_id: documentId,
      actor_id: user.id,
      event_type: eventType,
      payload: {
        generated_from: "cra",
        cra_id: craRecord.id,
        period_month: craRecord.period_month,
        pdf_version: nextPdfVersion,
      },
    });

    const [{ error: requestError }, { error: craUpdateError }, { error: eventError }] = await Promise.all([
      requestPromise,
      craUpdatePromise,
      eventPromise,
    ]);

    if (requestError || craUpdateError || eventError) {
      throw new ApiError(requestError?.message ?? craUpdateError?.message ?? eventError?.message ?? "Le PDF CRA a ete genere, mais le suivi n'est pas complet.", 400);
    }

    if (previousStoragePath && previousStoragePath !== storagePath) {
      await adminClient.storage.from(storageBucket).remove([previousStoragePath]);
    }

    try {
      const rhEmails = await getRhRecipientsForEmployee(adminClient, profile.id);
      if (rhEmails.length) {
        await notifyRhOfDocument({
          rhEmails,
          employeeName: profile.full_name,
          employeeEmail: profile.email,
          documentLabel: documentType.label,
          periodMonth: craRecord.period_month,
        });
      }
    } catch (emailError) {
      console.error("[email] notify RH (cra) failed", emailError);
    }

    return NextResponse.json({ success: true, documentId, craId: craRecord.id, pdfVersion: nextPdfVersion });
  },
  { missingSession: "Session salarie manquante." },
);
