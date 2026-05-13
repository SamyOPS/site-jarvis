import { NextResponse } from "next/server";

import { buildEmployeeDocumentPath } from "@/lib/document-storage";
import { getRhRecipientsForEmployee, notifyRhOfDocument } from "@/lib/email";
import {
  getAccessTokenFromRequest,
  getAuthorizedActor,
  isAuthorizedActorError,
} from "@/lib/server-supabase";

export const runtime = "nodejs";

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
    const { adminClient, user, profile } = authorized;

    const formData = await request.formData();
    const documentTypeId = String(formData.get("documentTypeId") ?? "");
    const periodMonthValue = String(formData.get("periodMonth") ?? "");
    const folderIdValue = String(formData.get("folderId") ?? "");
    const linkedRequestId = String(formData.get("linkedRequestId") ?? "");
    const file = formData.get("file");

    if (!documentTypeId || !(file instanceof File)) {
      return NextResponse.json({ error: "Parametres incomplets pour le depot." }, { status: 400 });
    }

    const periodMonth = periodMonthValue ? `${periodMonthValue.slice(0, 7)}-01` : null;
    const folderId = folderIdValue || null;

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
      return NextResponse.json({ error: "Le salarie ne peut pas deposer ce type de document." }, { status: 403 });
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

    if (linkedRequestId) {
      const { data: requestRow, error: requestError } = await adminClient
        .from("document_requests")
        .select("id,employee_id")
        .eq("id", linkedRequestId)
        .single();
      if (requestError || !requestRow || requestRow.employee_id !== profile.id) {
        return NextResponse.json({ error: "Demande invalide." }, { status: 400 });
      }
    }

    const storageBucket = "employee-documents";
    const storagePath = buildEmployeeDocumentPath({
      employeeId: profile.id,
      documentTypeId,
      periodMonth,
      fileName: file.name,
    });

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await adminClient.storage.from(storageBucket).upload(storagePath, fileBuffer, {
      contentType: file.type || undefined,
      upsert: false,
    });
    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
    }

    const { data: insertedDocument, error: insertError } = await adminClient
      .from("employee_documents")
      .insert({
        employee_id: profile.id,
        uploaded_by: user.id,
        uploader_role: "salarie",
        document_type_id: documentTypeId,
        folder_id: folderId,
        period_month: periodMonth,
        document_date: new Date().toISOString().slice(0, 10),
        status: "pending",
        storage_bucket: storageBucket,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
        request_id: linkedRequestId || null,
      })
      .select("id")
      .single();

    if (insertError || !insertedDocument) {
      await adminClient.storage.from(storageBucket).remove([storagePath]);
      return NextResponse.json({ error: insertError?.message ?? "Insertion du document impossible." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const requestUpdatePromise = linkedRequestId
      ? adminClient.from("document_requests").update({ status: "uploaded", updated_at: now }).eq("id", linkedRequestId)
      : Promise.resolve({ error: null });

    const eventInsertPromise = adminClient.from("document_events").insert({
      document_id: insertedDocument.id,
      actor_id: user.id,
      event_type: "uploaded",
      payload: {
        request_id: linkedRequestId || null,
        file_name: file.name,
        period_month: periodMonth,
        uploaded_from: linkedRequestId ? "request" : "manual",
      },
    });

    const [{ error: requestUpdateError }, { error: eventInsertError }] = await Promise.all([
      requestUpdatePromise,
      eventInsertPromise,
    ]);
    if (requestUpdateError || eventInsertError) {
      return NextResponse.json(
        {
          error:
            requestUpdateError?.message ??
            eventInsertError?.message ??
            "Depot effectue, mais le suivi n'est pas complet.",
        },
        { status: 400 },
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
          periodMonth,
        });
      }
    } catch (emailError) {
      console.error("[email] notify RH (salarie upload) failed", emailError);
    }

    return NextResponse.json({ success: true, documentId: insertedDocument.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
