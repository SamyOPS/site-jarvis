import { NextResponse } from "next/server";

import { canRhAccessEmployee } from "@/lib/rh-access";
import {
  getAccessTokenFromRequest,
  getAuthorizedActor,
  isAuthorizedActorError,
} from "@/lib/server-supabase";

export const runtime = "nodejs";

const REVIEW_STATUSES = ["pending", "validated", "rejected"] as const;
type ReviewStatus = (typeof REVIEW_STATUSES)[number];

function isReviewStatus(value: unknown): value is ReviewStatus {
  return REVIEW_STATUSES.includes(value as ReviewStatus);
}

type ReviewPayload = {
  documentId?: unknown;
  status?: unknown;
  reviewComment?: unknown;
};

/**
 * Validation, refus ou remise en attente d'un document par le RH.
 *
 * Cette operation se faisait auparavant directement depuis le tableau de bord avec la cle
 * anon. Elle ne verifiait donc ni l'affectation du RH au collaborateur, ni la restriction par
 * type de document, et `reviewed_by` / `actor_id` etaient fournis par le navigateur — donc
 * falsifiables. Les deux identifiants sont desormais derives du jeton d'acces.
 */
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

    const body = (await request.json().catch(() => null)) as ReviewPayload | null;
    const documentId = String(body?.documentId ?? "").trim();
    const reviewComment = String(body?.reviewComment ?? "").trim();

    if (!documentId) {
      return NextResponse.json({ error: "Document introuvable." }, { status: 400 });
    }
    if (!isReviewStatus(body?.status)) {
      return NextResponse.json({ error: "Statut de revue invalide." }, { status: 400 });
    }
    const nextStatus = body.status;
    if (nextStatus === "rejected" && !reviewComment) {
      return NextResponse.json(
        { error: "Un commentaire est obligatoire pour refuser un document." },
        { status: 400 },
      );
    }

    const { data: document, error: documentError } = await adminClient
      .from("employee_documents")
      .select(
        "id,employee_id,document_type_id,period_month,status,deleted_at,source_kind,document_type:document_types(code)",
      )
      .eq("id", documentId)
      .maybeSingle();

    if (documentError) {
      return NextResponse.json({ error: documentError.message }, { status: 400 });
    }
    if (!document) {
      return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
    }
    if (document.deleted_at) {
      return NextResponse.json(
        { error: "Ce document est dans la corbeille." },
        { status: 400 },
      );
    }

    if (actorProfile.role !== "admin") {
      const access = await canRhAccessEmployee(
        adminClient,
        actorProfile.id,
        document.employee_id ?? "",
        document.document_type_id ?? undefined,
      );
      if (!access.allowed) {
        if (access.error) {
          return NextResponse.json({ error: access.error }, { status: 400 });
        }
        return NextResponse.json(
          { error: "Collaborateur ou type de document non autorise pour ce RH." },
          { status: 403 },
        );
      }
    }

    const reviewedAt = new Date().toISOString();
    const reviewFields =
      nextStatus === "pending"
        ? { reviewed_by: null, reviewed_at: null, review_comment: null }
        : {
            reviewed_by: user.id,
            reviewed_at: reviewedAt,
            review_comment: reviewComment || null,
          };

    const { error: updateError } = await adminClient
      .from("employee_documents")
      .update({ status: nextStatus, ...reviewFields, updated_at: reviewedAt })
      .eq("id", documentId);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Seule une demande portant la meme periode est rapprochee. Retomber sur la demande la
    // plus recente cloturerait une demande d'une autre periode, restee non satisfaite.
    const { data: requestRows } = await adminClient
      .from("document_requests")
      .select("id,status,period_month")
      .eq("employee_id", document.employee_id)
      .eq("document_type_id", document.document_type_id)
      .in("status", ["pending", "uploaded", "rejected", "expired", "validated"])
      .order("created_at", { ascending: false })
      .limit(10);

    const matchingRequest =
      ((requestRows ?? []) as Array<{ id: string; period_month: string | null }>).find(
        (row) => (row.period_month ?? "") === (document.period_month ?? ""),
      ) ?? null;

    if (matchingRequest) {
      const { error: requestError } = await adminClient
        .from("document_requests")
        .update({ status: nextStatus, updated_at: reviewedAt })
        .eq("id", matchingRequest.id);
      if (requestError) {
        return NextResponse.json({ error: requestError.message }, { status: 400 });
      }
    }

    const documentTypeCode = Array.isArray(document.document_type)
      ? (document.document_type[0]?.code ?? null)
      : ((document.document_type as { code?: string } | null)?.code ?? null);

    if (document.source_kind === "generated" && documentTypeCode === "cra") {
      const craUpdate: Record<string, string | null> = {
        status: nextStatus === "pending" ? "submitted" : nextStatus,
        updated_at: reviewedAt,
        validated_at: nextStatus === "validated" ? reviewedAt : null,
        rejected_at: nextStatus === "rejected" ? reviewedAt : null,
      };
      if (nextStatus === "pending") {
        craUpdate.submitted_at = reviewedAt;
      }

      const { error: craError } = await adminClient
        .from("cra_records")
        .update(craUpdate)
        .eq("employee_document_id", documentId);
      if (craError) {
        return NextResponse.json({ error: craError.message }, { status: 400 });
      }
    }

    const { error: eventError } = await adminClient.from("document_events").insert({
      document_id: documentId,
      actor_id: user.id,
      event_type: nextStatus,
      payload: {
        review_comment: reviewComment || null,
        employee_id: document.employee_id,
        document_type_id: document.document_type_id,
      },
    });
    if (eventError) {
      return NextResponse.json(
        { error: "Le statut du document a ete mis a jour, mais le suivi n'est pas complet." },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, status: nextStatus });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
