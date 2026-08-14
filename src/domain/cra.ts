/**
 * Types metier partages. Regle : ce dossier ne doit importer AUCUN module du projet
 * (ni @/lib, ni @/features, ni @/components, ni @/app). TypeScript natif uniquement.
 * Les imports internes au domaine se font en chemin relatif.
 *
 * Le compte-rendu d'activite est consomme par DEUX roles (salarie et RH) : c'est ce qui
 * justifie sa presence ici plutot que dans features/dashboard/salarie/.
 */

import { getFrenchHolidayName } from "./holidays";

/** Une ligne de saisie du CRA : une date, imputee a une mission ou a une absence. */
export type CraEntryDraft = {
  workDate: string;
  /**
   * Mission (entreprise cliente) a laquelle la ligne est imputee. Forme avec `workDate`
   * la cle d'une entree : une meme journee peut porter plusieurs entreprises.
   * Vide pour les CRA anterieurs au multi-entreprises.
   */
  missionId: string;
  /**
   * Type d'absence (paid, sick, exceptional, unpaid). Vide pour une journee travaillee.
   * Exclusif avec `missionId` : une journee est travaillee chez un client, ou absente.
   */
  absenceType: string;
  /** Quantite en journees. Vide pour une mission facturee a l'heure. */
  dayQuantity: string;
  /** Quantite en heures. Vide pour une mission facturee au jour. */
  hours: string;
  label: string;
};

/** Libelles des types d'absence, dans l'ordre d'affichage. */
export const ABSENCE_LABELS = [
  { value: "paid", label: "Conge paye" },
  { value: "sick", label: "Arret maladie" },
  { value: "exceptional", label: "Conge exceptionnel" },
  { value: "unpaid", label: "Conge sans solde" },
] as const;

/** Case du calendrier mensuel. `isoDate` est nul pour les cases de remplissage. */
export type CraCalendarCell = {
  isoDate: string | null;
  dayNumber: number | null;
};

export const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function currentMonthInputValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function sortCraEntries(entries: CraEntryDraft[]) {
  return [...entries].sort((left, right) => left.workDate.localeCompare(right.workDate));
}

export function shiftMonthInputValue(value: string, offset: number) {
  const [yearString, monthString] = value.split("-");
  const year = Number(yearString);
  const month = Number(monthString);
  if (!year || !month) {
    return currentMonthInputValue();
  }

  const nextDate = new Date(year, month - 1 + offset, 1);
  const nextYear = nextDate.getFullYear();
  const nextMonth = String(nextDate.getMonth() + 1).padStart(2, "0");
  return `${nextYear}-${nextMonth}`;
}

export function buildCalendarCells(monthValue: string): CraCalendarCell[] {
  const [yearString, monthString] = monthValue.split("-");
  const year = Number(yearString);
  const month = Number(monthString);
  if (!year || !month) {
    return [];
  }

  const firstDay = new Date(year, month - 1, 1);
  const totalDays = new Date(year, month, 0).getDate();
  const leadingEmptyCells = (firstDay.getDay() + 6) % 7;
  const cells: CraCalendarCell[] = [];

  for (let index = 0; index < leadingEmptyCells; index += 1) {
    cells.push({ isoDate: null, dayNumber: null });
  }

  for (let dayNumber = 1; dayNumber <= totalDays; dayNumber += 1) {
    cells.push({
      isoDate: `${monthValue}-${String(dayNumber).padStart(2, "0")}`,
      dayNumber,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ isoDate: null, dayNumber: null });
  }

  return cells;
}

/**
 * Un jour est ouvre s'il n'est ni un week-end ni un jour ferie francais. C'est la
 * meme regle que le style grise des cases du calendrier CRA : le remplissage
 * rapide coche donc exactement les cases non grisees.
 */
export function isWorkingDate(isoDate: string) {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  if ([0, 6].includes(parsed.getDay())) {
    return false;
  }
  return !getFrenchHolidayName(isoDate);
}

export function buildWorkingDatesForMonth(monthValue: string) {
  return buildCalendarCells(monthValue)
    .map((cell) => cell.isoDate)
    .filter((isoDate): isoDate is string => Boolean(isoDate))
    .filter(isWorkingDate);
}

/**
 * Volume horaire d'une ligne. Il n'y a plus de conversion depuis les journees : une ligne
 * saisie au jour ne represente aucune heure.
 */
export function craEntryHours(entry: Pick<CraEntryDraft, "hours">) {
  const explicitHours = Number(entry.hours);
  return Number.isFinite(explicitHours) && explicitHours > 0 ? explicitHours : 0;
}

export function formatCraHours(value: number) {
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} h`;
}

export function formatCraPeriodLabel(monthValue: string) {
  const parsed = new Date(`${monthValue}-01T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return monthValue;
  }

  return parsed.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export function formatCraEntryDateLabel(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
