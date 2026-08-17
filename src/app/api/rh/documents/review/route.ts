import { NextResponse } from "next/server";

import { ApiError, unwrap, withActor } from "@/lib/api-handler";
import { assertRhAccess } from "@/lib/rh-access";

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
export const POST = withActor(
  ["rh", "admin"],
  async ({ adminClient, user, profile: actorProfile, request }) => {
    const body = (await request.json().catch(() => null)) as ReviewPayload | null;
    const documentId = String(body?.documentId ?? "").trim();
    const reviewComment = String(body?.reviewComment ?? "").trim();

    if (!documentId) {
      throw new ApiError("Document introuvable.", 400);
    }
    if (!isReviewStatus(body?.status)) {
      throw new ApiError("Statut de revue invalide.", 400);
    }
    const nextStatus = body.status;
    if (nextStatus === "rejected" && !reviewComment) {
      throw new ApiError("Un commentaire est obligatoire pour refuser un document.", 400);
    }

    const document = unwrap(
      await adminClient
        .from("employee_documents")
        .select(
          "id,employee_id,document_type_id,period_month,status,deleted_at,source_kind,document_type:document_types(code)",
        )
        .eq("id", documentId)
        .maybeSingle(),
    );

    if (!document) {
      throw new ApiError("Document introuvable.", 404);
    }
    if (document.deleted_at) {
      throw new ApiError("Ce document est dans la corbeille.", 400);
    }

    await assertRhAccess(
      adminClient,
      { id: actorProfile.id, role: actorProfile.role },
      document.employee_id ?? "",
      document.document_type_id ?? undefined,
    );

    const reviewedAt = new Date().toISOString();
    const reviewFields =
      nextStatus === "pending"
        ? { reviewed_by: null, reviewed_at: null, review_comment: null }
        : {
            reviewed_by: user.id,
            reviewed_at: reviewedAt,
            review_comment: reviewComment || null,
          };

    unwrap(
      await adminClient
        .from("employee_documents")
        .update({ status: nextStatus, ...reviewFields, updated_at: reviewedAt })
        .eq("id", documentId),
    );

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
      unwrap(
        await adminClient
          .from("document_requests")
          .update({ status: nextStatus, updated_at: reviewedAt })
          .eq("id", matchingRequest.id),
      );
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

      unwrap(
        await adminClient
          .from("cra_records")
          .update(craUpdate)
          .eq("employee_document_id", documentId),
      );
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
      // Le message ne reprend pas celui de la base : le document a bien change de statut,
      // seul le journal a echoue, et l'utilisateur doit le savoir.
      throw new ApiError(
        "Le statut du document a ete mis a jour, mais le suivi n'est pas complet.",
        400,
      );
    }

    return NextResponse.json({ success: true, status: nextStatus });
  },
  { missingSession: "Session RH manquante." },
);
