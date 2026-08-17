import type { SupabaseClient } from "@supabase/supabase-js";

import type { TimeUnit } from "@/domain/common";
import type {
  InvoiceLineInput,
  InvoiceLineUnit,
} from "@/features/dashboard/salarie/invoice-totals";

import type { CraEntryUnit, ParsedCraEntry } from "@/lib/cra-entries";

/**
 * Une mission est le couple collaborateur x entreprise cliente. Elle porte l'entreprise,
 * l'ESN partenaire, le tarif et l'unite de saisie.
 *
 * Elle remplace les colonnes correspondantes de `employee_billing_profiles`, qui ne pouvait
 * en decrire qu'une seule par collaborateur. Le profil de facturation ne garde plus que
 * l'identite de l'emetteur (nom, adresse, SIRET, IBAN).
 */
export const MISSION_COLUMNS =
  "id,employee_id,company_name,esn_partenaire,rate,rate_unit,archived_at,position,created_at,updated_at";

const MISSION_UNITS = ["day", "hour"] as const;
export type MissionUnit = (typeof MISSION_UNITS)[number];

const MAX_COMPANY_NAME_LENGTH = 120;

export type MissionRow = {
  id: string;
  employee_id: string;
  company_name: string;
  esn_partenaire: string | null;
  rate: number | null;
  rate_unit: string;
  archived_at: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export type MissionPayload = {
  companyName?: unknown;
  esnPartenaire?: unknown;
  rate?: unknown;
  rateUnit?: unknown;
  position?: unknown;
};

export type ParsedMission = {
  company_name: string;
  esn_partenaire: string | null;
  rate: number | null;
  rate_unit: MissionUnit;
  position?: number;
};

function isMissionUnit(value: unknown): value is MissionUnit {
  return MISSION_UNITS.includes(value as MissionUnit);
}

/**
 * Valide le contenu d'une mission.
 *
 * Le tarif reste facultatif : une mission peut etre creee avant d'en connaitre le montant.
 * C'est la generation de facture qui exige un tarif, pas la mission elle-meme.
 */
export function parseMissionPayload(payload: MissionPayload | null): ParsedMission {
  const companyName = String(payload?.companyName ?? "").trim();
  if (!companyName) {
    throw new Error("Le nom de l'entreprise est obligatoire.");
  }
  if (companyName.length > MAX_COMPANY_NAME_LENGTH) {
    throw new Error(
      `Le nom de l'entreprise ne peut pas depasser ${MAX_COMPANY_NAME_LENGTH} caracteres.`,
    );
  }

  const rateUnit = isMissionUnit(payload?.rateUnit) ? payload.rateUnit : "day";

  let rate: number | null = null;
  const rawRate = payload?.rate;
  if (rawRate !== null && rawRate !== undefined && String(rawRate).trim() !== "") {
    const parsedRate = Number(rawRate);
    if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
      throw new Error(
        rateUnit === "hour"
          ? "Le tarif horaire est invalide."
          : "Le tarif journalier est invalide.",
      );
    }
    rate = parsedRate;
  }

  const parsed: ParsedMission = {
    company_name: companyName,
    esn_partenaire: String(payload?.esnPartenaire ?? "").trim() || null,
    rate,
    rate_unit: rateUnit,
  };

  const rawPosition = payload?.position;
  if (rawPosition !== null && rawPosition !== undefined && String(rawPosition).trim() !== "") {
    const parsedPosition = Number(rawPosition);
    if (Number.isFinite(parsedPosition)) {
      parsed.position = Math.max(0, Math.trunc(parsedPosition));
    }
  }

  return parsed;
}

/**
 * Unite de saisie d'une mission, dans la forme attendue par `parseCraEntries`.
 *
 * Toute valeur inattendue retombe sur la saisie en journees, le comportement historique.
 */
export function toMissionEntryUnit(
  mission: { rate_unit?: unknown } | null | undefined,
): CraEntryUnit {
  return { timeUnit: (mission?.rate_unit === "hour" ? "hour" : "day") as TimeUnit };
}

/**
 * Charge les missions d'un collaborateur et la table des unites correspondante.
 *
 * Requete DEDIEE, jamais un elargissement du `select` du profil de facturation : les
 * routes CRA font `insert({ ...billingProfile })`, qui recopie chaque colonne selectionnee
 * dans `cra_records`. Meme piege que celui documente pour `CRA_ENTRY_UNIT_COLUMNS`.
 */
export async function loadEmployeeMissions(adminClient: SupabaseClient, employeeId: string) {
  const { data, error } = await adminClient
    .from("employee_missions")
    .select(MISSION_COLUMNS)
    .eq("employee_id", employeeId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const missions = (data ?? []) as unknown as MissionRow[];
  const units = new Map<string, CraEntryUnit>();
  for (const mission of missions) {
    units.set(mission.id, toMissionEntryUnit(mission));
  }

  return { missions, units };
}

/**
 * Une ligne de facture par entreprise saisie, chacune dans son unite et avec son tarif.
 *
 * C'est ce qui permet de facturer une entreprise a l'heure et une autre au jour sur la meme
 * facture. Les lignes sans mission (CRA anterieurs au multi-entreprises), les missions
 * inconnues, et celles dont la quantite ou le tarif est nul sont ecartees : une ligne a zero
 * n'a rien a faire sur une facture.
 *
 * Partage entre la facture du salarie et celle generee par le RH : les deux doivent produire
 * exactement les memes lignes pour les memes entrees, sans quoi le meme mois facturé des deux
 * cotes donnerait deux montants.
 */
export function buildInvoiceLinesFromEntries(
  entries: { mission_id: string | null; day_quantity?: number | null; hours?: number | null }[],
  missions: MissionRow[],
): InvoiceLineInput[] {
  const entriesByMission = new Map<string, typeof entries>();
  for (const entry of entries) {
    if (!entry.mission_id) continue;
    entriesByMission.set(entry.mission_id, [
      ...(entriesByMission.get(entry.mission_id) ?? []),
      entry,
    ]);
  }

  const lines: InvoiceLineInput[] = [];
  for (const [missionId, missionEntries] of entriesByMission.entries()) {
    const mission = missions.find((item) => item.id === missionId);
    if (!mission) continue;
    const unit: InvoiceLineUnit = mission.rate_unit === "hour" ? "hour" : "day";
    const quantity = missionLineQuantity(unit, missionEntries);
    const rate = Number(mission.rate ?? 0);
    if (quantity <= 0 || !Number.isFinite(rate) || rate <= 0) continue;
    lines.push({ missionId, label: mission.company_name, quantity, rate, unit });
  }
  return lines;
}

/** Quantite facturee d'une ligne, exprimee dans l'unite de la mission. */
export function missionLineQuantity(
  unit: MissionUnit,
  entries: { day_quantity?: number | null; hours?: number | null }[],
) {
  return entries.reduce((total, entry) => {
    const value = unit === "hour" ? Number(entry.hours) : Number(entry.day_quantity);
    return total + (Number.isFinite(value) ? value : 0);
  }, 0);
}

/**
 * Reconstruit les lignes recapitulatives d'un CRA : une par entreprise presente.
 *
 * Elles figent le tarif au moment du CRA — comme `cra_records` figeait le profil de
 * facturation — et alimentent le recapitulatif du PDF ainsi que les lignes de la facture.
 * Reconstruction complete a chaque enregistrement, sur le meme principe que les entrees.
 */
export async function syncCraMissionLines(
  adminClient: SupabaseClient,
  craId: string,
  entries: ParsedCraEntry[],
  missions: MissionRow[],
) {
  const { error: deleteError } = await adminClient
    .from("cra_mission_lines")
    .delete()
    .eq("cra_id", craId);
  if (deleteError) {
    throw new Error(deleteError.message);
  }

  const entriesByMission = new Map<string, ParsedCraEntry[]>();
  for (const entry of entries) {
    if (!entry.mission_id) continue;
    entriesByMission.set(entry.mission_id, [
      ...(entriesByMission.get(entry.mission_id) ?? []),
      entry,
    ]);
  }
  if (entriesByMission.size === 0) {
    return [];
  }

  const missionsById = new Map(missions.map((mission) => [mission.id, mission]));
  const rows = Array.from(entriesByMission.entries())
    .map(([missionId, missionEntries]) => {
      const mission = missionsById.get(missionId);
      if (!mission) return null;
      const unit: MissionUnit = mission.rate_unit === "hour" ? "hour" : "day";
      return {
        cra_id: craId,
        mission_id: missionId,
        company_name: mission.company_name,
        esn_partenaire: mission.esn_partenaire,
        rate: mission.rate,
        rate_unit: unit,
        quantity: missionLineQuantity(unit, missionEntries),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (!rows.length) {
    return [];
  }

  const { error: insertError } = await adminClient.from("cra_mission_lines").insert(rows);
  if (insertError) {
    throw new Error(insertError.message);
  }

  return rows;
}
