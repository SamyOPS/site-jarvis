import { NextResponse } from "next/server";

import {
  CRA_REMINDER_HOUR,
  craDeadlineDate,
  craReminderDate,
  formatReminderDay,
  formatReminderMonth,
  parisNow,
  planCraReminders,
  type CraReminderTarget,
} from "@/domain/cra-reminder";
import { cronAuthorizationError } from "@/lib/cron-auth";
import { notifyCraMonthlyReminder } from "@/lib/email";
import { getServerSupabaseClients } from "@/lib/server-supabase";

export const runtime = "nodejs";
// Une vingtaine d'envois SMTP : la duree par defaut d'une fonction n'y suffirait pas.
export const maxDuration = 60;

/**
 * Rappel de fin de mois : CRA et/ou facture (voir domain/cra-reminder.ts).
 *
 * DECLENCHEMENT : le job pg_cron `cra-monthly-reminder` frappe cette route chaque matin
 * (migration 20261116000000). C'est elle qui decide si c'est le jour : le 3e jour ouvre
 * avant la fin du mois, a partir de 9 h a Paris. Les autres jours, elle ne fait rien.
 *
 * UN SEUL E-MAIL par collaborateur et par mois, garanti par la table
 * `cra_reminder_emails` : la ligne est reservee AVANT l'envoi (deux passages simultanes ne
 * peuvent pas relancer deux fois), et liberee si l'envoi echoue, pour que le passage
 * suivant reessaie.
 *
 * Corps optionnel, pour essayer sans rien envoyer :
 *   { "dryRun": true }                  -> liste ce qui partirait aujourd'hui ;
 *   { "dryRun": true, "date": "AAAA-MM-JJ" } -> idem a une date simulee.
 * Une date simulee n'envoie JAMAIS de vrai e-mail, meme sans `dryRun`.
 */

/** Envois menes de front : borne la duree sans saturer le serveur SMTP. */
const CONCURRENCY = 4;

type ReminderBody = { dryRun?: unknown; date?: unknown };

export async function POST(request: Request) {
  const denied = cronAuthorizationError(request);
  if (denied) return denied;

  const body = ((await request.json().catch(() => null)) ?? {}) as ReminderBody;
  const now = parisNow();
  const simulatedDate =
    typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : null;
  const today = simulatedDate ?? now.isoDate;
  const dryRun = body.dryRun === true || simulatedDate !== null;

  const month = today.slice(0, 7);
  const reminderDay = craReminderDate(month);
  const deadline = craDeadlineDate(month);
  const tooEarly = !simulatedDate && now.hour < CRA_REMINDER_HOUR;
  if (today !== reminderDay || tooEarly || !deadline) {
    return NextResponse.json({ skipped: "pas le moment du rappel", today, reminderDay });
  }

  const { adminClient } = getServerSupabaseClients();
  const periodMonth = `${month}-01`;

  const { data: profiles, error: profilesError } = await adminClient
    .from("profiles")
    .select("id,email,full_name,employment_status")
    .eq("role", "salarie")
    .eq("professional_status", "verified");
  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 400 });
  }

  const ids = (profiles ?? []).map((profile) => profile.id as string);
  if (!ids.length) {
    return NextResponse.json({ month, reminderDay, dryRun, candidates: 0, sent: 0, failed: 0, alreadySent: 0 });
  }

  const [missions, craRecords, invoiceType, billingProfiles] = await Promise.all([
    adminClient.from("employee_missions").select("employee_id").in("employee_id", ids).is("archived_at", null),
    adminClient
      .from("cra_records")
      .select("employee_id,period_month,status")
      .in("employee_id", ids)
      .eq("period_month", periodMonth),
    adminClient.from("document_types").select("id").eq("code", "facture").maybeSingle(),
    adminClient.from("employee_billing_profiles").select("employee_id,siret").in("employee_id", ids),
  ]);
  const firstError = missions.error ?? craRecords.error ?? invoiceType.error ?? billingProfiles.error;
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 400 });
  }

  // Toutes les factures non supprimees : elles disent a la fois QUI facture et si celle du
  // mois existe deja.
  let invoices: { employee_id: string; period_month: string | null; status: string }[] = [];
  if (invoiceType.data?.id) {
    const { data, error } = await adminClient
      .from("employee_documents")
      .select("employee_id,period_month,status")
      .in("employee_id", ids)
      .eq("document_type_id", invoiceType.data.id)
      .is("deleted_at", null);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    invoices = data ?? [];
  }

  const targets = planCraReminders({
    month,
    profiles: profiles ?? [],
    activeMissionEmployeeIds: (missions.data ?? []).map((row) => row.employee_id as string),
    craRecords: craRecords.data ?? [],
    invoices,
    siretEmployeeIds: (billingProfiles.data ?? [])
      .filter((row) => typeof row.siret === "string" && row.siret.trim())
      .map((row) => row.employee_id as string),
  });

  const monthLabel = formatReminderMonth(month);
  const deadlineLabel = formatReminderDay(deadline);

  // Deja relances ce mois-ci : jamais deux fois.
  const { data: sentRows, error: sentError } = await adminClient
    .from("cra_reminder_emails")
    .select("employee_id")
    .eq("period_month", periodMonth);
  if (sentError) return NextResponse.json({ error: sentError.message }, { status: 400 });
  const alreadySent = new Set((sentRows ?? []).map((row) => row.employee_id as string));
  const pending = targets.filter((target) => !alreadySent.has(target.employeeId));

  if (dryRun) {
    return NextResponse.json({
      month,
      reminderDay,
      deadline,
      dryRun: true,
      candidates: targets.length,
      alreadySent: targets.length - pending.length,
      wouldSend: pending.map((target) => ({
        name: target.name,
        cra: target.needsCra,
        facture: target.needsInvoice,
      })),
    });
  }

  // Reservation avant envoi : seules les lignes reellement inserees par CE passage partent.
  const { data: claimed, error: claimError } = await adminClient
    .from("cra_reminder_emails")
    .upsert(
      pending.map((target) => ({ employee_id: target.employeeId, period_month: periodMonth })),
      { onConflict: "employee_id,period_month", ignoreDuplicates: true },
    )
    .select("employee_id");
  if (claimError) return NextResponse.json({ error: claimError.message }, { status: 400 });
  const claimedIds = new Set((claimed ?? []).map((row) => row.employee_id as string));
  const toSend = pending.filter((target) => claimedIds.has(target.employeeId));

  let sent = 0;
  const failedIds: string[] = [];
  const sendOne = async (target: CraReminderTarget) => {
    const result = await notifyCraMonthlyReminder({
      recipientEmail: target.email,
      recipientName: target.name,
      monthLabel,
      deadlineLabel,
      needsCra: target.needsCra,
      needsInvoice: target.needsInvoice,
    });
    if (result.ok) sent += 1;
    else failedIds.push(target.employeeId);
  };
  for (let index = 0; index < toSend.length; index += CONCURRENCY) {
    await Promise.all(toSend.slice(index, index + CONCURRENCY).map(sendOne));
  }

  // Echec d'envoi : la reservation est liberee, le passage suivant reessaiera.
  if (failedIds.length) {
    await adminClient
      .from("cra_reminder_emails")
      .delete()
      .eq("period_month", periodMonth)
      .in("employee_id", failedIds);
  }

  // Que des compteurs : la reponse est conservee par pg_net (net._http_response), elle ne
  // doit porter aucune donnee personnelle.
  return NextResponse.json({
    month,
    reminderDay,
    candidates: targets.length,
    alreadySent: targets.length - pending.length,
    sent,
    failed: failedIds.length,
  });
}
