import type { SupabaseClient } from "@supabase/supabase-js";

import { notifyEmployeeOfDocumentRejection, notifyEmployeeOfLeaveApproval } from "@/lib/email";
import { shouldNotify } from "@/lib/notification-preferences";

/** Page de l'espace salarie ou reprendre un document refuse, selon son type. */
function rejectionDashboardPath(documentTypeCode: string | null) {
  const code = documentTypeCode ?? "";
  if (code.startsWith("cra") || code.startsWith("facture")) {
    return "/dashboard/salarie/documents/cra-facture";
  }
  if (code === "conge") return "/dashboard/salarie/documents/conge";
  return "/dashboard/salarie/documents";
}

/** Dates de la demande de conge, consignees dans le journal au moment du depot. */
async function loadLeaveDetails(adminClient: SupabaseClient, documentId: string) {
  const { data } = await adminClient
    .from("document_events")
    .select("payload")
    .eq("document_id", documentId)
    .eq("event_type", "uploaded")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const payload = (data?.payload ?? {}) as Record<string, unknown>;
  const isoDate = (value: unknown) =>
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  const rawType = payload.leave_type;
  const leaveType: "paid" | "unpaid" | null =
    rawType === "paid" || rawType === "unpaid" ? rawType : null;
  return {
    startDate: isoDate(payload.start_date),
    endDate: isoDate(payload.end_date),
    leaveType,
  };
}

/**
 * E-mails au collaborateur apres une revue :
 *  - REFUS d'un document qu'il a depose (piece, CRA, facture, conge) : avec le motif ;
 *  - VALIDATION d'une demande de conge qu'il a faite : avec les dates.
 *
 * Jamais pour un document depose par un RH, ni quand le statut ne change pas (refuser un
 * document deja refuse, revalider un conge deja valide). Chaque cas a sa preference.
 * Un echec d'envoi ne fait pas echouer la revue.
 */
export async function notifyEmployeeOfReview({
  adminClient,
  document,
  documentType,
  nextStatus,
  reviewComment,
  reviewerName,
}: {
  adminClient: SupabaseClient;
  document: {
    id: string;
    employee_id: string | null;
    uploaded_by: string | null;
    status: string | null;
    period_month: string | null;
  };
  documentType: { code?: string | null; label?: string | null } | null;
  nextStatus: string;
  reviewComment: string;
  reviewerName: string | null;
}) {
  const employeeId = document.employee_id;
  if (!employeeId || document.uploaded_by !== employeeId || document.status === nextStatus) return;

  const isRejection = nextStatus === "rejected";
  const isLeaveApproval = nextStatus === "validated" && documentType?.code === "conge";
  if (!isRejection && !isLeaveApproval) return;

  const kind = isRejection ? "documentRejections" : "leaveApprovals";
  if (!(await shouldNotify(adminClient, employeeId, kind))) return;

  const { data: employee } = await adminClient
    .from("profiles")
    .select("email,full_name")
    .eq("id", employeeId)
    .maybeSingle();
  if (!employee?.email) return;

  const sending = isRejection
    ? notifyEmployeeOfDocumentRejection({
        employeeEmail: employee.email,
        employeeName: employee.full_name,
        documentLabel: documentType?.label ?? "Document",
        periodMonth: document.period_month,
        reviewComment,
        reviewerName,
        dashboardPath: rejectionDashboardPath(documentType?.code ?? null),
      })
    : loadLeaveDetails(adminClient, document.id).then((leave) =>
        notifyEmployeeOfLeaveApproval({
          employeeEmail: employee.email,
          employeeName: employee.full_name,
          ...leave,
          reviewerName,
        }),
      );
  await sending.catch((error) => console.error(`[email] notify employee (${kind}) failed`, error));
}
