import { NextResponse } from "next/server";

import { ApiError, unwrap, withActor } from "@/lib/api-handler";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const POST = withActor<RouteContext>(
  ["salarie", "admin"],
  async ({ adminClient, user, profile }, context) => {
    const { id } = await context.params;
    const documentId = String(id ?? "").trim();
    if (!documentId) {
      throw new ApiError("id requis.", 400);
    }

    const actorId = user.id;
    const document = unwrap(
      await adminClient
        .from("employee_documents")
        .select("id,status,employee_id,document_type_id,period_month,file_name,deleted_at")
        .eq("id", documentId)
        .maybeSingle(),
    );

    if (!document) {
      throw new ApiError("Document introuvable.", 404);
    }
    if (profile.role !== "admin" && document.employee_id !== actorId) {
      throw new ApiError("Acces refuse.", 403);
    }
    if (document.deleted_at) {
      return NextResponse.json({ ok: true });
    }
    if (document.status === "validated") {
      throw new ApiError(
        "Ce document est valide par le RH et ne peut plus etre supprime.",
        400,
      );
    }

    const now = new Date().toISOString();
    unwrap(
      await adminClient
        .from("employee_documents")
        .update({ deleted_at: now, updated_at: now })
        .eq("id", document.id),
    );

    // Si le document est lié à un CRA, remettre le CRA en draft et casser le lien.
    // Sinon le CRA reste avec status="validated" et bloque la création d'un nouveau CRA pour la période.
    unwrap(
      await adminClient
        .from("cra_records")
        .update({ status: "draft", employee_document_id: null, updated_at: now })
        .eq("employee_document_id", document.id),
    );

    // La demande liee redevient "pending" : le collaborateur doit redeposer.
    //
    // La periode peut etre nulle (une demande de conge n'en porte pas). PostgREST ne
    // matche PAS une colonne NULL avec `.eq(col, null)` — il faut `.is()`. La version
    // precedente utilisait `.eq` dans les deux cas : la demande liee a un document sans
    // periode n'etait donc jamais remise en attente, sans qu'aucune erreur le signale.
    const periodMonth = document.period_month ?? null;
    const requestQuery = adminClient
      .from("document_requests")
      .update({ status: "pending", updated_at: now })
      .eq("employee_id", document.employee_id)
      .eq("document_type_id", document.document_type_id)
      .eq("status", "uploaded");

    unwrap(
      await (periodMonth === null
        ? requestQuery.is("period_month", null)
        : requestQuery.eq("period_month", periodMonth)),
    );

    unwrap(
      await adminClient.from("document_events").insert({
        document_id: document.id,
        actor_id: actorId,
        event_type: "deleted",
        payload: {
          deleted_at: now,
          file_name: document.file_name,
        },
      }),
    );

    return NextResponse.json({ ok: true });
  },
  { missingSession: "Session manquante." },
);
