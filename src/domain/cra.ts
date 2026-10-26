/**
 * Types metier partages. Regle : ce dossier ne doit importer AUCUN module du projet
 * (ni @/lib, ni @/features, ni @/components, ni @/app). TypeScript natif uniquement.
 * Les imports internes au domaine se font en chemin relatif.
 *
 * Le compte-rendu d'activite est consomme par DEUX roles (salarie et RH) : c'est ce qui
 * justifie sa presence ici plutot que dans features/dashboard/salarie/.
 */

import type { TimeUnit } from "./common";
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
  /**
   * Detail horaire d'une journee facturee a l'heure : creneaux debut–fin commentes. Vide
   * pour une journee au jour, une absence, ou une journee horaire non detaillee. Non vide,
   * il fait foi : `hours` en est deduit (voir `craSlotsHours`).
   */
  timeSlots: CraTimeSlotDraft[];
};

/** Creneau horaire d'une journee : heures « HH:MM », au quart d'heure. */
export type CraTimeSlotDraft = {
  start: string;
  end: string;
  label: string;
};

/**
 * Pas des creneaux, en minutes. Au quart d'heure, une duree vaut toujours un multiple
 * exact de 0,25 h : la quantite facturee (heures x taux) tombe juste au centime, ce que
 * 1 h 20 (1,333... h) ne permettrait pas.
 */
export const CRA_SLOT_STEP_MINUTES = 15;
/** Creneaux au plus par ligne : borne anti-absurdite, une journee en compte rarement 10. */
export const CRA_MAX_SLOTS_PER_ENTRY = 24;
export const CRA_SLOT_LABEL_MAX_LENGTH = 200;

/**
 * « HH:MM » en minutes depuis minuit, ou null si l'heure est invalide ou hors du pas du
 * quart d'heure. « 24:00 » est accepte : c'est la fin d'un creneau qui court jusqu'a minuit.
 */
export function parseClockTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  if (Number(match[2]) >= 60 || minutes > 24 * 60) return null;
  if (minutes % CRA_SLOT_STEP_MINUTES !== 0) return null;
  return minutes;
}

/** Duree d'un creneau en minutes, ou null s'il est incomplet ou incoherent. */
export function craSlotMinutes(slot: Pick<CraTimeSlotDraft, "start" | "end">) {
  const start = parseClockTime(slot.start);
  const end = parseClockTime(slot.end);
  if (start === null || end === null || end <= start) return null;
  return end - start;
}

/** Heures couvertes par des creneaux. Les creneaux invalides ne comptent pas. */
export function craSlotsHours(slots: Pick<CraTimeSlotDraft, "start" | "end">[]) {
  const minutes = slots.reduce((total, slot) => total + (craSlotMinutes(slot) ?? 0), 0);
  return minutes / 60;
}

/**
 * Premier probleme d'une liste de creneaux, ou null si elle est valide. Partage par la
 * saisie (message sous les creneaux) et le serveur (refus a l'enregistrement) : les deux
 * disent la meme chose.
 */
export function craTimeSlotsError(slots: CraTimeSlotDraft[]) {
  if (slots.length > CRA_MAX_SLOTS_PER_ENTRY) {
    return `${CRA_MAX_SLOTS_PER_ENTRY} creneaux au plus par journee.`;
  }
  const ranges: [number, number][] = [];
  for (const [index, slot] of slots.entries()) {
    const position = `Creneau ${index + 1}`;
    const start = parseClockTime(slot.start);
    const end = parseClockTime(slot.end);
    if (start === null || end === null) {
      return `${position} : heures attendues au format HH:MM, au quart d'heure (00, 15, 30, 45).`;
    }
    if (end <= start) return `${position} : la fin doit suivre le debut.`;
    if (slot.label.trim().length > CRA_SLOT_LABEL_MAX_LENGTH) {
      return `${position} : commentaire trop long (${CRA_SLOT_LABEL_MAX_LENGTH} caracteres maximum).`;
    }
    ranges.push([start, end]);
  }
  return craSlotsOverlapError(ranges);
}

/** Deux creneaux qui se chevauchent : on ne peut pas etre a deux endroits a la fois. */
export function craSlotsOverlapError(ranges: [number, number][]) {
  const sorted = [...ranges].sort((left, right) => left[0] - right[0]);
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index][0] < sorted[index - 1][1]) {
      return "Deux creneaux se chevauchent.";
    }
  }
  return null;
}

/** Creneaux dans l'ordre de la journee. */
export function sortCraTimeSlots<T extends Pick<CraTimeSlotDraft, "start">>(slots: T[]) {
  return [...slots].sort(
    (left, right) => (parseClockTime(left.start) ?? 0) - (parseClockTime(right.start) ?? 0),
  );
}

/** « 09:00 - 10:30 ». */
export function formatCraSlotRange(slot: Pick<CraTimeSlotDraft, "start" | "end">) {
  return `${slot.start} - ${slot.end}`;
}

/** « HH:MM » d'un nombre de minutes, borne a 24:00. */
export function formatClockTime(minutes: number) {
  const bounded = Math.max(0, Math.min(24 * 60, minutes));
  return `${String(Math.floor(bounded / 60)).padStart(2, "0")}:${String(bounded % 60).padStart(2, "0")}`;
}

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

/**
 * Predicat d'identite d'une ligne : une date ET une mission.
 *
 * La cle n'est pas la seule date — depuis le multi-entreprises, une meme journee peut porter
 * plusieurs missions, chacune avec sa quantite. Ce predicat etait reecrit a la main a chaque
 * site d'appel (`entry.workDate === workDate && entry.missionId === missionId`), ce qui rend
 * une divergence facile et invisible.
 */
export function isSameCraSlot(entry: CraEntryDraft, workDate: string, missionId: string) {
  return entry.workDate === workDate && entry.missionId === missionId;
}

/**
 * Predicat de l'absence d'une journee. Contrairement aux missions, il n'y a **qu'une** absence
 * possible par jour : la date suffit a l'identifier.
 */
export function isCraAbsenceOn(entry: CraEntryDraft, workDate: string) {
  return entry.workDate === workDate && Boolean(entry.absenceType);
}

/** Les lignes du mois donne, les autres etant ecartees. */
export function keepCraEntriesOfMonth(entries: CraEntryDraft[], monthValue: string) {
  return sortCraEntries(entries.filter((entry) => entry.workDate.startsWith(`${monthValue}-`)));
}

/**
 * Applique un patch aux lignes retenues, et retrie.
 *
 * Le tri fait partie du contrat : les appelants enchainaient systematiquement `sortCraEntries`
 * apres le `map`, y compris quand le patch ne touche pas la date. L'oublier a un seul endroit
 * produirait une liste dans un ordre different des autres, sans erreur visible.
 */
export function patchCraEntries(
  entries: CraEntryDraft[],
  matches: (entry: CraEntryDraft) => boolean,
  patch: Partial<CraEntryDraft>,
) {
  return sortCraEntries(
    entries.map((entry) => (matches(entry) ? { ...entry, ...patch } : entry)),
  );
}

/** Retire les lignes retenues. Pas de tri : un filtrage preserve l'ordre existant. */
export function removeCraEntries(
  entries: CraEntryDraft[],
  matches: (entry: CraEntryDraft) => boolean,
) {
  return entries.filter((entry) => !matches(entry));
}

/** Ajoute une ligne et retrie. */
export function addCraEntry(entries: CraEntryDraft[], entry: CraEntryDraft) {
  return sortCraEntries([...entries, entry]);
}

/** Unite de saisie d'une mission donnee. Fournie par l'appelant, qui detient les missions. */
export type CraMissionUnitResolver = (missionId: string) => TimeUnit;

/**
 * Lignes du mois regroupees par date.
 *
 * La valeur est un TABLEAU, pas une entree unique : depuis le multi-entreprises une meme
 * journee peut porter plusieurs missions. Le cote RH n'en avait qu'une par jour et utilisait
 * une Map simple — c'est cette version-ci qui fait foi.
 */
export function groupCraEntriesByDate(entries: CraEntryDraft[]) {
  const byDate = new Map<string, CraEntryDraft[]>();
  for (const entry of entries) {
    byDate.set(entry.workDate, [...(byDate.get(entry.workDate) ?? []), entry]);
  }
  return byDate;
}

/**
 * Totaux par entreprise, chacun dans l'unite de sa mission.
 *
 * C'est ce decoupage qui permet de melanger une mission au jour et une mission a l'heure sur
 * un meme mois : chaque ligne de facture est ensuite valorisee avec son propre tarif. Les
 * absences ne sont pas facturees et n'entrent dans aucun total.
 */
export function craTotalsByMission(
  entries: CraEntryDraft[],
  unitOf: CraMissionUnitResolver,
) {
  const totals = new Map<string, { quantity: number; unit: TimeUnit }>();
  for (const entry of entries) {
    if (entry.absenceType) continue;
    const unit = unitOf(entry.missionId);
    const current = totals.get(entry.missionId) ?? { quantity: 0, unit };
    totals.set(entry.missionId, {
      unit,
      quantity:
        current.quantity + (unit === "hour" ? craEntryHours(entry) : Number(entry.dayQuantity) || 0),
    });
  }
  return totals;
}

/** Total des heures declarees, missions horaires seulement. */
export function craTotalHours(entries: CraEntryDraft[]) {
  return entries.reduce((total, entry) => total + craEntryHours(entry), 0);
}

/** Total des journees travaillees, missions au jour seulement. Absences exclues. */
export function craTotalDays(entries: CraEntryDraft[], unitOf: CraMissionUnitResolver) {
  return entries.reduce(
    (total, entry) =>
      entry.absenceType || unitOf(entry.missionId) === "hour"
        ? total
        : total + (Number(entry.dayQuantity) || 0),
    0,
  );
}

/** Totaux d'absence par type, deduits du calendrier et non d'un formulaire separe. */
export function craAbsenceTotalsByType(entries: CraEntryDraft[]) {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    if (!entry.absenceType) continue;
    totals.set(
      entry.absenceType,
      (totals.get(entry.absenceType) ?? 0) + (Number(entry.dayQuantity) || 0),
    );
  }
  return totals;
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
