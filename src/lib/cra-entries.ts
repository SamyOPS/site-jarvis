import type { CraTimeUnit } from "@/features/dashboard/salarie/types";

export type CraEntryInput = {
  workDate?: unknown;
  /** Mission (entreprise cliente) a laquelle la ligne est imputee. */
  missionId?: unknown;
  dayQuantity?: unknown;
  hours?: unknown;
  label?: unknown;
};

/**
 * Unite d'une mission. Il n'existe aucune passerelle entre les deux : une mission a
 * l'heure compte des heures, une mission au jour compte des jours.
 */
export type CraEntryUnit = {
  timeUnit: CraTimeUnit;
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
  /** Quantite en journees. NULL pour une ligne facturee a l'heure. */
  day_quantity: number | null;
  /** Quantite en heures. NULL pour une ligne facturee au jour. */
  hours: number | null;
  label: string | null;
};

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

  return (entries ?? []).map((entry, index) => {
    const workDate = String(entry.workDate ?? "").trim();
    const parsedDate = new Date(workDate);
    if (!workDate || Number.isNaN(parsedDate.getTime())) {
      throw new Error(`La date de la ligne ${index + 1} est invalide.`);
    }

    const label = String(entry.label ?? "").trim() || null;
    const work_date = parsedDate.toISOString().slice(0, 10);

    const missionId = String(entry.missionId ?? "").trim() || null;
    if (missionId && !missionUnits.has(missionId)) {
      throw new Error(`L'entreprise de la ligne ${index + 1} est inconnue.`);
    }

    const key = `${work_date}|${missionId ?? ""}`;
    if (seen.has(key)) {
      throw new Error(
        `La meme entreprise est saisie deux fois le ${work_date}. Regroupe les heures sur une seule ligne.`,
      );
    }
    seen.add(key);

    const unit = missionId ? (missionUnits.get(missionId) ?? fallbackUnit) : fallbackUnit;

    if (unit.timeUnit === "hour") {
      const hours = Number(entry.hours);
      if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
        throw new Error(
          `Le nombre d'heures de la ligne ${index + 1} doit etre compris entre 0 et 24.`,
        );
      }
      return {
        work_date,
        mission_id: missionId,
        day_quantity: null,
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
      mission_id: missionId,
      day_quantity: dayQuantity,
      hours: null,
      label,
    };
  });
}

export function sumCraEntryHours(entries: { hours?: number | null }[]) {
  return entries.reduce((total, entry) => total + (Number(entry.hours) || 0), 0);
}
