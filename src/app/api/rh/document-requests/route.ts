import { NextResponse } from "next/server";

import { ApiError, withActor } from "@/lib/api-handler";
import { notifyEmployeeOfDocumentRequest } from "@/lib/email";
import { assertRhAccess } from "@/lib/rh-access";

export const runtime = "nodejs";

type CreateRequestPayload = {
  employeeId?: unknown;
  documentTypeId?: unknown;
  periodMonth?: unknown;
  dueAt?: unknown;
  note?: unknown;
};

export const POST = withActor(
  ["rh", "admin"],
  async ({ adminClient, user, profile: actorProfile, request }) => {
    const body = (await request.json().catch(() => null)) as CreateRequestPayload | null;
    const employeeId = String(body?.employeeId ?? "").trim();
    const documentTypeId = String(body?.documentTypeId ?? "").trim();
    const periodMonthValue = String(body?.periodMonth ?? "").trim();
    const dueAtValue = String(body?.dueAt ?? "").trim();
    const note = String(body?.note ?? "").trim() || null;

    if (!employeeId || !documentTypeId) {
      throw new ApiError("Collaborateur et type de document requis.", 400);
    }

    const periodMonth = periodMonthValue ? `${periodMonthValue.slice(0, 7)}-01` : null;
    const dueAt = dueAtValue ? new Date(dueAtValue) : null;
    if (dueAt && Number.isNaN(dueAt.getTime())) {
      throw new ApiError("Date d'echeance invalide.", 400);
    }

    const { data: employeeProfile, error: employeeError } = await adminClient
      .from("profiles")
      .select("id,email,full_name,role")
      .eq("id", employeeId)
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

    const { data: documentType, error: typeError } = await adminClient
      .from("document_types")
      .select("id,label,requires_period,active")
      .eq("id", documentTypeId)
      .single();

    if (typeError || !documentType || documentType.active !== true) {
      throw new ApiError("Type de document introuvable.", 400);
    }
    if (documentType.requires_period && !periodMonth) {
      throw new ApiError("Ce type de document demande une periode.", 400);
    }

    const now = new Date().toISOString();
    const { data: insertedRequest, error: insertError } = await adminClient
      .from("document_requests")
      .insert({
        employee_id: employeeProfile.id,
        document_type_id: documentTypeId,
        requested_by: user.id,
        status: "pending",
        due_at: dueAt ? dueAt.toISOString() : null,
        period_month: periodMonth,
        note,
        updated_at: now,
      })
      .select("id")
      .single();

    if (insertError || !insertedRequest) {
      throw new ApiError(
        insertError?.message ?? "Creation de la demande impossible.",
        400,
      );
    }

    // L'envoi du mail ne doit pas faire echouer la demande, qui est deja enregistree.
    if (employeeProfile.email) {
      try {
        await notifyEmployeeOfDocumentRequest({
          employeeEmail: employeeProfile.email,
          employeeName: employeeProfile.full_name,
          documentLabel: documentType.label,
          periodMonth,
          dueAt: dueAt ? dueAt.toISOString() : null,
          note,
          requesterName: actorProfile.full_name ?? actorProfile.email,
        });
      } catch (emailError) {
        console.error("[email] notify employee (request) failed", emailError);
      }
    }

    return NextResponse.json({ success: true, requestId: insertedRequest.id });
  },
  { missingSession: "Session RH manquante." },
);
