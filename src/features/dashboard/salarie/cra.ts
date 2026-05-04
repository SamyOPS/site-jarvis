import type { CraCalendarCell, CraEntryDraft } from "@/features/dashboard/salarie/types";

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
