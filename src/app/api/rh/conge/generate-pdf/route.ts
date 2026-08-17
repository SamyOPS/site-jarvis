import { NextResponse } from "next/server";

import { ApiError, withActor } from "@/lib/api-handler";
import { assertUploaderRole } from "@/lib/document-types";
import { readPdfLogoBase64 } from "@/lib/pdf-logo";
import { assertRhAccess } from "@/lib/rh-access";
import { buildEmployeeDocumentPath } from "@/lib/document-storage";
import { notifyEmployeeOfDocument } from "@/lib/email";
import { ensureLeaveDocumentType } from "@/lib/leave-document-type";
import { buildLeavePdfBuffer, type LeaveType } from "@/lib/leave-pdf";
import { toDocumentDate } from "@/lib/server-supabase";

export const runtime = "nodejs";

type LeaveGeneratePayload = {
  employeeId?: unknown;
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
  ["rh", "admin"],
  async ({ adminClient, user, profile, request }) => {
    // Reconstruit la forme attendue par le corps de la route, inchange.
    const auth = { adminClient, actorId: user.id, actorRole: profile.role };

    const body = (await request.json().catch(() => null)) as LeaveGeneratePayload | null;
    if (!body) {
      throw new ApiError("Payload invalide.", 400);
    }

    const employeeId = String(body.employeeId ?? "").trim();
    if (!employeeId) {
      throw new ApiError("Collaborateur requis.", 400);
    }

    const startDate = parseIsoDate(body.startDate, "debut");
    const endDate = parseIsoDate(body.endDate, "fin");

    if (endDate < startDate) {
      throw new ApiError(
        "La date de fin doit etre posterieure ou egale a la date de debut.",
        400,
      );
    }

    // Le type de document est charge AVANT le controle d'habilitation : sans son
    // identifiant, on ne peut verifier que l'affectation du collaborateur, pas la
    // restriction par type. C'est ce qui manquait ici — la route jumelle cote salarie
    // faisait deja ce controle.
    let documentType;
    try {
      documentType = await ensureLeaveDocumentType(adminClient);
    } catch (error) {
      throw new ApiError(
        error instanceof Error ? error.message : "Type de document conge indisponible.",
        400,
      );
    }

    await assertRhAccess(
      adminClient,
      { id: profile.id, role: profile.role },
      employeeId,
      documentType.id,
      "Acces refuse pour ce collaborateur.",
    );

    // Le type de document peut interdire le depot par un RH. Ce controle existait cote
    // salarie et manquait ici.
    assertUploaderRole(
      documentType,
      "rh",
      "Le RH ne peut pas generer ce type de document.",
    );

    const leaveType: LeaveType = body.leaveType === "unpaid" ? "unpaid" : "paid";
    const daysCount =
      Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000) + 1;

    // Nom du salarie : derive de son compte (profil de facturation, sinon profil).
    const [{ data: billingProfile }, { data: employeeProfile }] = await Promise.all([
      auth.adminClient
        .from("employee_billing_profiles")
        .select("first_name,last_name")
        .eq("employee_id", employeeId)
        .maybeSingle(),
      auth.adminClient
        .from("profiles")
        .select("full_name,email")
        .eq("id", employeeId)
        .maybeSingle(),
    ]);

    const employeeName = (
      billingProfile && (billingProfile.first_name || billingProfile.last_name)
        ? `${billingProfile.first_name ?? ""} ${billingProfile.last_name ?? ""}`
        : employeeProfile?.full_name ?? employeeProfile?.email ?? ""
    ).trim();

    const logoRgbBase64 = await readPdfLogoBase64();

    const requestDate = toDocumentDate();
    const fileName = `demande-conge-${startDate}-${Date.now()}.pdf`;
    const storageBucket = "employee-documents";
    const storagePath = buildEmployeeDocumentPath({
      employeeId,
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

    const { error: uploadError } = await auth.adminClient.storage.from(storageBucket).upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });

    if (uploadError) {
      throw new ApiError(uploadError.message, 400);
    }

    const { data: insertedDocument, error: insertDocumentError } = await auth.adminClient
      .from("employee_documents")
      .insert({
        employee_id: employeeId,
        uploaded_by: auth.actorId,
        uploader_role: "rh",
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
      await auth.adminClient.storage.from(storageBucket).remove([storagePath]);
      throw new ApiError(insertDocumentError?.message ?? "Insertion de la demande de congé impossible.", 400);
    }

    const documentId = insertedDocument.id;

    const { error: eventError } = await auth.adminClient.from("document_events").insert({
      document_id: documentId,
      actor_id: auth.actorId,
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
      throw new ApiError("La demande de congé a ete generee, mais le suivi n'est pas complet.", 400);
    }

    try {
      if (employeeProfile?.email) {
        const { data: actorProfile } = await auth.adminClient
          .from("profiles")
          .select("full_name,email")
          .eq("id", auth.actorId)
          .maybeSingle();

        await notifyEmployeeOfDocument({
          employeeEmail: employeeProfile.email,
          employeeName: employeeProfile.full_name,
          documentLabel: documentType.label,
          periodMonth: null,
          uploaderName: actorProfile?.full_name ?? actorProfile?.email ?? null,
        });
      }
    } catch (emailError) {
      console.error("[email] notify employee (conge) failed", emailError);
    }

    return NextResponse.json({ success: true, documentId });
  },
  { missingSession: "Session RH manquante." },
);
