import { DEFAULT_HOURS_PER_DAY, type CraTimeUnit } from "@/features/dashboard/salarie/types";

export type CraEntryInput = {
  workDate?: unknown;
  dayQuantity?: unknown;
  hours?: unknown;
  label?: unknown;
};

export type CraEntryUnit = {
  timeUnit: CraTimeUnit;
  hoursPerDay: number;
};

export const DAY_UNIT: CraEntryUnit = {
  timeUnit: "day",
  hoursPerDay: DEFAULT_HOURS_PER_DAY,
};

/**
 * Unite de saisie du consultant, lue depuis son profil de facturation. Toute valeur
 * inattendue retombe sur la saisie en journees, le comportement historique.
 */
export function toCraEntryUnit(
  row: { time_unit?: unknown; hours_per_day?: unknown } | null | undefined,
): CraEntryUnit {
  const hoursPerDay = Number(row?.hours_per_day);
  return {
    timeUnit: row?.time_unit === "hour" ? "hour" : "day",
    hoursPerDay:
      Number.isFinite(hoursPerDay) && hoursPerDay > 0 ? hoursPerDay : DEFAULT_HOURS_PER_DAY,
  };
}

/**
 * Colonnes a lire pour connaitre l'unite de saisie.
 *
 * Volontairement une requete dediee dans les routes CRA, jamais un ajout au `select` du
 * profil de facturation : le POST CRA fait `insert({ ...billingProfile })`, qui recopie
 * chaque colonne selectionnee dans `cra_records`. Y ajouter ces deux colonnes casserait
 * l'insert.
 */
export const CRA_ENTRY_UNIT_COLUMNS = "time_unit,hours_per_day";

export type ParsedCraEntry = {
  work_date: string;
  day_quantity: number;
  hours: number | null;
  label: string | null;
};

/**
 * Valide et normalise les lignes d'un CRA.
 *
 * En saisie horaire c'est `hours` qui fait foi et `day_quantity` qui en est derive : le
 * client ne peut donc pas imposer une quantite de jours incoherente avec les heures.
 * Une journee peut alors depasser un jour (9 h sur une base de 7 h = 1,29), c'est
 * pourquoi la borne haute de 1 ne s'applique qu'a la saisie en journees.
 */
export function parseCraEntries(
  entries: CraEntryInput[] | undefined,
  unit: CraEntryUnit,
): ParsedCraEntry[] {
  return (entries ?? []).map((entry, index) => {
    const workDate = String(entry.workDate ?? "").trim();
    const parsedDate = new Date(workDate);
    if (!workDate || Number.isNaN(parsedDate.getTime())) {
      throw new Error(`La date de la ligne ${index + 1} est invalide.`);
    }

    const label = String(entry.label ?? "").trim() || null;
    const work_date = parsedDate.toISOString().slice(0, 10);

    if (unit.timeUnit === "hour") {
      const hours = Number(entry.hours);
      if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
        throw new Error(
          `Le nombre d'heures de la ligne ${index + 1} doit etre compris entre 0 et 24.`,
        );
      }
      return {
        work_date,
        day_quantity: hours / unit.hoursPerDay,
        hours,
        label,
      };
    }

    const dayQuantity = Number(entry.dayQuantity);
    if (!Number.isFinite(dayQuantity) || dayQuantity <= 0 || dayQuantity > 1) {
      throw new Error(`La quantite de la ligne ${index + 1} doit etre comprise entre 0 et 1.`);
    }
    return {
      work_date,
      day_quantity: dayQuantity,
      hours: null,
      label,
    };
  });
}

export function sumCraEntryHours(entries: { hours?: number | null }[]) {
  return entries.reduce((total, entry) => total + (Number(entry.hours) || 0), 0);
}
