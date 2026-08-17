import { NextResponse } from "next/server";

import {
  buildEmployeeDocumentPath,
  safeDocumentContentType,
  validateDocumentFile,
} from "@/lib/document-storage";
import { notifyEmployeeOfDocument } from "@/lib/email";
import { assertRhAccess } from "@/lib/rh-access";
import { ApiError, withActor } from "@/lib/api-handler";
import {
  assertPeriodProvided,
  assertUploaderRole,
  loadActiveDocumentType,
} from "@/lib/document-types";

const RH_SESSION = { missingSession: "Session RH manquante." };

export const POST = withActor(
  ["rh", "admin"],
  async ({ adminClient, user, profile: actorProfile, request }) => {

    const formData = await request.formData();
    const requestedEmployeeId = String(formData.get("employeeId") ?? "");
    const documentTypeId = String(formData.get("documentTypeId") ?? "");
    const periodMonthValue = String(formData.get("periodMonth") ?? "");
    const file = formData.get("file");

    if (!documentTypeId || !(file instanceof File)) {
      throw new ApiError("Parametres incomplets pour le depot RH.", 400);
    }

    const fileValidationError = validateDocumentFile(file);
    if (fileValidationError) {
      throw new ApiError(fileValidationError, 400);
    }

    const periodMonth = periodMonthValue ? `${periodMonthValue}-01` : null;
    let employeeId = actorProfile.id;
    let hasSelectedEmployee = false;

    if (requestedEmployeeId) {
      const { data: employeeProfile, error: employeeError } = await adminClient
        .from("profiles")
        .select("id,role")
        .eq("id", requestedEmployeeId)
        .single();

      if (employeeError || !employeeProfile || employeeProfile.role !== "salarie") {
        throw new ApiError("Collaborateur invalide.", 400);
      }
      await assertRhAccess(
        adminClient,
        { id: actorProfile.id, role: actorProfile.role },
        employeeProfile.id,
        documentTypeId,
      );

      employeeId = employeeProfile.id;
      hasSelectedEmployee = true;
    }

    const documentType = await loadActiveDocumentType(
      adminClient,
      { id: documentTypeId },
      "Type de document introuvable.",
    );
    assertPeriodProvided(documentType, periodMonth);
    assertUploaderRole(documentType, "rh", "Le RH ne peut pas deposer ce type de document.");

    const storageBucket = "employee-documents";
    const storagePath = buildEmployeeDocumentPath({
      employeeId,
      documentTypeId,
      periodMonth,
      fileName: file.name,
    });

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await adminClient.storage.from(storageBucket).upload(storagePath, fileBuffer, {
      contentType: safeDocumentContentType(file),
      upsert: false,
    });

    if (uploadError) {
      throw new ApiError(uploadError.message, 400);
    }

    const reviewedAt = new Date().toISOString();
    const { data: insertedDocument, error: insertError } = await adminClient
      .from("employee_documents")
      .insert({
        employee_id: employeeId,
        uploaded_by: user.id,
        uploader_role: "rh",
        document_type_id: documentTypeId,
        period_month: periodMonth,
        document_date: new Date().toISOString().slice(0, 10),
        status: "validated",
        storage_bucket: storageBucket,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
        reviewed_by: user.id,
        reviewed_at: reviewedAt,
        review_comment: "Depose par le RH",
      })
      .select("id")
      .single();

    if (insertError || !insertedDocument) {
      await adminClient.storage.from(storageBucket).remove([storagePath]);
      throw new ApiError(insertError?.message ?? "Insertion du document RH impossible.", 400);
    }

    let requestWithSamePeriod: { id: string } | null = null;
    if (hasSelectedEmployee) {
      const { data: matchingRequest } = await adminClient
        .from("document_requests")
        .select("id,status,period_month")
        .eq("employee_id", employeeId)
        .eq("document_type_id", documentTypeId)
        .in("status", ["pending", "uploaded", "rejected", "expired"])
        .order("created_at", { ascending: false })
        .limit(10);

      // Seule une demande de la meme periode est rapprochee. Le repli sur la demande la plus
      // recente cloturait une demande d'un autre mois : deposer la fiche de paie de mars
      // marquait « validee » celle de janvier, restee non satisfaite.
      requestWithSamePeriod =
        (matchingRequest ?? []).find((requestRow) => (requestRow.period_month ?? "") === (periodMonth ?? "")) ??
        null;
    }

    const requestUpdatePromise = requestWithSamePeriod
      ? adminClient.from("document_requests").update({ status: "validated", updated_at: reviewedAt }).eq("id", requestWithSamePeriod.id)
      : Promise.resolve({ error: null });

    const eventInsertPromise = adminClient.from("document_events").insert({
      document_id: insertedDocument.id,
      actor_id: user.id,
      event_type: "validated",
      payload: {
        uploaded_from: "rh",
        employee_id: hasSelectedEmployee ? employeeId : null,
        document_type_id: documentTypeId,
        period_month: periodMonth,
        review_comment: "Depose par le RH",
      },
    });

    // Le document est deja cree a ce stade : un echec du suivi est signale en avertissement,
    // pas en erreur. Repondre 400 faisait croire a un echec du depot et poussait a redeposer
    // le meme fichier, creant un doublon.
    const [{ error: requestUpdateError }, { error: eventInsertError }] = await Promise.all([requestUpdatePromise, eventInsertPromise]);
    const trackingWarning = requestUpdateError?.message ?? eventInsertError?.message ?? null;

    if (hasSelectedEmployee) {
      const { data: employeeRow } = await adminClient
        .from("profiles")
        .select("email,full_name")
        .eq("id", employeeId)
        .single();
      if (employeeRow?.email) {
        await notifyEmployeeOfDocument({
          employeeEmail: employeeRow.email,
          employeeName: employeeRow.full_name,
          documentLabel: documentType.label,
          periodMonth,
          uploaderName: actorProfile.full_name ?? actorProfile.email,
        }).catch((error) => console.error("[email] notify employee failed", error));
      }
    }

    return NextResponse.json({
      success: true,
      documentId: insertedDocument.id,
      ...(trackingWarning
        ? { warning: "Le document RH a ete depose, mais le suivi n'est pas complet." }
        : {}),
    });
  },
  RH_SESSION,
);

export const DELETE = withActor(
  ["rh", "admin"],
  async ({ adminClient, user, profile: actorProfile, request }) => {

    const body = (await request.json().catch(() => null)) as { documentId?: string; permanent?: boolean } | null;
    const documentId = body?.documentId ?? "";
    const permanent = body?.permanent === true;
    if (!documentId) {
      throw new ApiError("Document RH introuvable.", 400);
    }

    const { data: documentRow, error: documentError } = await adminClient
      .from("employee_documents")
      .select("id,employee_id,document_type_id,period_month,storage_bucket,storage_path,uploader_role,uploaded_by,status,deleted_at")
      .eq("id", documentId)
      .single();

    if (documentError || !documentRow) {
      throw new ApiError(documentError?.message ?? "Document introuvable.", 404);
    }
    if (documentRow.uploader_role !== "rh") {
      throw new ApiError("Seuls les documents RH peuvent etre supprimes ici.", 403);
    }
    if (actorProfile.role !== "admin" && documentRow.uploaded_by !== user.id) {
      throw new ApiError("Tu ne peux supprimer que tes propres documents RH.", 403);
    }
    await assertRhAccess(
      adminClient,
      { id: actorProfile.id, role: actorProfile.role },
      documentRow.employee_id ?? "",
      documentRow.document_type_id ?? undefined,
      "Ce document n'appartient pas a un collaborateur autorise.",
    );

    const now = new Date().toISOString();
    const { data: matchingRequests } = await adminClient
      .from("document_requests")
      .select("id,status,period_month")
      .eq("employee_id", documentRow.employee_id)
      .eq("document_type_id", documentRow.document_type_id)
      .in("status", ["validated", "uploaded", "rejected", "expired"])
      .order("created_at", { ascending: false })
      .limit(10);

    const matchingRequest =
      (matchingRequests ?? []).find((requestRow) => (requestRow.period_month ?? "") === (documentRow.period_month ?? "")) ??
      null;

    if (!permanent) {
      const { error: documentSoftDeleteError } = await adminClient
        .from("employee_documents")
        .update({ deleted_at: now, updated_at: now })
        .eq("id", documentId);
      if (documentSoftDeleteError) {
        throw new ApiError(documentSoftDeleteError.message, 400);
      }
      // Si le document est un CRA, casser le lien et remettre en draft pour permettre une recréation.
      const { error: craResetError } = await adminClient
        .from("cra_records")
        .update({ status: "draft", employee_document_id: null, updated_at: now })
        .eq("employee_document_id", documentId);
      if (craResetError) {
        throw new ApiError(craResetError.message, 400);
      }
      if (matchingRequest) {
        const { error: requestUpdateError } = await adminClient
          .from("document_requests")
          .update({ status: "pending", updated_at: now })
          .eq("id", matchingRequest.id);

        if (requestUpdateError) {
          throw new ApiError(requestUpdateError.message, 400);
        }
      }
      return NextResponse.json({ success: true, deleted: true, permanent: false });
    }
    if (!documentRow.deleted_at) {
      throw new ApiError("Le document doit etre dans la corbeille avant suppression definitive.", 400);
    }

    const { error: eventsDeleteError } = await adminClient.from("document_events").delete().eq("document_id", documentId);
    if (eventsDeleteError) {
      throw new ApiError(eventsDeleteError.message, 400);
    }

    // Casser le lien dans cra_records avant de hard-delete, sinon FK orpheline ou reset bloqué.
    const { error: craUnlinkError } = await adminClient
      .from("cra_records")
      .update({ status: "draft", employee_document_id: null, updated_at: now })
      .eq("employee_document_id", documentId);
    if (craUnlinkError) {
      throw new ApiError(craUnlinkError.message, 400);
    }

    const { error: documentDeleteError } = await adminClient.from("employee_documents").delete().eq("id", documentId);
    if (documentDeleteError) {
      throw new ApiError(documentDeleteError.message, 400);
    }

    if (matchingRequest) {
      const { error: requestUpdateError } = await adminClient
        .from("document_requests")
        .update({ status: "pending", updated_at: now })
        .eq("id", matchingRequest.id);

      if (requestUpdateError) {
        throw new ApiError(requestUpdateError.message, 400);
      }
    }

    if (documentRow.storage_path) {
      await adminClient.storage.from(documentRow.storage_bucket || "employee-documents").remove([documentRow.storage_path]);
    }

    return NextResponse.json({ success: true, deleted: true, permanent: true });
  },
  RH_SESSION,
);

export const PATCH = withActor(
  ["rh", "admin"],
  async ({ adminClient, user, profile: actorProfile, request }) => {

    const body = (await request.json().catch(() => null)) as { documentId?: string } | null;
    const documentId = body?.documentId ?? "";
    if (!documentId) {
      throw new ApiError("Document RH introuvable.", 400);
    }

    const { data: documentRow, error: documentError } = await adminClient
      .from("employee_documents")
      .select("id,employee_id,document_type_id,uploader_role,uploaded_by,deleted_at")
      .eq("id", documentId)
      .single();
    if (documentError || !documentRow) {
      throw new ApiError(documentError?.message ?? "Document introuvable.", 404);
    }
    if (documentRow.uploader_role !== "rh") {
      throw new ApiError("Seuls les documents RH peuvent etre restaures ici.", 403);
    }
    if (actorProfile.role !== "admin" && documentRow.uploaded_by !== user.id) {
      throw new ApiError("Tu ne peux restaurer que tes propres documents RH.", 403);
    }
    await assertRhAccess(
      adminClient,
      { id: actorProfile.id, role: actorProfile.role },
      documentRow.employee_id ?? "",
      documentRow.document_type_id ?? undefined,
      "Ce document n'appartient pas a un collaborateur autorise.",
    );

    const { error: restoreError } = await adminClient
      .from("employee_documents")
      .update({ deleted_at: null, updated_at: new Date().toISOString() })
      .eq("id", documentId);
    if (restoreError) {
      throw new ApiError(restoreError.message, 400);
    }

    return NextResponse.json({ success: true, restored: true });
  },
  RH_SESSION,
);
