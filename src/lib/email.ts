import type { SupabaseClient } from "@supabase/supabase-js";
import nodemailer, { type Transporter } from "nodemailer";

import type { NotificationKind } from "@/domain/account-settings";
import { filterByNotificationPreference } from "@/lib/notification-preferences";

type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const portRaw = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn("[email] variables SMTP_* manquantes, envoi ignore.");
    return null;
  }

  const port = Number(portRaw ?? 465);
  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return cachedTransporter;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatSenderAddress(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes("<")) return trimmed;

  const match = /^(.*\S)\s+([^\s@]+@[^\s@]+\.[^\s@]+)$/.exec(trimmed);
  if (!match) return trimmed;

  return `${match[1]} <${match[2]}>`;
}

function formatPeriodMonth(periodMonth: string | null | undefined) {
  if (!periodMonth) return null;
  const match = /^(\d{4})-(\d{2})/.exec(periodMonth);
  if (!match) return periodMonth;
  const year = match[1];
  const monthIndex = Number(match[2]) - 1;
  const months = [
    "janvier", "fevrier", "mars", "avril", "mai", "juin",
    "juillet", "aout", "septembre", "octobre", "novembre", "decembre",
  ];
  return `${months[monthIndex] ?? match[2]} ${year}`;
}

export async function sendEmail({ to, subject, html, replyTo }: SendEmailParams) {
  const transporter = getTransporter();
  if (!transporter) {
    return { ok: false, skipped: true };
  }

  const from = formatSenderAddress(process.env.MAIL_FROM || process.env.SMTP_USER || "");
  const recipients = Array.isArray(to) ? to : [to];
  const cleanRecipients = recipients.filter((value) => Boolean(value));
  if (!cleanRecipients.length) {
    return { ok: false, skipped: true };
  }

  try {
    await transporter.sendMail({
      from,
      to: cleanRecipients,
      subject,
      html,
      replyTo,
    });
    return { ok: true };
  } catch (error) {
    console.error("[email] echec envoi SMTP", error);
    return { ok: false };
  }
}

function buildDashboardLink(path: string) {
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function renderButton(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600">${escapeHtml(label)}</a>`;
}

function renderShell(innerHtml: string) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#111;max-width:560px">${innerHtml}<p style="margin-top:32px;color:#666;font-size:12px">Email automatique - Jarvis Connect. Merci de ne pas repondre.</p></div>`;
}

/**
 * Adresses des RH qui suivent un collaborateur.
 *
 * `kind` restreint aux RH qui acceptent ce type d'e-mail. L'omettre notifie tout le
 * monde — c'est le comportement d'origine, conserve pour les appels qui ne relevent
 * d'aucune famille reglable.
 */
export async function getRhRecipientsForEmployee(
  adminClient: SupabaseClient,
  employeeId: string,
  kind?: NotificationKind,
): Promise<string[]> {
  if (!employeeId) return [];

  const { data: assignments, error } = await adminClient
    .from("rh_employee_assignments")
    .select("rh_id")
    .eq("employee_id", employeeId);

  if (error || !assignments?.length) {
    return [];
  }

  const rhIds = Array.from(
    new Set(
      assignments
        .map((row) => (row as { rh_id: string | null }).rh_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  if (!rhIds.length) return [];

  // L'identifiant est lu en plus de l'adresse : il faut savoir A QUI appartient chaque
  // e-mail pour consulter sa preference.
  const { data: profiles, error: profilesError } = await adminClient
    .from("profiles")
    .select("id,email")
    .in("id", rhIds);
  if (profilesError || !profiles?.length) return [];

  const rows = (profiles as { id: string; email: string | null }[]).filter(
    (row) => Boolean(row.email),
  );

  const allowedIds = kind
    ? new Set(
        await filterByNotificationPreference(
          adminClient,
          rows.map((row) => row.id),
          kind,
        ),
      )
    : null;

  return Array.from(
    new Set(
      rows
        .filter((row) => !allowedIds || allowedIds.has(row.id))
        .map((row) => row.email as string),
    ),
  );
}

type EmployeeNotificationParams = {
  employeeEmail: string;
  employeeName?: string | null;
  documentLabel: string;
  periodMonth?: string | null;
  uploaderName?: string | null;
};

export async function notifyEmployeeOfDocument(params: EmployeeNotificationParams) {
  const periodLabel = formatPeriodMonth(params.periodMonth);
  const greeting = params.employeeName ? `Bonjour ${escapeHtml(params.employeeName)},` : "Bonjour,";
  const periodLine = periodLabel
    ? `<p>Periode concernee : <strong>${escapeHtml(periodLabel)}</strong></p>`
    : "";
  const uploaderLine = params.uploaderName
    ? `<p>Depose par : <strong>${escapeHtml(params.uploaderName)}</strong></p>`
    : "";
  const dashboardLink = buildDashboardLink("/dashboard/salarie");

  const html = renderShell(`
    <p>${greeting}</p>
    <p>Un nouveau document <strong>${escapeHtml(params.documentLabel)}</strong> vient d'etre ajoute a ton espace.</p>
    ${periodLine}
    ${uploaderLine}
    <p style="margin-top:24px">${renderButton(dashboardLink, "Acceder a mon espace")}</p>
  `);

  return sendEmail({
    to: params.employeeEmail,
    subject: `Nouveau document : ${params.documentLabel}`,
    html,
  });
}

type RhNotificationParams = {
  rhEmails: string[];
  employeeName?: string | null;
  employeeEmail?: string | null;
  documentLabel: string;
  periodMonth?: string | null;
};

type DocumentRequestNotificationParams = {
  employeeEmail: string;
  employeeName?: string | null;
  documentLabel: string;
  periodMonth?: string | null;
  dueAt?: string | null;
  note?: string | null;
  requesterName?: string | null;
};

type ApplicationNotificationParams = {
  adminEmails: string[];
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string | null;
  jobTitle: string;
  salaryExpectation?: number | null;
  cvLink?: string | null;
};

function formatSalaryExpectation(value: number) {
  const rounded = Math.round(value);
  const withSeparators = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${withSeparators} EUR / an`;
}

function formatDueDate(dueAt: string | null | undefined) {
  if (!dueAt) return null;
  const parsed = new Date(dueAt);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export async function notifyEmployeeOfDocumentRequest(params: DocumentRequestNotificationParams) {
  const periodLabel = formatPeriodMonth(params.periodMonth);
  const dueLabel = formatDueDate(params.dueAt);
  const greeting = params.employeeName ? `Bonjour ${escapeHtml(params.employeeName)},` : "Bonjour,";

  const periodLine = periodLabel
    ? `<p>Periode concernee : <strong>${escapeHtml(periodLabel)}</strong></p>`
    : "";
  const dueLine = dueLabel
    ? `<p>A fournir avant le : <strong>${escapeHtml(dueLabel)}</strong></p>`
    : "";
  const requesterLine = params.requesterName
    ? `<p>Demande par : <strong>${escapeHtml(params.requesterName)}</strong></p>`
    : "";
  const noteLine = params.note
    ? `<p style="background:#f5f5f5;padding:12px;border-radius:6px;white-space:pre-wrap">${escapeHtml(params.note)}</p>`
    : "";
  const dashboardLink = buildDashboardLink("/dashboard/salarie");

  const html = renderShell(`
    <p>${greeting}</p>
    <p>Une nouvelle demande de document <strong>${escapeHtml(params.documentLabel)}</strong> t'a ete adressee par ton RH.</p>
    ${periodLine}
    ${dueLine}
    ${requesterLine}
    ${noteLine}
    <p style="margin-top:24px">${renderButton(dashboardLink, "Repondre a la demande")}</p>
  `);

  return sendEmail({
    to: params.employeeEmail,
    subject: `Demande de document : ${params.documentLabel}`,
    html,
  });
}

export async function notifyRhOfDocument(params: RhNotificationParams) {
  if (!params.rhEmails.length) {
    return { ok: false, skipped: true };
  }

  const periodLabel = formatPeriodMonth(params.periodMonth);
  const periodLine = periodLabel
    ? `<p>Periode : <strong>${escapeHtml(periodLabel)}</strong></p>`
    : "";
  const employeeLine = params.employeeName
    ? `<p>Collaborateur : <strong>${escapeHtml(params.employeeName)}</strong>${params.employeeEmail ? ` (${escapeHtml(params.employeeEmail)})` : ""}</p>`
    : params.employeeEmail
    ? `<p>Collaborateur : <strong>${escapeHtml(params.employeeEmail)}</strong></p>`
    : "";
  const dashboardLink = buildDashboardLink("/dashboard/rh");

  const html = renderShell(`
    <p>Bonjour,</p>
    <p>Un collaborateur vient de deposer un nouveau document <strong>${escapeHtml(params.documentLabel)}</strong>.</p>
    ${employeeLine}
    ${periodLine}
    <p style="margin-top:24px">${renderButton(dashboardLink, "Voir dans le dashboard")}</p>
  `);

  return sendEmail({
    to: params.rhEmails,
    subject: `Nouveau depot : ${params.documentLabel}${params.employeeName ? ` - ${params.employeeName}` : ""}`,
    html,
  });
}

export async function notifyAdminOfApplication(params: ApplicationNotificationParams) {
  if (!params.adminEmails.length) {
    return { ok: false, skipped: true };
  }

  const phoneLine = params.candidatePhone
    ? `<p>Telephone : <strong>${escapeHtml(params.candidatePhone)}</strong></p>`
    : "";
  const salaryLine =
    typeof params.salaryExpectation === "number" && params.salaryExpectation > 0
      ? `<p>Pretention salariale : <strong>${escapeHtml(formatSalaryExpectation(params.salaryExpectation))}</strong></p>`
      : "";
  const cvLine = params.cvLink
    ? `<li><a href="${params.cvLink}">Telecharger le CV</a></li>`
    : "<li>CV indisponible (echec de l'upload, contacter le candidat).</li>";

  const html = renderShell(`
    <p>Bonjour,</p>
    <p>Une nouvelle candidature vient d'etre envoyee pour <strong>${escapeHtml(params.jobTitle)}</strong>.</p>
    <p>Candidat : <strong>${escapeHtml(params.candidateName)}</strong></p>
    <p>Email : <strong>${escapeHtml(params.candidateEmail)}</strong></p>
    ${phoneLine}
    ${salaryLine}
    <ul>
      ${cvLine}
    </ul>
  `);

  return sendEmail({
    to: params.adminEmails,
    subject: `Nouvelle candidature - ${params.jobTitle}`,
    html,
    replyTo: params.candidateEmail,
  });
}

type UnreadMessagesNotificationParams = {
  recipientEmail: string;
  recipientName: string | null;
  /** Determine l'espace vers lequel pointe le bouton. */
  recipientRole: string | null;
  /** Expediteurs et nombre de messages non lus, du plus bavard au moins bavard. */
  senders: { name: string; count: number }[];
  totalCount: number;
};

/**
 * Rappel des messages restes non lus.
 *
 * Un seul e-mail par destinataire et par passage, quel que soit le nombre
 * d'interlocuteurs : un message par conversation transformerait une matinee d'echanges
 * en boite aux lettres saturee.
 *
 * Aucun contenu de message n'est repris — seulement qui a ecrit et combien de fois. Le
 * courriel sort du perimetre de la console et peut etre lu ailleurs : y recopier le
 * texte etendrait la confidentialite de l'echange a la messagerie personnelle.
 */
export async function notifyUnreadMessages(params: UnreadMessagesNotificationParams) {
  const greeting = params.recipientName
    ? `Bonjour ${escapeHtml(params.recipientName)},`
    : "Bonjour,";

  // L'admin n'a pas d'ecran de messagerie : on le renvoie a son tableau de bord.
  const messagesPath =
    params.recipientRole === "rh"
      ? "/dashboard/rh/messages"
      : params.recipientRole === "salarie"
        ? "/dashboard/salarie/messages"
        : "/dashboard";
  const link = buildDashboardLink(messagesPath);

  const plural = params.totalCount > 1 ? "s" : "";
  const senderLines = params.senders
    .map(
      (sender) =>
        `<li><strong>${escapeHtml(sender.name)}</strong> — ${sender.count} message${
          sender.count > 1 ? "s" : ""
        }</li>`,
    )
    .join("");

  const html = renderShell(`
    <p>${greeting}</p>
    <p>Vous avez <strong>${params.totalCount} message${plural} non lu${plural}</strong> dans votre messagerie Jarvis Connect.</p>
    <ul>${senderLines}</ul>
    <p style="margin-top:24px">${renderButton(link, "Lire mes messages")}</p>
  `);

  return sendEmail({
    to: params.recipientEmail,
    subject: `${params.totalCount} message${plural} non lu${plural} - Jarvis Connect`,
    html,
  });
}
