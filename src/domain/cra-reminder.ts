import { buildWorkingDatesForMonth } from "./cra";

/**
 * Rappel de fin de mois aux collaborateurs en mission : remplir et soumettre le CRA, et
 * generer la facture pour ceux qui facturent.
 *
 * Il part le 3e jour ouvre avant la fin du mois — ce jour compris, le collaborateur
 * dispose donc de trois jours ouvres pour le faire. « Ouvre » suit la regle du
 * calendrier CRA (`isWorkingDate`) : ni week-end ni jour ferie francais. En mars 2027,
 * le lundi de Paques (29) etant ferie, le rappel part le vendredi 26 et non le lundi 29.
 */
export const CRA_REMINDER_WORKING_DAYS = 3;

/** Heure (Paris) a partir de laquelle le rappel peut partir, le jour venu. */
export const CRA_REMINDER_HOUR = 9;

/** Jour du rappel (AAAA-MM-JJ) pour le mois `AAAA-MM`. */
export function craReminderDate(month: string): string | null {
  const dates = buildWorkingDatesForMonth(month);
  if (!dates.length) return null;
  return dates[Math.max(0, dates.length - CRA_REMINDER_WORKING_DAYS)];
}

/** Echeance annoncee dans le rappel : le dernier jour ouvre du mois. */
export function craDeadlineDate(month: string): string | null {
  const dates = buildWorkingDatesForMonth(month);
  return dates.length ? dates[dates.length - 1] : null;
}

/**
 * Date et heure a Paris, quel que soit le fuseau du serveur (les fonctions Vercel
 * tournent en UTC) : c'est le calendrier des collaborateurs qui decide du jour.
 */
export function parisNow(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  return {
    isoDate: `${parts.year}-${parts.month}-${parts.day}`,
    month: `${parts.year}-${parts.month}`,
    hour: Number(parts.hour),
  };
}

/** « novembre 2026 » */
export function formatReminderMonth(month: string) {
  return new Date(`${month}-01T12:00:00Z`).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** « lundi 30 novembre » */
export function formatReminderDay(isoDate: string) {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

export type CraReminderInput = {
  /** Mois concerne, `AAAA-MM`. */
  month: string;
  /** Comptes salaries verifies. */
  profiles: { id: string; email: string | null; full_name: string | null; employment_status: string | null }[];
  /** Collaborateurs ayant au moins une mission non archivee. */
  activeMissionEmployeeIds: Iterable<string>;
  /** CRA (toutes periodes ou seulement le mois : seul le mois compte). */
  craRecords: { employee_id: string; period_month: string; status: string }[];
  /** Factures non supprimees du collaborateur, toutes periodes confondues. */
  invoices: { employee_id: string; period_month: string | null; status: string }[];
  /** Collaborateurs dont le profil de facturation porte un SIRET. */
  siretEmployeeIds: Iterable<string>;
};

export type CraReminderTarget = {
  employeeId: string;
  email: string;
  name: string | null;
  needsCra: boolean;
  needsInvoice: boolean;
};

/**
 * Qui relancer, et pour quoi.
 *
 *  - Seuls les collaborateurs EN MISSION (une mission non archivee) : les autres n'ont ni
 *    CRA ni facture a produire. Les comptes sortis (`exited`) ne sont jamais relances.
 *  - CRA : relance tant que le CRA du mois n'est ni soumis ni valide (un brouillon ne
 *    compte pas).
 *  - Facture : seulement pour qui facture — un SIRET sur son profil de facturation, ou des
 *    factures deja emises — et tant qu'aucune facture du mois n'est en attente ou validee
 *    (une facture refusee est a refaire).
 *  - Rien ne manque : pas de rappel.
 */
export function planCraReminders(input: CraReminderInput): CraReminderTarget[] {
  const inMission = new Set(input.activeMissionEmployeeIds);
  const withSiret = new Set(input.siretEmployeeIds);
  const ofMonth = (periodMonth: string | null) => (periodMonth ?? "").slice(0, 7) === input.month;

  const craDone = new Set(
    input.craRecords
      .filter((row) => ofMonth(row.period_month) && (row.status === "submitted" || row.status === "validated"))
      .map((row) => row.employee_id),
  );
  const billers = new Set(input.invoices.map((row) => row.employee_id));
  const invoiceDone = new Set(
    input.invoices
      .filter((row) => ofMonth(row.period_month) && row.status !== "rejected")
      .map((row) => row.employee_id),
  );

  const targets: CraReminderTarget[] = [];
  for (const profile of input.profiles) {
    const email = profile.email?.trim();
    if (!email || profile.employment_status === "exited" || !inMission.has(profile.id)) continue;

    const needsCra = !craDone.has(profile.id);
    const bills = withSiret.has(profile.id) || billers.has(profile.id);
    const needsInvoice = bills && !invoiceDone.has(profile.id);
    if (!needsCra && !needsInvoice) continue;

    targets.push({ employeeId: profile.id, email, name: profile.full_name, needsCra, needsInvoice });
  }
  return targets;
}
