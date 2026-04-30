import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { buildEmployeeDocumentPath } from "@/lib/document-storage";
import {
  getAccessTokenFromRequest,
  getAuthorizedActor,
  isAuthorizedActorError,
} from "@/lib/server-supabase";

async function canRhAccessEmployee(
  adminClient: SupabaseClient,
  rhId: string,
  employeeId: string,
) {
  if (!employeeId || employeeId === rhId) {
    return { allowed: true as const };
  }

  const { data, error } = await adminClient
    .from("rh_employee_assignments")
    .select("employee_id")
    .eq("rh_id", rhId)
    .eq("employee_id", employeeId)
    .maybeSingle();

  const missingTable =
    !!error && /rh_employee_assignments/i.test(error.message ?? "");
  if (missingTable) {
    return { allowed: true as const };
  }
  if (error) {
    return { allowed: false as const, error: error.message };
  }
  return { allowed: Boolean(data?.employee_id) };
}

export async function POST(request: Request) {
  try {
    const accessToken = getAccessTokenFromRequest(request);
    if (!accessToken) {
      return NextResponse.json({ error: "Session RH manquante." }, { status: 401 });
    }

    const authorized = await getAuthorizedActor(accessToken, ["rh", "admin"]);
    if (isAuthorizedActorError(authorized)) {
      return NextResponse.json({ error: authorized.error }, { status: authorized.status });
    }
    const { adminClient, user, profile: actorProfile } = authorized;

    const formData = await request.formData();
    const requestedEmployeeId = String(formData.get("employeeId") ?? "");
    const documentTypeId = String(formData.get("documentTypeId") ?? "");
    const periodMonthValue = String(formData.get("periodMonth") ?? "");
    const file = formData.get("file");

    if (!documentTypeId || !(file instanceof File)) {
      return NextResponse.json({ error: "Parametres incomplets pour le depot RH." }, { status: 400 });
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
        return NextResponse.json({ error: "Collaborateur invalide." }, { status: 400 });
      }
      if (actorProfile.role !== "admin") {
        const access = await canRhAccessEmployee(adminClient, actorProfile.id, employeeProfile.id);
        if (!access.allowed) {
          if (access.error) {
            return NextResponse.json({ error: access.error }, { status: 400 });
          }
          return NextResponse.json({ error: "Collaborateur non autorise pour ce RH." }, { status: 403 });
        }
      }

      employeeId = employeeProfile.id;
      hasSelectedEmployee = true;
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
    if (Array.isArray(documentType.allowed_uploader_roles) && documentType.allowed_uploader_roles.length > 0 && !documentType.allowed_uploader_roles.includes("rh")) {
      return NextResponse.json({ error: "Le RH ne peut pas deposer ce type de document." }, { status: 403 });
    }

    const storageBucket = "employee-documents";
    const storagePath = buildEmployeeDocumentPath({
      employeeId,
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
      return NextResponse.json({ error: insertError?.message ?? "Insertion du document RH impossible." }, { status: 400 });
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

      requestWithSamePeriod =
        (matchingRequest ?? []).find((requestRow) => (requestRow.period_month ?? "") === (periodMonth ?? "")) ??
        (matchingRequest ?? [])[0] ??
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

    const [{ error: requestUpdateError }, { error: eventInsertError }] = await Promise.all([requestUpdatePromise, eventInsertPromise]);
    if (requestUpdateError || eventInsertError) {
      return NextResponse.json({ error: requestUpdateError?.message ?? eventInsertError?.message ?? "Le document RH a ete depose, mais le suivi n'est pas complet." }, { status: 400 });
    }

    return NextResponse.json({ success: true, documentId: insertedDocument.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const accessToken = getAccessTokenFromRequest(request);
    if (!accessToken) {
      return NextResponse.json({ error: "Session RH manquante." }, { status: 401 });
    }

    const authorized = await getAuthorizedActor(accessToken, ["rh", "admin"]);
    if (isAuthorizedActorError(authorized)) {
      return NextResponse.json({ error: authorized.error }, { status: authorized.status });
    }
    const { adminClient, user, profile: actorProfile } = authorized;

    const body = (await request.json().catch(() => null)) as { documentId?: string; permanent?: boolean } | null;
    const documentId = body?.documentId ?? "";
    const permanent = body?.permanent === true;
    if (!documentId) {
      return NextResponse.json({ error: "Document RH introuvable." }, { status: 400 });
    }

    const { data: documentRow, error: documentError } = await adminClient
      .from("employee_documents")
      .select("id,employee_id,document_type_id,period_month,storage_bucket,storage_path,uploader_role,uploaded_by,status,deleted_at")
      .eq("id", documentId)
      .single();

    if (documentError || !documentRow) {
      return NextResponse.json({ error: documentError?.message ?? "Document introuvable." }, { status: 404 });
    }
    if (documentRow.uploader_role !== "rh") {
      return NextResponse.json({ error: "Seuls les documents RH peuvent etre supprimes ici." }, { status: 403 });
    }
    if (actorProfile.role !== "admin" && documentRow.uploaded_by !== user.id) {
      return NextResponse.json({ error: "Tu ne peux supprimer que tes propres documents RH." }, { status: 403 });
    }
    if (actorProfile.role !== "admin") {
      const access = await canRhAccessEmployee(adminClient, actorProfile.id, documentRow.employee_id ?? "");
      if (!access.allowed) {
        if (access.error) {
          return NextResponse.json({ error: access.error }, { status: 400 });
        }
        return NextResponse.json({ error: "Ce document n'appartient pas a un collaborateur autorise." }, { status: 403 });
      }
    }

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
      (matchingRequests ?? [])[0] ??
      null;

    if (!permanent) {
      const { error: documentSoftDeleteError } = await adminClient
        .from("employee_documents")
        .update({ deleted_at: now, updated_at: now })
        .eq("id", documentId);
      if (documentSoftDeleteError) {
        return NextResponse.json({ error: documentSoftDeleteError.message }, { status: 400 });
      }
      if (matchingRequest) {
        const { error: requestUpdateError } = await adminClient
          .from("document_requests")
          .update({ status: "pending", updated_at: now })
          .eq("id", matchingRequest.id);

        if (requestUpdateError) {
          return NextResponse.json({ error: requestUpdateError.message }, { status: 400 });
        }
      }
      return NextResponse.json({ success: true, deleted: true, permanent: false });
    }
    if (!documentRow.deleted_at) {
      return NextResponse.json(
        { error: "Le document doit etre dans la corbeille avant suppression definitive." },
        { status: 400 },
      );
    }

    const { error: eventsDeleteError } = await adminClient.from("document_events").delete().eq("document_id", documentId);
    if (eventsDeleteError) {
      return NextResponse.json({ error: eventsDeleteError.message }, { status: 400 });
    }

    const { error: documentDeleteError } = await adminClient.from("employee_documents").delete().eq("id", documentId);
    if (documentDeleteError) {
      return NextResponse.json({ error: documentDeleteError.message }, { status: 400 });
    }

    if (matchingRequest) {
      const { error: requestUpdateError } = await adminClient
        .from("document_requests")
        .update({ status: "pending", updated_at: now })
        .eq("id", matchingRequest.id);

      if (requestUpdateError) {
        return NextResponse.json({ error: requestUpdateError.message }, { status: 400 });
      }
    }

    if (documentRow.storage_path) {
      await adminClient.storage.from(documentRow.storage_bucket || "employee-documents").remove([documentRow.storage_path]);
    }

    return NextResponse.json({ success: true, deleted: true, permanent: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const accessToken = getAccessTokenFromRequest(request);
    if (!accessToken) {
      return NextResponse.json({ error: "Session RH manquante." }, { status: 401 });
    }

    const authorized = await getAuthorizedActor(accessToken, ["rh", "admin"]);
    if (isAuthorizedActorError(authorized)) {
      return NextResponse.json({ error: authorized.error }, { status: authorized.status });
    }
    const { adminClient, user, profile: actorProfile } = authorized;

    const body = (await request.json().catch(() => null)) as { documentId?: string } | null;
    const documentId = body?.documentId ?? "";
    if (!documentId) {
      return NextResponse.json({ error: "Document RH introuvable." }, { status: 400 });
    }

    const { data: documentRow, error: documentError } = await adminClient
      .from("employee_documents")
      .select("id,employee_id,uploader_role,uploaded_by,deleted_at")
      .eq("id", documentId)
      .single();
    if (documentError || !documentRow) {
      return NextResponse.json({ error: documentError?.message ?? "Document introuvable." }, { status: 404 });
    }
    if (documentRow.uploader_role !== "rh") {
      return NextResponse.json({ error: "Seuls les documents RH peuvent etre restaures ici." }, { status: 403 });
    }
    if (actorProfile.role !== "admin" && documentRow.uploaded_by !== user.id) {
      return NextResponse.json({ error: "Tu ne peux restaurer que tes propres documents RH." }, { status: 403 });
    }
    if (actorProfile.role !== "admin") {
      const access = await canRhAccessEmployee(adminClient, actorProfile.id, documentRow.employee_id ?? "");
      if (!access.allowed) {
        if (access.error) {
          return NextResponse.json({ error: access.error }, { status: 400 });
        }
        return NextResponse.json({ error: "Ce document n'appartient pas a un collaborateur autorise." }, { status: 403 });
      }
    }

    const { error: restoreError } = await adminClient
      .from("employee_documents")
      .update({ deleted_at: null, updated_at: new Date().toISOString() })
      .eq("id", documentId);
    if (restoreError) {
      return NextResponse.json({ error: restoreError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, restored: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur." }, { status: 500 });
  }
}
