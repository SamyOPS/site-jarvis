import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { buildEmployeeDocumentPath } from "@/lib/document-storage";
import { getRhRecipientsForEmployee, notifyRhOfDocument } from "@/lib/email";
import {
  getAccessTokenFromRequest,
  getAuthorizedActor,
  isAuthorizedActorError,
} from "@/lib/server-supabase";

export const runtime = "nodejs";

async function findMatchingRequest(
  adminClient: SupabaseClient,
  employeeId: string,
  documentTypeId: string,
  periodMonth: string | null,
  allowedStatuses: string[],
) {
  const { data } = await adminClient
    .from("document_requests")
    .select("id,status,period_month")
    .eq("employee_id", employeeId)
    .eq("document_type_id", documentTypeId)
    .in("status", allowedStatuses)
    .order("created_at", { ascending: false })
    .limit(10);

  const rows = (data ?? []) as Array<{ id: string; status: string; period_month: string | null }>;
  return rows.find((row) => (row.period_month ?? "") === (periodMonth ?? "")) ?? null;
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
    const { adminClient, user, profile } = authorized;
    const { id: documentId } = await params;

    const formData = await request.formData();
    const documentTypeId = String(formData.get("documentTypeId") ?? "");
    const fileName = String(formData.get("fileName") ?? "").trim();
    const periodMonthValue = String(formData.get("periodMonth") ?? "");
    const folderIdValue = formData.get("folderId");
    const fileFormValue = formData.get("file");
    const file = fileFormValue instanceof File && fileFormValue.size > 0 ? fileFormValue : null;

    if (!documentTypeId || !fileName) {
      return NextResponse.json({ error: "Type et nom sont obligatoires." }, { status: 400 });
    }

    const periodMonth = periodMonthValue ? `${periodMonthValue.slice(0, 7)}-01` : null;
    const folderId =
      folderIdValue === null || folderIdValue === undefined
        ? null
        : String(folderIdValue) || null;

    const { data: document, error: documentError } = await adminClient
      .from("employee_documents")
      .select(
        "id,employee_id,document_type_id,period_month,folder_id,storage_bucket,storage_path,status,deleted_at",
      )
      .eq("id", documentId)
      .single();

    if (documentError || !document) {
      return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
    }
    if (document.employee_id !== profile.id) {
      return NextResponse.json({ error: "Document non autorise." }, { status: 403 });
    }
    if (document.status === "validated") {
      return NextResponse.json({ error: "Ce document est valide et ne peut plus etre modifie." }, { status: 400 });
    }

    const { data: documentType, error: typeError } = await adminClient
      .from("document_types")
      .select("id,label,requires_period,allowed_uploader_roles,active")
      .eq("id", documentTypeId)
      .single();

    if (typeError || !documentType || documentType.active !== true) {
      return NextResponse.json({ error: "Type de document introuvable." }, { status: 400 });
    }
    if (documentType.requires_period && !periodMonth) {
      return NextResponse.json({ error: "Ce type de document demande une periode." }, { status: 400 });
    }
    if (
      Array.isArray(documentType.allowed_uploader_roles) &&
      documentType.allowed_uploader_roles.length > 0 &&
      !documentType.allowed_uploader_roles.includes("salarie")
    ) {
      return NextResponse.json({ error: "Le salarie ne peut pas modifier ce type de document." }, { status: 403 });
    }

    if (folderId) {
      const { data: folder, error: folderError } = await adminClient
        .from("document_folders")
        .select("owner_user_id,deleted_at")
        .eq("id", folderId)
        .single();
      if (folderError || !folder || folder.owner_user_id !== profile.id || folder.deleted_at) {
        return NextResponse.json({ error: "Dossier invalide." }, { status: 400 });
      }
    }

    const storageBucket = document.storage_bucket || "employee-documents";
    let nextStoragePath = document.storage_path;
    let replacedFile = false;

    if (file) {
      nextStoragePath = buildEmployeeDocumentPath({
        employeeId: profile.id,
        documentTypeId,
        periodMonth,
        fileName: file.name,
      });
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const { error: uploadError } = await adminClient.storage.from(storageBucket).upload(nextStoragePath, fileBuffer, {
        contentType: file.type || undefined,
        upsert: false,
      });
      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 400 });
      }
      replacedFile = true;
    }

    const now = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      document_type_id: documentTypeId,
      folder_id: folderId,
      period_month: periodMonth,
      file_name: fileName,
      storage_bucket: storageBucket,
      storage_path: nextStoragePath,
      status: "pending",
      review_comment: null,
      reviewed_by: null,
      reviewed_at: null,
      updated_at: now,
    };
    if (file) {
      updatePayload.mime_type = file.type || null;
      updatePayload.size_bytes = file.size;
    }

    const { error: updateError } = await adminClient
      .from("employee_documents")
      .update(updatePayload)
      .eq("id", documentId);

    if (updateError) {
      if (replacedFile && nextStoragePath && nextStoragePath !== document.storage_path) {
        await adminClient.storage.from(storageBucket).remove([nextStoragePath]);
      }
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    const previousMatchingRequest = await findMatchingRequest(
      adminClient,
      profile.id,
      document.document_type_id,
      document.period_month,
      ["uploaded", "rejected", "expired"],
    );
    const nextMatchingRequest = await findMatchingRequest(
      adminClient,
      profile.id,
      documentTypeId,
      periodMonth,
      ["pending", "uploaded", "rejected", "expired"],
    );

    const requestUpdates: PromiseLike<unknown>[] = [];
    if (
      previousMatchingRequest &&
      previousMatchingRequest.id !== nextMatchingRequest?.id
    ) {
      requestUpdates.push(
        adminClient
          .from("document_requests")
          .update({ status: "pending", updated_at: now })
          .eq("id", previousMatchingRequest.id),
      );
    }
    if (nextMatchingRequest) {
      requestUpdates.push(
        adminClient
          .from("document_requests")
          .update({ status: "uploaded", updated_at: now })
          .eq("id", nextMatchingRequest.id),
      );
    }

    const eventPromise = adminClient.from("document_events").insert({
      actor_id: user.id,
      document_id: documentId,
      event_type: "updated",
      payload: {
        previous_document_type_id: document.document_type_id,
        next_document_type_id: documentTypeId,
        previous_period_month: document.period_month,
        next_period_month: periodMonth,
        replaced_file: replacedFile,
      },
    });

    await Promise.all([...requestUpdates, eventPromise]);

    if (replacedFile && document.storage_path && document.storage_path !== nextStoragePath) {
      await adminClient.storage.from(storageBucket).remove([document.storage_path]);
    }

    if (replacedFile) {
      try {
        const rhEmails = await getRhRecipientsForEmployee(adminClient, profile.id);
        if (rhEmails.length) {
          await notifyRhOfDocument({
            rhEmails,
            employeeName: profile.full_name,
            employeeEmail: profile.email,
            documentLabel: documentType.label,
            periodMonth,
          });
        }
      } catch (emailError) {
        console.error("[email] notify RH (salarie update) failed", emailError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
