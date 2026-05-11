import { NextResponse } from "next/server";

import {
  getAccessTokenFromRequest,
  getAuthorizedActor,
  isAuthorizedActorError,
} from "@/lib/server-supabase";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const accessToken = getAccessTokenFromRequest(request);
  if (!accessToken) {
    return NextResponse.json({ error: "Session manquante." }, { status: 401 });
  }

  const authorized = await getAuthorizedActor(accessToken, ["salarie", "admin"]);
  if (isAuthorizedActorError(authorized)) {
    return NextResponse.json({ error: authorized.error }, { status: authorized.status });
  }

  const { id } = await context.params;
  const documentId = String(id ?? "").trim();
  if (!documentId) {
    return NextResponse.json({ error: "id requis." }, { status: 400 });
  }

  const actorId = authorized.user.id;
  const { data: document, error: documentError } = await authorized.adminClient
    .from("employee_documents")
    .select("id,status,employee_id,document_type_id,period_month,file_name,deleted_at")
    .eq("id", documentId)
    .maybeSingle();

  if (documentError) {
    return NextResponse.json({ error: documentError.message }, { status: 400 });
  }
  if (!document) {
    return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  }
  if (authorized.profile.role !== "admin" && document.employee_id !== actorId) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }
  if (document.deleted_at) {
    return NextResponse.json({ ok: true });
  }
  if (document.status === "validated") {
    return NextResponse.json(
      { error: "Ce document est valide par le RH et ne peut plus etre supprime." },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const { error: softDeleteError } = await authorized.adminClient
    .from("employee_documents")
    .update({ deleted_at: now, updated_at: now })
    .eq("id", document.id);

  if (softDeleteError) {
    return NextResponse.json({ error: softDeleteError.message }, { status: 400 });
  }

  // Si le document est lié à un CRA, remettre le CRA en draft et casser le lien.
  // Sinon le CRA reste avec status="validated" et bloque la création d'un nouveau CRA pour la période.
  const { error: craResetError } = await authorized.adminClient
    .from("cra_records")
    .update({ status: "draft", employee_document_id: null, updated_at: now })
    .eq("employee_document_id", document.id);

  if (craResetError) {
    return NextResponse.json({ error: craResetError.message }, { status: 400 });
  }

  const normalizedPeriodMonth = document.period_month ?? null;
  const { error: requestError } = await authorized.adminClient
    .from("document_requests")
    .update({ status: "pending", updated_at: now })
    .eq("employee_id", document.employee_id)
    .eq("document_type_id", document.document_type_id)
    .eq("period_month", normalizedPeriodMonth)
    .eq("status", "uploaded");

  if (requestError) {
    return NextResponse.json({ error: requestError.message }, { status: 400 });
  }

  const { error: eventError } = await authorized.adminClient
    .from("document_events")
    .insert({
      document_id: document.id,
      actor_id: actorId,
      event_type: "deleted",
      payload: {
        deleted_at: now,
        file_name: document.file_name,
      },
    });

  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
