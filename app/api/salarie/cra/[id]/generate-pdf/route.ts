import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { buildCraPdfBuffer } from "@/lib/cra-pdf";
import { buildEmployeeDocumentPath } from "@/lib/document-storage";
import { getAccessTokenFromRequest, getAuthorizedActor, isAuthorizedActorError, toDocumentDate } from "@/lib/server-supabase";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const logoRgbBase64 = await readFile(
      path.join(process.cwd(), "public", "logonoir-rgb120.b64"),
      "utf8",
    );

    const accessToken = getAccessTokenFromRequest(request);
    if (!accessToken) {
      return NextResponse.json({ error: "Session salarie manquante." }, { status: 401 });
    }

    const authorized = await getAuthorizedActor(accessToken, ["salarie"]);
    if (isAuthorizedActorError(authorized)) {
      return NextResponse.json({ error: authorized.error }, { status: authorized.status });
    }

    const { adminClient, profile, user } = authorized;
    const { id } = await params;

    const { data: craRecord, error: craError } = await adminClient
      .from("cra_records")
      .select("id,employee_id,period_month,status,first_name,last_name,company_name,esn_partenaire,address_line_1,address_line_2,postal_code,city,country,phone,email,siret,iban,bic,daily_rate,worked_days_count,notes,pdf_version,employee_document_id")
      .eq("id", id)
      .eq("employee_id", profile.id)
      .single();

    if (craError || !craRecord) {
      return NextResponse.json({ error: craError?.message ?? "CRA introuvable." }, { status: 404 });
    }

    if (craRecord.status === "validated") {
      return NextResponse.json({ error: "Un CRA valide ne peut plus etre regenere." }, { status: 400 });
    }

    const { data: entries, error: entriesError } = await adminClient
      .from("cra_entries")
      .select("work_date,day_quantity,label")
      .eq("cra_id", craRecord.id)
      .order("work_date", { ascending: true });

    if (entriesError) {
      return NextResponse.json({ error: entriesError.message }, { status: 400 });
    }

    const { data: documentType, error: typeError } = await adminClient
      .from("document_types")
      .select("id,allowed_uploader_roles,active")
      .eq("code", "cra")
      .single();

    if (typeError || !documentType || documentType.active !== true) {
      return NextResponse.json({ error: "Type CRA introuvable." }, { status: 400 });
    }

    if (
      Array.isArray(documentType.allowed_uploader_roles) &&
      documentType.allowed_uploader_roles.length > 0 &&
      !documentType.allowed_uploader_roles.includes("salarie")
    ) {
      return NextResponse.json({ error: "Le salarie ne peut pas generer ce type de document." }, { status: 403 });
    }

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
        periodMonth: craRecord.period_month,
        notes: craRecord.notes,
        entries: (entries ?? []).map((entry) => ({
          workDate: entry.work_date,
          dayQuantity: Number(entry.day_quantity),
          label: entry.label,
        })),
      },
      logoRgbBase64.trim(),
    );

    const { error: uploadError } = await adminClient.storage.from(storageBucket).upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
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
      (matchingRequest ?? []).find((row) => (row.period_month ?? "") === (craRecord.period_month ?? "")) ??
      (matchingRequest ?? [])[0] ??
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
        return NextResponse.json({ error: existingDocumentError?.message ?? "Document CRA introuvable." }, { status: 400 });
      }

      if (existingDocument.status === "validated") {
        await adminClient.storage.from(storageBucket).remove([storagePath]);
        return NextResponse.json({ error: "Le PDF CRA deja valide ne peut plus etre remplace." }, { status: 400 });
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
        return NextResponse.json({ error: updateDocumentError.message }, { status: 400 });
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
        return NextResponse.json({ error: insertDocumentError?.message ?? "Insertion du document CRA impossible." }, { status: 400 });
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
      return NextResponse.json({ error: requestError?.message ?? craUpdateError?.message ?? eventError?.message ?? "Le PDF CRA a ete genere, mais le suivi n'est pas complet." }, { status: 400 });
    }

    if (previousStoragePath && previousStoragePath !== storagePath) {
      await adminClient.storage.from(storageBucket).remove([previousStoragePath]);
    }

    return NextResponse.json({ success: true, documentId, craId: craRecord.id, pdfVersion: nextPdfVersion });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur." }, { status: 500 });
  }
}
