import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildEmployeeDocumentPath,
  safeDocumentContentType,
  validateDocumentFile,
} from "@/lib/document-storage";
import { getRhRecipientsForEmployee, notifyRhOfDocument } from "@/lib/email";
import { ApiError, withActor } from "@/lib/api-handler";

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

type RouteContext = { params: Promise<{ id: string }> };

const SALARIE_SESSION = { missingSession: "Session salarie manquante." };

export const PATCH = withActor<RouteContext>(
  ["salarie"],
  async ({ adminClient, user, profile, request }, { params }) => {
    const { id: documentId } = await params;

    const formData = await request.formData();
    const documentTypeId = String(formData.get("documentTypeId") ?? "");
    const fileName = String(formData.get("fileName") ?? "").trim();
    const periodMonthValue = String(formData.get("periodMonth") ?? "");
    const folderIdValue = formData.get("folderId");
    const fileFormValue = formData.get("file");
    const file = fileFormValue instanceof File && fileFormValue.size > 0 ? fileFormValue : null;

    if (!documentTypeId || !fileName) {
      throw new ApiError("Type et nom sont obligatoires.", 400);
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
      throw new ApiError("Document introuvable.", 404);
    }
    if (document.employee_id !== profile.id) {
      throw new ApiError("Document non autorise.", 403);
    }
    if (document.status === "validated") {
      throw new ApiError("Ce document est valide et ne peut plus etre modifie.", 400);
    }

    const { data: documentType, error: typeError } = await adminClient
      .from("document_types")
      .select("id,label,requires_period,allowed_uploader_roles,active")
      .eq("id", documentTypeId)
      .single();

    if (typeError || !documentType || documentType.active !== true) {
      throw new ApiError("Type de document introuvable.", 400);
    }
    if (documentType.requires_period && !periodMonth) {
      throw new ApiError("Ce type de document demande une periode.", 400);
    }
    if (
      Array.isArray(documentType.allowed_uploader_roles) &&
      documentType.allowed_uploader_roles.length > 0 &&
      !documentType.allowed_uploader_roles.includes("salarie")
    ) {
      throw new ApiError("Le salarie ne peut pas modifier ce type de document.", 403);
    }

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

    const storageBucket = document.storage_bucket || "employee-documents";
    let nextStoragePath = document.storage_path;
    let replacedFile = false;

    if (file) {
      const fileValidationError = validateDocumentFile(file);
      if (fileValidationError) {
        throw new ApiError(fileValidationError, 400);
      }

      nextStoragePath = buildEmployeeDocumentPath({
        employeeId: profile.id,
        documentTypeId,
        periodMonth,
        fileName: file.name,
      });
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const { error: uploadError } = await adminClient.storage.from(storageBucket).upload(nextStoragePath, fileBuffer, {
        contentType: safeDocumentContentType(file),
        upsert: false,
      });
      if (uploadError) {
        throw new ApiError(uploadError.message, 400);
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
      throw new ApiError(updateError.message, 400);
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
  },
  SALARIE_SESSION,
);

/**
 * Suppression definitive d'un document par le salarie.
 *
 * Les memes garde-fous que la mise a la corbeille (/trash) s'appliquent ici : un document
 * valide par le RH n'est plus supprimable, et le passage par la corbeille est obligatoire.
 * Le tableau de bord supprimait auparavant la ligne et le fichier directement depuis le
 * navigateur, ce qui contournait ces deux regles.
 */
export const DELETE = withActor<RouteContext>(
  ["salarie"],
  async ({ adminClient, profile }, { params }) => {

    const { id } = await params;
    const documentId = String(id ?? "").trim();
    if (!documentId) {
      throw new ApiError("Document introuvable.", 400);
    }

    const { data: document, error: documentError } = await adminClient
      .from("employee_documents")
      .select(
        "id,employee_id,document_type_id,period_month,status,deleted_at,storage_bucket,storage_path",
      )
      .eq("id", documentId)
      .maybeSingle();

    if (documentError) {
      throw new ApiError(documentError.message, 400);
    }
    if (!document) {
      throw new ApiError("Document introuvable.", 404);
    }
    if (document.employee_id !== profile.id) {
      throw new ApiError("Document non autorise.", 403);
    }
    if (document.status === "validated") {
      throw new ApiError("Ce document est valide par le RH et ne peut plus etre supprime.", 400);
    }
    if (!document.deleted_at) {
      throw new ApiError("Le document doit etre dans la corbeille avant suppression definitive.", 400);
    }

    const now = new Date().toISOString();

    // Le fichier part avant la ligne qui le designe : dans l'ordre inverse, un echec du
    // storage laisse un fichier que plus rien ne reference, donc impossible a retrouver.
    if (document.storage_path) {
      const { error: storageRemoveError } = await adminClient.storage
        .from(document.storage_bucket || "employee-documents")
        .remove([document.storage_path]);
      if (storageRemoveError) {
        throw new ApiError(`Suppression du fichier impossible : ${storageRemoveError.message}`, 400);
      }
    }

    const { error: craUnlinkError } = await adminClient
      .from("cra_records")
      .update({ status: "draft", employee_document_id: null, updated_at: now })
      .eq("employee_document_id", documentId);
    if (craUnlinkError) {
      throw new ApiError(craUnlinkError.message, 400);
    }

    const { error: eventsDeleteError } = await adminClient
      .from("document_events")
      .delete()
      .eq("document_id", documentId);
    if (eventsDeleteError) {
      throw new ApiError(eventsDeleteError.message, 400);
    }

    const { error: deleteError } = await adminClient
      .from("employee_documents")
      .delete()
      .eq("id", documentId);
    if (deleteError) {
      throw new ApiError(deleteError.message, 400);
    }

    const matchingRequest = await findMatchingRequest(
      adminClient,
      profile.id,
      document.document_type_id,
      document.period_month,
      ["validated", "uploaded", "rejected", "expired"],
    );
    if (matchingRequest) {
      await adminClient
        .from("document_requests")
        .update({ status: "pending", updated_at: now })
        .eq("id", matchingRequest.id);
    }

    return NextResponse.json({ success: true, permanent: true });
  },
  SALARIE_SESSION,
);
