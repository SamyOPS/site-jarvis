import { NextResponse } from "next/server";

import { ApiError, withActor } from "@/lib/api-handler";
import { buildEmployeeDocumentPath } from "@/lib/document-storage";
import { getRhRecipientsForEmployee, notifyRhOfDocument } from "@/lib/email";
import { ensureLeaveDocumentType } from "@/lib/leave-document-type";
import { buildLeavePdfBuffer, type LeaveType } from "@/lib/leave-pdf";
import { readPdfLogoBase64 } from "@/lib/pdf-logo";
import { toDocumentDate } from "@/lib/server-supabase";

export const runtime = "nodejs";

type LeaveGeneratePayload = {
  startDate?: unknown;
  endDate?: unknown;
  leaveType?: unknown;
};

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDate(value: unknown, label: string) {
  const normalized = String(value ?? "").trim();
  if (!dateRegex.test(normalized) || Number.isNaN(new Date(normalized).getTime())) {
    throw new ApiError(`La date de ${label} est invalide.`, 400);
  }
  return normalized;
}

export const POST = withActor(
  ["salarie"],
  async ({ adminClient, profile, user, request }) => {
    // Lu apres l'autorisation : la version precedente lisait le logo sur disque avant meme
    // de verifier le jeton.
    const logoRgbBase64 = await readPdfLogoBase64();

    const body = (await request.json().catch(() => null)) as LeaveGeneratePayload | null;
    if (!body) {
      throw new ApiError("Payload invalide.", 400);
    }

    const startDate = parseIsoDate(body.startDate, "debut");
    const endDate = parseIsoDate(body.endDate, "fin");

    // Nom du salarie : derive de son compte (profil de facturation, sinon profil).
    const { data: billingProfile } = await adminClient
      .from("employee_billing_profiles")
      .select("first_name,last_name")
      .eq("employee_id", profile.id)
      .maybeSingle();

    const employeeName = (
      billingProfile && (billingProfile.first_name || billingProfile.last_name)
        ? `${billingProfile.first_name ?? ""} ${billingProfile.last_name ?? ""}`
        : profile.full_name ?? profile.email ?? ""
    ).trim();

    if (endDate < startDate) {
      throw new ApiError(
        "La date de fin doit etre posterieure ou egale a la date de debut.",
        400,
      );
    }

    const leaveType: LeaveType = body.leaveType === "unpaid" ? "unpaid" : "paid";
    const daysCount =
      Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000) + 1;

    let documentType;
    try {
      documentType = await ensureLeaveDocumentType(adminClient);
    } catch (error) {
      throw new ApiError(
        error instanceof Error ? error.message : "Type de document conge indisponible.",
        400,
      );
    }

    if (
      Array.isArray(documentType.allowed_uploader_roles) &&
      documentType.allowed_uploader_roles.length > 0 &&
      !documentType.allowed_uploader_roles.includes("salarie")
    ) {
      throw new ApiError("Le salarie ne peut pas generer ce type de document.", 403);
    }

    const requestDate = toDocumentDate();
    const fileName = `demande-conge-${startDate}-${Date.now()}.pdf`;
    const storageBucket = "employee-documents";
    const storagePath = buildEmployeeDocumentPath({
      employeeId: profile.id,
      documentTypeId: documentType.id,
      periodMonth: null,
      fileName,
    });

    const pdfBuffer = buildLeavePdfBuffer(
      {
        employeeName,
        leaveType,
        startDate,
        endDate,
        daysCount,
        requestDate,
      },
      logoRgbBase64.trim(),
    );

    const { error: uploadError } = await adminClient.storage
      .from(storageBucket)
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      throw new ApiError(uploadError.message, 400);
    }

    const now = new Date().toISOString();
    const { data: insertedDocument, error: insertDocumentError } = await adminClient
      .from("employee_documents")
      .insert({
        employee_id: profile.id,
        uploaded_by: user.id,
        uploader_role: "salarie",
        document_type_id: documentType.id,
        period_month: null,
        document_date: requestDate,
        status: "pending",
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
      // Le PDF est deja dans le bucket : sans ce nettoyage il y resterait orphelin.
      await adminClient.storage.from(storageBucket).remove([storagePath]);
      throw new ApiError(
        insertDocumentError?.message ?? "Insertion de la demande de congé impossible.",
        400,
      );
    }

    const documentId = insertedDocument.id;

    const { error: eventError } = await adminClient.from("document_events").insert({
      document_id: documentId,
      actor_id: user.id,
      event_type: "uploaded",
      payload: {
        generated_from: "conge",
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        days_count: daysCount,
      },
    });

    if (eventError) {
      throw new ApiError(
        "La demande de congé a ete generee, mais le suivi n'est pas complet.",
        400,
      );
    }

    try {
      const rhEmails = await getRhRecipientsForEmployee(adminClient, profile.id);
      if (rhEmails.length) {
        await notifyRhOfDocument({
          rhEmails,
          employeeName: profile.full_name,
          employeeEmail: profile.email,
          documentLabel: documentType.label,
          periodMonth: null,
        });
      }
    } catch (emailError) {
      console.error("[email] notify RH (conge) failed", emailError);
    }

    return NextResponse.json({ success: true, documentId, updatedAt: now });
  },
  { missingSession: "Session salarie manquante." },
);
