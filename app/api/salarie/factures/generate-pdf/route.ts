import { NextResponse } from "next/server";

import { buildEmployeeDocumentPath } from "@/lib/document-storage";
import { buildInvoicePdfBuffer } from "@/lib/invoice-pdf";
import { getAccessTokenFromRequest, getAuthorizedActor, isAuthorizedActorError, toDocumentDate, toIsoMonthStart } from "@/lib/server-supabase";

type InvoiceEntryInput = {
  workDate?: unknown;
  dayQuantity?: unknown;
  label?: unknown;
};

type InvoiceGeneratePayload = {
  periodMonth?: unknown;
  entries?: InvoiceEntryInput[];
};

function parseEntries(entries: InvoiceEntryInput[] | undefined) {
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
      workDate: parsedDate.toISOString().slice(0, 10),
      dayQuantity,
      label: String(entry.label ?? "").trim() || null,
    };
  });
}

function formatInvoiceNumber(periodMonth: string) {
  return periodMonth.replace(/-/g, "");
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

    const { adminClient, profile, user } = authorized;
    const body = (await request.json().catch(() => null)) as InvoiceGeneratePayload | null;
    if (!body?.periodMonth) {
      return NextResponse.json({ error: "La periode est obligatoire." }, { status: 400 });
    }

    const periodMonth = toIsoMonthStart(String(body.periodMonth));
    const entries = parseEntries(body.entries);
    const workedDaysCount = entries.reduce((total, entry) => total + entry.dayQuantity, 0);

    if (!entries.length || workedDaysCount <= 0) {
      return NextResponse.json({ error: "Ajoute au moins un jour travaille pour generer la facture." }, { status: 400 });
    }

    const { data: billingProfile, error: billingError } = await adminClient
      .from("employee_billing_profiles")
      .select("first_name,last_name,company_name,esn_partenaire,address_line_1,address_line_2,postal_code,city,country,phone,email,siret,iban,bic,daily_rate")
      .eq("employee_id", profile.id)
      .single();

    if (billingError || !billingProfile) {
      return NextResponse.json({ error: billingError?.message ?? "Profil de facturation introuvable." }, { status: 400 });
    }

    const dailyRate = Number(billingProfile.daily_rate ?? 0);
    if (!Number.isFinite(dailyRate) || dailyRate <= 0) {
      return NextResponse.json({ error: "Le tarif journalier doit etre renseigne pour generer la facture." }, { status: 400 });
    }

    const { data: documentType, error: typeError } = await adminClient
      .from("document_types")
      .select("id,allowed_uploader_roles,active")
      .eq("code", "facture")
      .single();

    if (typeError || !documentType || documentType.active !== true) {
      return NextResponse.json({ error: "Type facture introuvable." }, { status: 400 });
    }

    if (
      Array.isArray(documentType.allowed_uploader_roles) &&
      documentType.allowed_uploader_roles.length > 0 &&
      !documentType.allowed_uploader_roles.includes("salarie")
    ) {
      return NextResponse.json({ error: "Le salarie ne peut pas generer ce type de document." }, { status: 403 });
    }

    const { data: existingDocuments, error: existingDocumentsError } = await adminClient
      .from("employee_documents")
      .select("id,status,storage_bucket,storage_path,file_name,deleted_at")
      .eq("employee_id", profile.id)
      .eq("document_type_id", documentType.id)
      .eq("period_month", periodMonth)
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingDocumentsError) {
      return NextResponse.json({ error: existingDocumentsError.message }, { status: 400 });
    }

    const existingDocument = (existingDocuments ?? [])[0] ?? null;
    if (existingDocument?.status === "validated" && !existingDocument?.deleted_at) {
      return NextResponse.json({ error: "La facture de cette periode est deja validee et ne peut plus etre remplacee." }, { status: 400 });
    }

    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 30);

    const fileName = `facture-${periodMonth.slice(0, 7)}-${Date.now()}.pdf`;
    const storageBucket = "employee-documents";
    const storagePath = buildEmployeeDocumentPath({
      employeeId: profile.id,
      documentTypeId: documentType.id,
      periodMonth,
      fileName,
    });

    const pdfBuffer = buildInvoicePdfBuffer({
      invoiceNumber: formatInvoiceNumber(periodMonth.slice(0, 7)),
      issueDate: issueDate.toISOString(),
      dueDate: dueDate.toISOString(),
      firstName: billingProfile.first_name,
      lastName: billingProfile.last_name,
      addressLine1: billingProfile.address_line_1,
      addressLine2: billingProfile.address_line_2,
      postalCode: billingProfile.postal_code,
      city: billingProfile.city,
      country: billingProfile.country,
      siret: billingProfile.siret,
      iban: billingProfile.iban,
      bic: billingProfile.bic,
      companyName: billingProfile.company_name,
      periodMonth,
      quantity: workedDaysCount,
      dailyRate,
    });

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
      (matchingRequest ?? []).find((row) => (row.period_month ?? "") === (periodMonth ?? "")) ??
      (matchingRequest ?? [])[0] ??
      null;

    let documentId = existingDocument?.id ?? null;
    let previousStoragePath: string | null = existingDocument?.storage_path ?? null;
    let eventType = "uploaded";

    if (existingDocument) {
      const { error: updateDocumentError } = await adminClient
        .from("employee_documents")
        .update({
          period_month: periodMonth,
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
          deleted_at: null,
          request_id: requestRow?.id ?? null,
          updated_at: now,
        })
        .eq("id", existingDocument.id);

      if (updateDocumentError) {
        await adminClient.storage.from(storageBucket).remove([storagePath]);
        return NextResponse.json({ error: updateDocumentError.message }, { status: 400 });
      }

      documentId = existingDocument.id;
      eventType = "updated";
    } else {
      const { data: insertedDocument, error: insertDocumentError } = await adminClient
        .from("employee_documents")
        .insert({
          employee_id: profile.id,
          uploaded_by: user.id,
          uploader_role: "salarie",
          document_type_id: documentType.id,
          period_month: periodMonth,
          document_date: documentDate,
          status: "pending",
          storage_bucket: storageBucket,
          storage_path: storagePath,
          file_name: fileName,
          mime_type: "application/pdf",
          size_bytes: pdfBuffer.byteLength,
          request_id: requestRow?.id ?? null,
        })
        .select("id")
        .single();

      if (insertDocumentError || !insertedDocument) {
        await adminClient.storage.from(storageBucket).remove([storagePath]);
        return NextResponse.json({ error: insertDocumentError?.message ?? "Insertion de la facture impossible." }, { status: 400 });
      }

      documentId = insertedDocument.id;
      previousStoragePath = null;
    }

    const requestPromise = requestRow
      ? adminClient.from("document_requests").update({ status: "uploaded", updated_at: now }).eq("id", requestRow.id)
      : Promise.resolve({ error: null });

    const eventPromise = adminClient.from("document_events").insert({
      document_id: documentId,
      actor_id: user.id,
      event_type: eventType,
      payload: {
        generated_from: "invoice",
        period_month: periodMonth,
        quantity: workedDaysCount,
        daily_rate: dailyRate,
        total_ht: workedDaysCount * dailyRate,
      },
    });

    const [{ error: requestError }, { error: eventError }] = await Promise.all([requestPromise, eventPromise]);

    if (requestError || eventError) {
      return NextResponse.json({ error: requestError?.message ?? eventError?.message ?? "La facture a ete generee, mais le suivi n'est pas complet." }, { status: 400 });
    }

    if (previousStoragePath && previousStoragePath !== storagePath) {
      await adminClient.storage.from(storageBucket).remove([previousStoragePath]);
    }

    return NextResponse.json({ success: true, documentId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur." }, { status: 500 });
  }
}
