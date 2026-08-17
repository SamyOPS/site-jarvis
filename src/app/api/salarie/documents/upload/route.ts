import { NextResponse } from "next/server";

import { ApiError, withActor } from "@/lib/api-handler";
import {
  assertPeriodProvided,
  assertUploaderRole,
  loadActiveDocumentType,
} from "@/lib/document-types";
import {
  buildEmployeeDocumentPath,
  safeDocumentContentType,
  validateDocumentFile,
} from "@/lib/document-storage";
import { getRhRecipientsForEmployee, notifyRhOfDocument } from "@/lib/email";

export const runtime = "nodejs";

export const POST = withActor(
  ["salarie"],
  async ({ adminClient, user, profile, request }) => {
    const formData = await request.formData();
    const documentTypeId = String(formData.get("documentTypeId") ?? "");
    const periodMonthValue = String(formData.get("periodMonth") ?? "");
    const folderIdValue = String(formData.get("folderId") ?? "");
    const linkedRequestId = String(formData.get("linkedRequestId") ?? "");
    const file = formData.get("file");

    if (!documentTypeId || !(file instanceof File)) {
      throw new ApiError("Parametres incomplets pour le depot.", 400);
    }

    const fileValidationError = validateDocumentFile(file);
    if (fileValidationError) {
      throw new ApiError(fileValidationError, 400);
    }

    const periodMonth = periodMonthValue ? `${periodMonthValue.slice(0, 7)}-01` : null;
    const folderId = folderIdValue || null;

    const documentType = await loadActiveDocumentType(
      adminClient,
      { id: documentTypeId },
      "Type de document introuvable.",
    );
    assertPeriodProvided(documentType, periodMonth);
    assertUploaderRole(
      documentType,
      "salarie",
      "Le salarie ne peut pas deposer ce type de document.",
    );

    if (folderId) {
      const { data: folder, error: folderError } = await adminClient
        .from("document_folders")
        .select("owner_user_id,deleted_at")
        .eq("id", folderId)
        .single();
      if (folderError || !folder || folder.owner_user_id !== profile.id || folder.deleted_at) {
        throw new ApiError("Dossier invalide.", 400);
      }
    }

    if (linkedRequestId) {
      const { data: requestRow, error: requestError } = await adminClient
        .from("document_requests")
        .select("id,employee_id")
        .eq("id", linkedRequestId)
        .single();
      if (requestError || !requestRow || requestRow.employee_id !== profile.id) {
        throw new ApiError("Demande invalide.", 400);
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
    const { error: uploadError } = await adminClient.storage
      .from(storageBucket)
      .upload(storagePath, fileBuffer, {
        contentType: safeDocumentContentType(file),
        upsert: false,
      });
    if (uploadError) {
      throw new ApiError(uploadError.message, 400);
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
      // Le fichier est deja dans le bucket : sans ce nettoyage il y resterait orphelin.
      await adminClient.storage.from(storageBucket).remove([storagePath]);
      throw new ApiError(insertError?.message ?? "Insertion du document impossible.", 400);
    }

    const now = new Date().toISOString();
    const requestUpdatePromise = linkedRequestId
      ? adminClient
          .from("document_requests")
          .update({ status: "uploaded", updated_at: now })
          .eq("id", linkedRequestId)
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

    // Le document est deja cree a ce stade : un echec du suivi est signale en avertissement,
    // pas en erreur. Repondre 400 faisait croire a un echec du depot et poussait a redeposer
    // le meme fichier, creant un doublon.
    const [{ error: requestUpdateError }, { error: eventInsertError }] = await Promise.all([
      requestUpdatePromise,
      eventInsertPromise,
    ]);
    const trackingWarning = requestUpdateError?.message ?? eventInsertError?.message ?? null;

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

    return NextResponse.json({
      success: true,
      documentId: insertedDocument.id,
      ...(trackingWarning
        ? { warning: "Depot effectue, mais le suivi n'est pas complet." }
        : {}),
    });
  },
  { missingSession: "Session salarie manquante." },
);
