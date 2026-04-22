import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { canManageOwner, getAuthorizedDocumentsContext } from "@/app/api/documents/_shared";
import { buildCraPdfBuffer } from "@/lib/cra-pdf";
import { buildEmployeeDocumentPath } from "@/lib/document-storage";
import { buildInvoicePdfBuffer } from "@/public/partenaire/invoice-pdf";
import { toDocumentDate, toIsoMonthStart } from "@/lib/server-supabase";

export const runtime = "nodejs";

type GenerateKind = "cra" | "facture";

type GeneratePayload = {
  kind?: unknown;
  employeeId?: unknown;
  billingProfileEmployeeId?: unknown;
  periodMonth?: unknown;
  workedDaysCount?: unknown;
  notes?: unknown;
  entries?: unknown;
};

type GenerateEntryPayload = {
  workDate?: unknown;
  dayQuantity?: unknown;
  label?: unknown;
};

function parsePositiveInteger(value: unknown, field: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    throw new Error(`Le champ "${field}" doit etre un entier strictement positif.`);
  }
  return parsed;
}

function buildWorkEntries(periodMonth: string, workedDaysCount: number) {
  const entries: Array<{ workDate: string; dayQuantity: number; label: string | null }> = [];
  const monthStart = new Date(`${periodMonth}T00:00:00.000Z`);
  let cursor = new Date(monthStart);

  while (entries.length < workedDaysCount) {
    if (cursor.getUTCMonth() !== monthStart.getUTCMonth()) {
      throw new Error("Impossible de repartir le nombre de jours travailles sur la periode.");
    }
    const dayOfWeek = cursor.getUTCDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      entries.push({
        workDate: cursor.toISOString().slice(0, 10),
        dayQuantity: 1,
        label: null,
      });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return entries;
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthorizedDocumentsContext(request);
    if (auth instanceof NextResponse) return auth;
    if (!["rh", "admin"].includes(auth.actorRole ?? "")) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as GeneratePayload | null;
    const kind = String(body?.kind ?? "").trim() as GenerateKind;
    const employeeId = String(body?.employeeId ?? "").trim();
    const billingProfileEmployeeId = String(body?.billingProfileEmployeeId ?? "").trim();
    const periodMonthRaw = String(body?.periodMonth ?? "").trim();
    const notes = String(body?.notes ?? "").trim() || null;

    if (!["cra", "facture"].includes(kind)) {
      return NextResponse.json({ error: "Type de document invalide." }, { status: 400 });
    }
    if (!employeeId) {
      return NextResponse.json({ error: "Collaborateur requis." }, { status: 400 });
    }
    if (!billingProfileEmployeeId) {
      return NextResponse.json({ error: "Profil de facturation requis." }, { status: 400 });
    }
    if (!periodMonthRaw) {
      return NextResponse.json({ error: "Periode requise." }, { status: 400 });
    }

    let periodMonth: string;
    try {
      periodMonth = toIsoMonthStart(periodMonthRaw).slice(0, 7);
    } catch {
      return NextResponse.json({ error: "Periode invalide." }, { status: 400 });
    }

    const rawEntries = Array.isArray(body?.entries) ? (body?.entries as GenerateEntryPayload[]) : [];
    const entriesFromPayload = rawEntries
      .map((entry) => ({
        workDate: String(entry?.workDate ?? "").trim(),
        dayQuantity: Number(entry?.dayQuantity ?? 0),
        label: String(entry?.label ?? "").trim() || null,
      }))
      .filter(
        (entry) =>
          /^\d{4}-\d{2}-\d{2}$/.test(entry.workDate) &&
          entry.workDate.startsWith(`${periodMonth}-`) &&
          Number.isFinite(entry.dayQuantity) &&
          entry.dayQuantity > 0,
      );

    let workedDaysCount =
      entriesFromPayload.reduce((total, entry) => total + entry.dayQuantity, 0);
    if (workedDaysCount <= 0) {
      try {
        workedDaysCount = parsePositiveInteger(body?.workedDaysCount, "jours travailles");
      } catch (parseError) {
        return NextResponse.json(
          { error: parseError instanceof Error ? parseError.message : "Nombre de jours invalide." },
          { status: 400 },
        );
      }
    }

    const canManageEmployee = await canManageOwner(auth, employeeId);
    if (!canManageEmployee) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
    }
    const canUseBillingProfile = await canManageOwner(auth, billingProfileEmployeeId);
    if (!canUseBillingProfile) {
      return NextResponse.json({ error: "Acces refuse pour ce profil de facturation." }, { status: 403 });
    }

    const { data: billingProfile, error: billingError } = await auth.adminClient
      .from("employee_billing_profiles")
      .select("first_name,last_name,company_name,esn_partenaire,address_line_1,address_line_2,postal_code,city,country,phone,email,siret,iban,bic,daily_rate")
      .eq("employee_id", billingProfileEmployeeId)
      .single();

    if (billingError || !billingProfile) {
      return NextResponse.json({ error: billingError?.message ?? "Profil de facturation introuvable." }, { status: 400 });
    }

    const dailyRate = Number(billingProfile.daily_rate ?? 0);
    if (!Number.isFinite(dailyRate) || dailyRate <= 0) {
      return NextResponse.json({ error: "Le tarif journalier du profil est invalide." }, { status: 400 });
    }

    const entries =
      entriesFromPayload.length > 0
        ? entriesFromPayload
        : buildWorkEntries(periodMonth, Math.max(1, Math.round(workedDaysCount)));
    const now = new Date().toISOString();
    const documentDate = toDocumentDate();
    const storageBucket = "employee-documents";

    if (kind === "cra") {
      const logoRgbBase64 = await readFile(
        path.join(process.cwd(), "public", "logonoir-rgb120.b64"),
        "utf8",
      );
      const { data: documentType, error: typeError } = await auth.adminClient
        .from("document_types")
        .select("id,active")
        .eq("code", "cra")
        .single();

      if (typeError || !documentType || !documentType.active) {
        return NextResponse.json({ error: "Type CRA introuvable." }, { status: 400 });
      }

      const periodStart = `${periodMonth}-01`;
      const { data: existingCra, error: existingCraError } = await auth.adminClient
        .from("cra_records")
        .select("id,status,pdf_version,employee_document_id")
        .eq("employee_id", employeeId)
        .eq("period_month", periodStart)
        .maybeSingle();

      if (existingCraError) {
        return NextResponse.json({ error: existingCraError.message }, { status: 400 });
      }
      if (existingCra?.status === "validated") {
        return NextResponse.json({ error: "Un CRA valide existe deja pour cette periode." }, { status: 400 });
      }

      let craId = existingCra?.id ?? null;
      let pdfVersion = existingCra?.pdf_version ?? 1;
      if (!existingCra) {
        const { data: insertedCra, error: insertCraError } = await auth.adminClient
          .from("cra_records")
          .insert({
            employee_id: employeeId,
            period_month: periodStart,
            status: "draft",
            ...billingProfile,
            worked_days_count: workedDaysCount,
            notes,
          })
          .select("id,pdf_version")
          .single();
        if (insertCraError || !insertedCra) {
          return NextResponse.json({ error: insertCraError?.message ?? "Creation du CRA impossible." }, { status: 400 });
        }
        craId = insertedCra.id;
        pdfVersion = insertedCra.pdf_version;
      } else {
        const { error: updateCraError } = await auth.adminClient
          .from("cra_records")
          .update({
            status: "draft",
            ...billingProfile,
            worked_days_count: workedDaysCount,
            notes,
            updated_at: now,
          })
          .eq("id", existingCra.id);
        if (updateCraError) {
          return NextResponse.json({ error: updateCraError.message }, { status: 400 });
        }
      }

      const { error: deleteEntriesError } = await auth.adminClient
        .from("cra_entries")
        .delete()
        .eq("cra_id", craId);
      if (deleteEntriesError) {
        return NextResponse.json({ error: deleteEntriesError.message }, { status: 400 });
      }

      const { error: insertEntriesError } = await auth.adminClient
        .from("cra_entries")
        .insert(
          entries.map((entry) => ({
            cra_id: craId,
            work_date: entry.workDate,
            day_quantity: entry.dayQuantity,
            label: entry.label,
          })),
        );
      if (insertEntriesError) {
        return NextResponse.json({ error: insertEntriesError.message }, { status: 400 });
      }

      const nextPdfVersion = existingCra?.employee_document_id ? pdfVersion + 1 : pdfVersion;
      const fileName = `cra-${periodMonth}-v${nextPdfVersion}.pdf`;
      const storagePath = buildEmployeeDocumentPath({
        employeeId,
        documentTypeId: documentType.id,
        periodMonth: periodStart,
        fileName,
      });
      const pdfBuffer = buildCraPdfBuffer(
        {
          firstName: billingProfile.first_name,
          lastName: billingProfile.last_name,
          companyName: billingProfile.company_name,
          esnPartenaire: billingProfile.esn_partenaire,
          addressLine1: billingProfile.address_line_1,
          addressLine2: billingProfile.address_line_2,
          postalCode: billingProfile.postal_code,
          city: billingProfile.city,
          country: billingProfile.country,
          phone: billingProfile.phone,
          email: billingProfile.email,
          siret: billingProfile.siret,
          iban: billingProfile.iban,
          bic: billingProfile.bic,
          dailyRate,
          workedDaysCount,
          periodMonth: periodStart,
          notes,
          entries: entries.map((entry) => ({
            workDate: entry.workDate,
            dayQuantity: entry.dayQuantity,
            label: entry.label,
          })),
        },
        logoRgbBase64.trim(),
      );

      const { error: uploadError } = await auth.adminClient.storage
        .from(storageBucket)
        .upload(storagePath, pdfBuffer, {
          contentType: "application/pdf",
          upsert: false,
        });
      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 400 });
      }

      const { data: existingDocument } = await auth.adminClient
        .from("employee_documents")
        .select("id,status,storage_path,deleted_at")
        .eq("employee_id", employeeId)
        .eq("document_type_id", documentType.id)
        .eq("period_month", periodStart)
        .order("created_at", { ascending: false })
        .limit(1);

      let documentId = existingDocument?.[0]?.id ?? null;
      let previousStoragePath = existingDocument?.[0]?.storage_path ?? null;

      if (existingDocument?.[0]?.status === "validated" && !existingDocument?.[0]?.deleted_at) {
        return NextResponse.json({ error: "Le CRA de cette periode est deja valide." }, { status: 400 });
      }

      if (documentId) {
        const { error: updateDocumentError } = await auth.adminClient
          .from("employee_documents")
          .update({
            uploaded_by: auth.actorId,
            uploader_role: "rh",
            status: "validated",
            reviewed_by: auth.actorId,
            reviewed_at: now,
            review_comment: "Genere par RH",
            document_date: documentDate,
            storage_bucket: storageBucket,
            storage_path: storagePath,
            file_name: fileName,
            mime_type: "application/pdf",
            size_bytes: pdfBuffer.byteLength,
            source_kind: "generated",
            deleted_at: null,
            updated_at: now,
          })
          .eq("id", documentId);
        if (updateDocumentError) {
          return NextResponse.json({ error: updateDocumentError.message }, { status: 400 });
        }
      } else {
        const { data: insertedDocument, error: insertDocumentError } = await auth.adminClient
          .from("employee_documents")
          .insert({
            employee_id: employeeId,
            uploaded_by: auth.actorId,
            uploader_role: "rh",
            document_type_id: documentType.id,
            period_month: periodStart,
            document_date: documentDate,
            status: "validated",
            reviewed_by: auth.actorId,
            reviewed_at: now,
            review_comment: "Genere par RH",
            storage_bucket: storageBucket,
            storage_path: storagePath,
            file_name: fileName,
            mime_type: "application/pdf",
            size_bytes: pdfBuffer.byteLength,
            source_kind: "generated",
          })
          .select("id")
          .single();
        if (insertDocumentError || !insertedDocument) {
          return NextResponse.json({ error: insertDocumentError?.message ?? "Insertion du CRA impossible." }, { status: 400 });
        }
        documentId = insertedDocument.id;
        previousStoragePath = null;
      }

      await auth.adminClient
        .from("cra_records")
        .update({
          employee_document_id: documentId,
          pdf_version: nextPdfVersion,
          status: "validated",
          validated_at: now,
          updated_at: now,
        })
        .eq("id", craId);

      if (previousStoragePath && previousStoragePath !== storagePath) {
        await auth.adminClient.storage.from(storageBucket).remove([previousStoragePath]);
      }

      await auth.adminClient.from("document_events").insert({
        document_id: documentId,
        actor_id: auth.actorId,
        event_type: "validated",
        payload: {
          generated_from: "cra",
          cra_id: craId,
          period_month: periodStart,
          billing_profile_employee_id: billingProfileEmployeeId,
        },
      });

      return NextResponse.json({ success: true, kind: "cra", documentId, craId });
    }

    const { data: documentType, error: typeError } = await auth.adminClient
      .from("document_types")
      .select("id,active")
      .eq("code", "facture")
      .single();
    if (typeError || !documentType || !documentType.active) {
      return NextResponse.json({ error: "Type facture introuvable." }, { status: 400 });
    }

    const periodStart = `${periodMonth}-01`;
    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 30);

    const fileName = `facture-${periodMonth}-${Date.now()}.pdf`;
    const storagePath = buildEmployeeDocumentPath({
      employeeId,
      documentTypeId: documentType.id,
      periodMonth: periodStart,
      fileName,
    });

    const pdfBuffer = buildInvoicePdfBuffer({
      invoiceNumber: periodMonth.replace(/-/g, ""),
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
      periodMonth: periodStart,
      quantity: workedDaysCount,
      dailyRate,
    });

    const { error: uploadError } = await auth.adminClient.storage
      .from(storageBucket)
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
    }

    const { data: existingDocument } = await auth.adminClient
      .from("employee_documents")
      .select("id,status,storage_path,deleted_at")
      .eq("employee_id", employeeId)
      .eq("document_type_id", documentType.id)
      .eq("period_month", periodStart)
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingDocument?.[0]?.status === "validated" && !existingDocument?.[0]?.deleted_at) {
      return NextResponse.json({ error: "La facture de cette periode est deja validee." }, { status: 400 });
    }

    let documentId = existingDocument?.[0]?.id ?? null;
    const previousStoragePath = existingDocument?.[0]?.storage_path ?? null;

    if (documentId) {
      const { error: updateDocumentError } = await auth.adminClient
        .from("employee_documents")
        .update({
          uploaded_by: auth.actorId,
          uploader_role: "rh",
          status: "validated",
          reviewed_by: auth.actorId,
          reviewed_at: now,
          review_comment: "Generee par RH",
          document_date: documentDate,
          storage_bucket: storageBucket,
          storage_path: storagePath,
          file_name: fileName,
          mime_type: "application/pdf",
          size_bytes: pdfBuffer.byteLength,
          source_kind: "generated",
          deleted_at: null,
          updated_at: now,
        })
        .eq("id", documentId);
      if (updateDocumentError) {
        return NextResponse.json({ error: updateDocumentError.message }, { status: 400 });
      }
    } else {
      const { data: insertedDocument, error: insertDocumentError } = await auth.adminClient
        .from("employee_documents")
        .insert({
          employee_id: employeeId,
          uploaded_by: auth.actorId,
          uploader_role: "rh",
          document_type_id: documentType.id,
          period_month: periodStart,
          document_date: documentDate,
          status: "validated",
          reviewed_by: auth.actorId,
          reviewed_at: now,
          review_comment: "Generee par RH",
          storage_bucket: storageBucket,
          storage_path: storagePath,
          file_name: fileName,
          mime_type: "application/pdf",
          size_bytes: pdfBuffer.byteLength,
          source_kind: "generated",
        })
        .select("id")
        .single();
      if (insertDocumentError || !insertedDocument) {
        return NextResponse.json({ error: insertDocumentError?.message ?? "Insertion de la facture impossible." }, { status: 400 });
      }
      documentId = insertedDocument.id;
    }

    if (previousStoragePath && previousStoragePath !== storagePath) {
      await auth.adminClient.storage.from(storageBucket).remove([previousStoragePath]);
    }

    await auth.adminClient.from("document_events").insert({
      document_id: documentId,
      actor_id: auth.actorId,
      event_type: "validated",
      payload: {
        generated_from: "invoice",
        period_month: periodStart,
        worked_days_count: workedDaysCount,
        daily_rate: dailyRate,
        billing_profile_employee_id: billingProfileEmployeeId,
      },
    });

    return NextResponse.json({ success: true, kind: "facture", documentId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
