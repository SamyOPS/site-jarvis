import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { notifyEmployeeOfDocumentRequest } from "@/lib/email";
import {
  getAccessTokenFromRequest,
  getAuthorizedActor,
  isAuthorizedActorError,
} from "@/lib/server-supabase";

export const runtime = "nodejs";

type CreateRequestPayload = {
  employeeId?: unknown;
  documentTypeId?: unknown;
  periodMonth?: unknown;
  dueAt?: unknown;
  note?: unknown;
};

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

  const missingTable = !!error && /rh_employee_assignments/i.test(error.message ?? "");
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

    const body = (await request.json().catch(() => null)) as CreateRequestPayload | null;
    const employeeId = String(body?.employeeId ?? "").trim();
    const documentTypeId = String(body?.documentTypeId ?? "").trim();
    const periodMonthValue = String(body?.periodMonth ?? "").trim();
    const dueAtValue = String(body?.dueAt ?? "").trim();
    const note = String(body?.note ?? "").trim() || null;

    if (!employeeId || !documentTypeId) {
      return NextResponse.json({ error: "Collaborateur et type de document requis." }, { status: 400 });
    }

    const periodMonth = periodMonthValue ? `${periodMonthValue.slice(0, 7)}-01` : null;
    const dueAt = dueAtValue ? new Date(dueAtValue) : null;
    if (dueAt && Number.isNaN(dueAt.getTime())) {
      return NextResponse.json({ error: "Date d'echeance invalide." }, { status: 400 });
    }

    const { data: employeeProfile, error: employeeError } = await adminClient
      .from("profiles")
      .select("id,email,full_name,role")
      .eq("id", employeeId)
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

    const { data: documentType, error: typeError } = await adminClient
      .from("document_types")
      .select("id,label,requires_period,active")
      .eq("id", documentTypeId)
      .single();

    if (typeError || !documentType || documentType.active !== true) {
      return NextResponse.json({ error: "Type de document introuvable." }, { status: 400 });
    }
    if (documentType.requires_period && !periodMonth) {
      return NextResponse.json({ error: "Ce type de document demande une periode." }, { status: 400 });
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
      return NextResponse.json({ error: insertError?.message ?? "Creation de la demande impossible." }, { status: 400 });
    }

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
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
