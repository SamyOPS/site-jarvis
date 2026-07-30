import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { canManageOwner, getAuthorizedDocumentsContext } from "@/app/api/documents/_shared";
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
    throw new Error(`La date de ${label} est invalide.`);
  }
  return normalized;
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthorizedDocumentsContext(request);
    if (auth instanceof NextResponse) return auth;
    if (!["rh", "admin"].includes(auth.actorRole ?? "")) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as LeaveGeneratePayload | null;
    if (!body) {
      return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
    }

    const employeeId = String(body.employeeId ?? "").trim();
    if (!employeeId) {
      return NextResponse.json({ error: "Collaborateur requis." }, { status: 400 });
    }

    let startDate: string;
    let endDate: string;
    try {
      startDate = parseIsoDate(body.startDate, "debut");
      endDate = parseIsoDate(body.endDate, "fin");
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Champs invalides." }, { status: 400 });
    }

    if (endDate < startDate) {
      return NextResponse.json({ error: "La date de fin doit etre posterieure ou egale a la date de debut." }, { status: 400 });
    }

    const canManage = await canManageOwner(auth, employeeId);
    if (!canManage) {
      return NextResponse.json({ error: "Acces refuse pour ce collaborateur." }, { status: 403 });
    }

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

    let documentType;
    try {
      documentType = await ensureLeaveDocumentType(auth.adminClient);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Type de document conge indisponible." }, { status: 400 });
    }

    const logoRgbBase64 = await readFile(
      path.join(process.cwd(), "public", "logonoir-rgb120.b64"),
      "utf8",
    );

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
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
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
      return NextResponse.json({ error: insertDocumentError?.message ?? "Insertion de la demande de congé impossible." }, { status: 400 });
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
      return NextResponse.json({ error: "La demande de congé a ete generee, mais le suivi n'est pas complet." }, { status: 400 });
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
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur." }, { status: 500 });
  }
}
