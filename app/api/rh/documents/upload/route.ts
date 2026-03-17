import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { buildEmployeeDocumentPath } from "@/lib/document-storage";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getClients() {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    throw new Error("Variables Supabase serveur manquantes.");
  }

  return {
    authClient: createClient(supabaseUrl, supabaseAnonKey),
    adminClient: createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }),
  };
}

async function getAuthorizedActor(accessToken: string) {
  const { authClient, adminClient } = getClients();
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser(accessToken);

  if (authError || !user) {
    return { error: authError?.message ?? "Utilisateur non authentifie.", status: 401 as const };
  }

  const { data: actorProfile, error: actorError } = await adminClient
    .from("profiles")
    .select("id,role")
    .eq("id", user.id)
    .single();

  if (actorError || !actorProfile || !["rh", "admin"].includes(actorProfile.role ?? "")) {
    return { error: "Acces refuse.", status: 403 as const };
  }

  return { adminClient, user, actorProfile };
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!accessToken) {
      return NextResponse.json({ error: "Session RH manquante." }, { status: 401 });
    }

    const authorized = await getAuthorizedActor(accessToken);
    if ("error" in authorized) {
      return NextResponse.json({ error: authorized.error }, { status: authorized.status });
    }
    const { adminClient, user, actorProfile } = authorized;

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
    const authHeader = request.headers.get("authorization");
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!accessToken) {
      return NextResponse.json({ error: "Session RH manquante." }, { status: 401 });
    }

    const authorized = await getAuthorizedActor(accessToken);
    if ("error" in authorized) {
      return NextResponse.json({ error: authorized.error }, { status: authorized.status });
    }
    const { adminClient, user, actorProfile } = authorized;

    const body = (await request.json().catch(() => null)) as { documentId?: string } | null;
    const documentId = body?.documentId ?? "";
    if (!documentId) {
      return NextResponse.json({ error: "Document RH introuvable." }, { status: 400 });
    }

    const { data: documentRow, error: documentError } = await adminClient
      .from("employee_documents")
      .select("id,employee_id,document_type_id,period_month,storage_bucket,storage_path,uploader_role,uploaded_by,status")
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

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur." }, { status: 500 });
  }
}
