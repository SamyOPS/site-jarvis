import type { TimeUnit } from "@/domain/common";
import {
  craOvertimeError,
  craSlotsHours,
  craSlotsOverlapError,
  craTimeSlotsError,
  parseClockTime,
  sortCraTimeSlots,
  type CraTimeSlotDraft,
} from "@/domain/cra";

/** Types d'absence pointables sur le calendrier. */
export const ABSENCE_TYPES = ["paid", "sick", "exceptional", "unpaid"] as const;
export type CraAbsenceType = (typeof ABSENCE_TYPES)[number];

export function isAbsenceType(value: unknown): value is CraAbsenceType {
  return ABSENCE_TYPES.includes(value as CraAbsenceType);
}

/** Colonne de `cra_records` alimentee par chaque type d'absence. */
export const ABSENCE_COLUMN: Record<CraAbsenceType, string> = {
  paid: "paid_leave_days",
  sick: "sick_leave_days",
  exceptional: "exceptional_leave_days",
  unpaid: "unpaid_leave_days",
};

export type CraEntryInput = {
  workDate?: unknown;
  /** Mission (entreprise cliente) a laquelle la ligne est imputee. */
  missionId?: unknown;
  /** Type d'absence. Exclusif avec `missionId` : une journee est travaillee ou absente. */
  absenceType?: unknown;
  dayQuantity?: unknown;
  hours?: unknown;
  label?: unknown;
  /** Creneaux debut–fin d'une journee horaire. Voir `parseTimeSlots`. */
  timeSlots?: unknown;
  /** Heures supplementaires de la journee, dont `nightOvertimeHours` de nuit. */
  overtimeHours?: unknown;
  nightOvertimeHours?: unknown;
};

/**
 * Unite d'une mission. Il n'existe aucune passerelle entre les deux : une mission a
 * l'heure compte des heures, une mission au jour compte des jours.
 */
export type CraEntryUnit = {
  timeUnit: TimeUnit;
};

export const DAY_UNIT: CraEntryUnit = { timeUnit: "day" };

/**
 * Unite de repli, lue depuis le profil de facturation. Ne sert qu'aux lignes anterieures
 * au multi-entreprises, qui n'ont pas de mission. Toute valeur inattendue retombe sur la
 * saisie en journees, le comportement historique.
 */
export function toCraEntryUnit(
  row: { time_unit?: unknown } | null | undefined,
): CraEntryUnit {
  return { timeUnit: row?.time_unit === "hour" ? "hour" : "day" };
}

/**
 * Colonne a lire pour connaitre l'unite de repli.
 *
 * Volontairement une requete dediee dans les routes CRA, jamais un ajout au `select` du
 * profil de facturation : le POST CRA fait `insert({ ...billingProfile })`, qui recopie
 * chaque colonne selectionnee dans `cra_records`. Y ajouter cette colonne casserait
 * l'insert.
 */
export const CRA_ENTRY_UNIT_COLUMNS = "time_unit";

export type ParsedCraEntry = {
  work_date: string;
  mission_id: string | null;
  /** Type d'absence, ou null pour une journee travaillee. */
  absence_type: CraAbsenceType | null;
  /** Quantite en journees. NULL pour une ligne facturee a l'heure. */
  day_quantity: number | null;
  /** Quantite en heures. NULL pour une ligne facturee au jour. */
  hours: number | null;
  label: string | null;
  /** Creneaux de la journee, NULL s'il n'y en a pas (toujours NULL hors mission horaire). */
  time_slots: CraTimeSlotDraft[] | null;
  /** Heures supplementaires (declaratives, non facturees). NULL = aucune. */
  overtime_hours: number | null;
  night_overtime_hours: number | null;
};

/** Valeur d'heures recue (nombre, chaine, vide) en chaine, pour la regle partagee. */
function hoursText(value: unknown) {
  return value === undefined || value === null ? "" : String(value).trim();
}

/**
 * Heures supplementaires d'une ligne, validees. Zero ou vide = NULL : « aucune ». Arrondies
 * au centieme, pour qu'une saisie comme 1,333... n'arrive pas en base telle quelle.
 */
function parseOvertime(entry: CraEntryInput, index: number) {
  const overtimeText = hoursText(entry.overtimeHours);
  const nightText = hoursText(entry.nightOvertimeHours);
  const problem = craOvertimeError(overtimeText, nightText);
  if (problem) throw new Error(`Ligne ${index + 1} : ${problem}`);
  const round = (value: string) => {
    const parsed = Math.round(Number(value) * 100) / 100;
    return value && parsed > 0 ? parsed : null;
  };
  return { overtime_hours: round(overtimeText), night_overtime_hours: round(nightText) };
}

/**
 * Creneaux d'une ligne, valides et tries. Rend null pour une liste absente ou vide.
 * Seuls `start`, `end` et `label` sont retenus : rien d'autre n'entre en base.
 */
function parseTimeSlots(value: unknown, index: number): CraTimeSlotDraft[] | null {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value)) {
    throw new Error(`Les creneaux de la ligne ${index + 1} sont invalides.`);
  }
  if (!value.length) return null;
  const slots = value.map((slot) => {
    const raw = (slot ?? {}) as Record<string, unknown>;
    return {
      start: String(raw.start ?? "").trim(),
      end: String(raw.end ?? "").trim(),
      label: String(raw.label ?? "").trim(),
    };
  });
  const problem = craTimeSlotsError(slots);
  if (problem) throw new Error(`Ligne ${index + 1} : ${problem}`);
  return sortCraTimeSlots(slots);
}

/** Totaux d'absence par type, dans la forme attendue par `cra_records`. */
export function sumAbsenceDays(entries: ParsedCraEntry[]) {
  const totals: Record<string, number> = {
    paid_leave_days: 0,
    sick_leave_days: 0,
    exceptional_leave_days: 0,
    unpaid_leave_days: 0,
  };
  for (const entry of entries) {
    if (!entry.absence_type) continue;
    totals[ABSENCE_COLUMN[entry.absence_type]] += entry.day_quantity ?? 0;
  }
  return totals;
}

/**
 * Valide et normalise les lignes d'un CRA.
 *
 * Une ligne porte une seule quantite, celle de l'unite de sa mission : des heures, ou des
 * journees. Aucune conversion entre les deux — il n'existe plus de base d'heures par jour.
 *
 * L'unite se resout PAR LIGNE, depuis la mission de l'entree : un meme CRA peut melanger
 * une mission facturee au jour et une autre a l'heure. `missionUnits` porte les missions
 * du collaborateur ; `fallbackUnit` couvre les lignes sans mission (CRA anterieurs au
 * multi-entreprises, ou collaborateur sans mission enregistree).
 *
 * Un `missionId` absent de `missionUnits` est refuse : il finit sur une facture, il ne
 * peut pas etre accepte sur parole. Deux lignes de meme date et meme mission sont refusees
 * aussi — c'est ce que l'index unique interdit en base.
 */
export function parseCraEntries(
  entries: CraEntryInput[] | undefined,
  missionUnits: Map<string, CraEntryUnit>,
  fallbackUnit: CraEntryUnit = DAY_UNIT,
): ParsedCraEntry[] {
  const seen = new Set<string>();

  const parsed = (entries ?? []).map((entry, index): ParsedCraEntry => {
    const workDate = String(entry.workDate ?? "").trim();
    const parsedDate = new Date(workDate);
    if (!workDate || Number.isNaN(parsedDate.getTime())) {
      throw new Error(`La date de la ligne ${index + 1} est invalide.`);
    }

    const label = String(entry.label ?? "").trim() || null;
    const work_date = parsedDate.toISOString().slice(0, 10);

    // Une absence n'est rattachee a aucune mission : elle occupe la place « sans
    // entreprise » de la journee, ce que l'index unique garantit cote base.
    const rawAbsence = String(entry.absenceType ?? "").trim();
    if (rawAbsence && !isAbsenceType(rawAbsence)) {
      throw new Error(`Le type d'absence de la ligne ${index + 1} est inconnu.`);
    }
    const absenceType = rawAbsence ? (rawAbsence as CraAbsenceType) : null;

    const missionId = absenceType ? null : String(entry.missionId ?? "").trim() || null;
    if (missionId && !missionUnits.has(missionId)) {
      throw new Error(`L'entreprise de la ligne ${index + 1} est inconnue.`);
    }

    if (absenceType) {
      const dayQuantity = Number(entry.dayQuantity);
      if (!Number.isFinite(dayQuantity) || dayQuantity <= 0 || dayQuantity > 1) {
        throw new Error(
          `La quantite de l'absence de la ligne ${index + 1} doit etre comprise entre 0 et 1.`,
        );
      }
      const absenceKey = `${work_date}|`;
      if (seen.has(absenceKey)) {
        throw new Error(`Deux absences sont saisies le ${work_date}.`);
      }
      seen.add(absenceKey);
      if (parseTimeSlots(entry.timeSlots, index)) {
        throw new Error(`Une absence ne se detaille pas en creneaux (ligne ${index + 1}).`);
      }
      if (parseOvertime(entry, index).overtime_hours) {
        throw new Error(`Une absence ne porte pas d'heures supplementaires (ligne ${index + 1}).`);
      }
      return {
        work_date,
        mission_id: null,
        absence_type: absenceType,
        day_quantity: dayQuantity,
        hours: null,
        label,
        time_slots: null,
        overtime_hours: null,
        night_overtime_hours: null,
      };
    }

    const overtime = parseOvertime(entry, index);
    const key = `${work_date}|${missionId ?? ""}`;
    if (seen.has(key)) {
      throw new Error(
        `La meme entreprise est saisie deux fois le ${work_date}. Regroupe les heures sur une seule ligne.`,
      );
    }
    seen.add(key);

    const unit = missionId ? (missionUnits.get(missionId) ?? fallbackUnit) : fallbackUnit;

    const timeSlots = parseTimeSlots(entry.timeSlots, index);

    if (unit.timeUnit === "hour") {
      // Detaillee en creneaux, la journee vaut leur somme : le total ne peut pas diverger
      // du detail, quoi que le client ait envoye dans `hours`.
      const hours = timeSlots ? craSlotsHours(timeSlots) : Number(entry.hours);
      if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
        throw new Error(
          `Le nombre d'heures de la ligne ${index + 1} doit etre compris entre 0 et 24.`,
        );
      }
      return {
        work_date,
        mission_id: missionId,
        absence_type: null,
        day_quantity: null,
        hours,
        label,
        time_slots: timeSlots,
        ...overtime,
      };
    }

    if (timeSlots) {
      throw new Error(
        `Les creneaux horaires ne concernent que les missions facturees a l'heure (ligne ${index + 1}).`,
      );
    }
    const dayQuantity = Number(entry.dayQuantity);
    if (!Number.isFinite(dayQuantity) || dayQuantity <= 0 || dayQuantity > 1) {
      throw new Error(`La quantite de la ligne ${index + 1} doit etre comprise entre 0 et 1.`);
    }
    return {
      work_date,
      mission_id: missionId,
      absence_type: null,
      day_quantity: dayQuantity,
      hours: null,
      label,
      time_slots: null,
      ...overtime,
    };
  });

  assertNoOverlapAcrossMissions(parsed);
  return parsed;
}

/**
 * Chevauchements ENTRE les entreprises d'une meme journee : 9 h - 12 h chez A et 11 h -
 * 14 h chez B, c'est etre a deux endroits a la fois. Chaque ligne a deja ete verifiee
 * seule ; il reste a croiser les lignes d'une meme date.
 */
function assertNoOverlapAcrossMissions(entries: ParsedCraEntry[]) {
  const rangesByDate = new Map<string, [number, number][]>();
  for (const entry of entries) {
    for (const slot of entry.time_slots ?? []) {
      const range: [number, number] = [parseClockTime(slot.start) ?? 0, parseClockTime(slot.end) ?? 0];
      rangesByDate.set(entry.work_date, [...(rangesByDate.get(entry.work_date) ?? []), range]);
    }
  }
  for (const [workDate, ranges] of rangesByDate) {
    if (craSlotsOverlapError(ranges)) {
      throw new Error(`Le ${workDate}, deux creneaux se chevauchent entre deux entreprises.`);
    }
  }
}

export function sumCraEntryHours(entries: { hours?: number | null }[]) {
  return entries.reduce((total, entry) => total + (Number(entry.hours) || 0), 0);
}
