"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { TimeUnit } from "@/domain/common";
import {
  addCraEntry,
  buildWorkingDatesForMonth,
  craAbsenceTotalsByType,
  craTotalDays,
  craTotalHours,
  craTotalsByMission,
  currentMonthInputValue,
  formatCraPeriodLabel,
  groupCraEntriesByDate,
  isCraAbsenceOn,
  isSameCraSlot,
  keepCraEntriesOfMonth,
  patchCraEntries,
  removeCraEntries,
  sortCraEntries,
  type CraEntryDraft,
} from "@/domain/cra";
import type { InvoiceLineInput } from "@/features/dashboard/salarie/invoice-totals";

/** Ce que l'editeur a besoin de savoir d'une mission. Sous-ensemble de `MissionRow`. */
export type CraEditorMission = {
  id: string;
  company_name: string;
  rate: number | null;
  rate_unit: string;
};

/** Missions dans la forme attendue par le calendrier. */
export type CraEditorCalendarMission = {
  id: string;
  companyName: string;
  timeUnit: TimeUnit;
};

export type CraInvoiceSettings = {
  discountGranted: boolean;
  vatEnabled: boolean;
  amountAlreadyPaid: string;
  fraisKm: string;
  fraisRepas: string;
  fraisNuitee: string;
};

export function emptyCraInvoiceSettings(): CraInvoiceSettings {
  return {
    discountGranted: false,
    vatEnabled: false,
    amountAlreadyPaid: "",
    fraisKm: "",
    fraisRepas: "",
    fraisNuitee: "",
  };
}

/**
 * Moteur de saisie d'un CRA : etat du brouillon, calendrier, missions, absences.
 *
 * Extrait de `salarie-workspace` pour que le RH puisse editer le CRA d'un collaborateur avec
 * exactement les memes regles. C'est la raison d'etre du hook : le CRA cote RH etait une
 * copie appauvrie — pas de mission, pas d'absence, pas d'heures — parce que rien ne
 * permettait de partager cette logique. La dupliquer une fois de plus aurait reproduit
 * l'ecart au lieu de le fermer.
 *
 * Le hook ne connait ni Supabase ni les routes : il ne tient que le brouillon. Le chargement
 * des missions, l'enregistrement et la generation des PDF restent chez l'appelant, qui seul
 * sait de quel collaborateur il s'agit et par quelle route passer.
 */
export function useCraEditor({
  missions,
  fallbackTimeUnit,
  onReset,
}: {
  missions: CraEditorMission[];
  /**
   * Unite des lignes SANS mission, issue du profil de facturation. Ne sert plus qu'aux CRA
   * anterieurs au multi-entreprises.
   */
  fallbackTimeUnit: TimeUnit;
  /** Remise a zero propre a l'appelant (le salarie y deselectionne son CRA courant). */
  onReset?: () => void;
}) {
  const [craCalendarMonth, setCraCalendarMonth] = useState(currentMonthInputValue);
  const [craNotes, setCraNotes] = useState("");
  const [craEntries, setCraEntries] = useState<CraEntryDraft[]>([]);
  const [invoiceSettings, setInvoiceSettings] = useState<CraInvoiceSettings>(
    emptyCraInvoiceSettings,
  );
  const [activeMissionId, setActiveMissionId] = useState<string>("");
  /**
   * Type d'absence actif. Non vide, les clics pointent une absence au lieu d'une journee
   * travaillee — c'est le meme calendrier, on change seulement ce qu'on pose dessus.
   */
  const [activeAbsenceType, setActiveAbsenceType] = useState<string>("");

  /**
   * Un CRA couvre un seul mois : la periode est celle des jours coches, et a defaut de
   * selection celle du mois affiche.
   */
  const craPeriodMonth = useMemo(
    () => craEntries[0]?.workDate.slice(0, 7) ?? craCalendarMonth,
    [craCalendarMonth, craEntries],
  );

  /**
   * Travail et absence sont deux modes exclusifs : choisir une entreprise quitte forcement
   * le mode absence. Sans cela, la puce de l'entreprise s'allumait mais les clics
   * continuaient de poser des conges.
   */
  const selectMission = useCallback((missionId: string) => {
    setActiveAbsenceType("");
    setActiveMissionId(missionId);
  }, []);

  const selectAbsence = useCallback((absenceType: string) => {
    setActiveAbsenceType(absenceType);
  }, []);

  // La mission active suit la liste : premiere mission par defaut, et on ne reste jamais sur
  // une mission qui vient d'etre archivee.
  useEffect(() => {
    if (missions.length === 0) {
      if (activeMissionId) setActiveMissionId("");
      return;
    }
    if (!missions.some((mission) => mission.id === activeMissionId)) {
      setActiveMissionId(missions[0].id);
    }
  }, [activeMissionId, missions]);

  /** Unite d'une mission donnee, avec repli sur le profil. */
  const missionUnitOf = useCallback(
    (missionId: string): TimeUnit => {
      const mission = missions.find((item) => item.id === missionId);
      if (!mission) return fallbackTimeUnit;
      return mission.rate_unit === "hour" ? "hour" : "day";
    },
    [fallbackTimeUnit, missions],
  );

  const craTimeUnit = useMemo(
    () => missionUnitOf(activeMissionId),
    [activeMissionId, missionUnitOf],
  );

  /**
   * Une entree porte une seule quantite, celle de l'unite de sa mission : des heures, ou des
   * journees. L'autre champ reste vide — il n'y a plus de conversion entre les deux.
   */
  const buildCraEntry = useCallback(
    (workDate: string, quantity: number, missionId: string, label = ""): CraEntryDraft => {
      const isHourly = missionUnitOf(missionId) === "hour";
      return {
        workDate,
        missionId,
        absenceType: "",
        hours: isHourly ? String(quantity) : "",
        dayQuantity: isHourly ? "" : String(quantity),
        label,
      };
    },
    [missionUnitOf],
  );

  /** Une absence se compte toujours en journees, jamais en heures. */
  const buildAbsenceEntry = useCallback(
    (workDate: string, dayQuantity: number, absenceType: string, label = ""): CraEntryDraft => ({
      workDate,
      missionId: "",
      absenceType,
      hours: "",
      dayQuantity: String(dayQuantity),
      label,
    }),
    [],
  );

  /** Quantite proposee au premier clic sur un jour. */
  const defaultQuantityFor = useCallback(
    (missionId: string) => {
      if (missionUnitOf(missionId) !== "hour") return 1;
      const lastHours = [...craEntries]
        .reverse()
        .find((entry) => entry.missionId === missionId && Number(entry.hours) > 0);
      return lastHours ? Number(lastHours.hours) : 1;
    },
    [craEntries, missionUnitOf],
  );

  const resetCraEditor = useCallback(() => {
    setCraCalendarMonth(currentMonthInputValue());
    setCraNotes("");
    setCraEntries([]);
    setInvoiceSettings(emptyCraInvoiceSettings());
    onReset?.();
  }, [onReset]);

  // La navigation du calendrier ne touche pas aux jours coches : les selections d'un autre
  // mois sont conservees au lieu d'etre silencieusement supprimees.
  const handleCraCalendarMonthChange = useCallback((nextCalendarMonth: string) => {
    setCraCalendarMonth(nextCalendarMonth);
  }, []);

  /**
   * Un CRA couvre un seul mois. Avant d'ajouter un jour hors du mois deja saisi, on demande
   * confirmation puis on remplace la selection. Renvoie false en cas de refus.
   */
  const confirmCraMonthSwitch = useCallback(
    (targetMonth: string) => {
      const currentMonth = craEntries[0]?.workDate.slice(0, 7);
      if (!currentMonth || currentMonth === targetMonth) {
        return true;
      }

      return window.confirm(
        `Un CRA couvre un seul mois. Remplacer la selection de ${formatCraPeriodLabel(currentMonth)} par ${formatCraPeriodLabel(targetMonth)} ?`,
      );
    },
    [craEntries],
  );

  /**
   * Mode journee : un clic fait defiler la quantite, non coche -> 1 jour -> 1/2 journee ->
   * retire.
   * Mode horaire : un clic coche a la base contractuelle. Le second clic n'enchaine pas sur
   * la demi-journee, c'est le calendrier qui ouvre son editeur d'heures.
   */
  const cycleCraWorkDate = useCallback(
    (workDate: string, missionId: string = activeMissionId) => {
      // Mode absence : le cycle est plus simple — non pointe -> 1 j -> 1/2 j -> retire.
      if (activeAbsenceType) {
        const isAbsence = (entry: CraEntryDraft) => isCraAbsenceOn(entry, workDate);
        const existingAbsence = craEntries.find(isAbsence);

        if (!existingAbsence) {
          if (!confirmCraMonthSwitch(workDate.slice(0, 7))) return;
          setCraEntries((previousEntries) =>
            addCraEntry(
              keepCraEntriesOfMonth(previousEntries, workDate.slice(0, 7)),
              buildAbsenceEntry(workDate, 1, activeAbsenceType),
            ),
          );
          return;
        }

        // Un autre type d'absence sur ce jour : on remplace, une seule absence par jour.
        if (existingAbsence.absenceType !== activeAbsenceType) {
          setCraEntries((previousEntries) =>
            patchCraEntries(previousEntries, isAbsence, { absenceType: activeAbsenceType }),
          );
          return;
        }

        if (Number(existingAbsence.dayQuantity) === 1) {
          setCraEntries((previousEntries) =>
            patchCraEntries(previousEntries, isAbsence, { dayQuantity: "0.5" }),
          );
          return;
        }

        setCraEntries((previousEntries) => removeCraEntries(previousEntries, isAbsence));
        return;
      }

      const timeUnit = missionUnitOf(missionId);
      const isSlot = (entry: CraEntryDraft) => isSameCraSlot(entry, workDate, missionId);
      const existingEntry = craEntries.find(isSlot);

      if (!existingEntry) {
        if (!confirmCraMonthSwitch(workDate.slice(0, 7))) return;
        const quantity = defaultQuantityFor(missionId);
        setCraEntries((previousEntries) =>
          addCraEntry(
            keepCraEntriesOfMonth(previousEntries, workDate.slice(0, 7)),
            buildCraEntry(workDate, quantity, missionId),
          ),
        );
        return;
      }

      if (timeUnit === "hour") return;

      if (Number(existingEntry.dayQuantity) === 1) {
        setCraEntries((previousEntries) =>
          patchCraEntries(previousEntries, isSlot, { dayQuantity: "0.5" }),
        );
        return;
      }

      setCraEntries((previousEntries) => removeCraEntries(previousEntries, isSlot));
    },
    [
      activeAbsenceType,
      activeMissionId,
      buildAbsenceEntry,
      buildCraEntry,
      confirmCraMonthSwitch,
      craEntries,
      defaultQuantityFor,
      missionUnitOf,
    ],
  );

  /** Saisie horaire d'un jour deja coche. La quantite de jours suit automatiquement. */
  const setCraEntryHours = useCallback(
    (workDate: string, hours: number, missionId: string = activeMissionId) => {
      if (!Number.isFinite(hours) || hours <= 0) return;
      const cappedHours = Math.min(24, hours);
      setCraEntries((previousEntries) => {
        const isSlot = (entry: CraEntryDraft) => isSameCraSlot(entry, workDate, missionId);
        // Saisir des heures sur une journee non cochee pour cette entreprise l'ajoute :
        // c'est ainsi qu'on repartit une journee entre plusieurs entreprises.
        if (!previousEntries.some(isSlot)) {
          return addCraEntry(previousEntries, buildCraEntry(workDate, cappedHours, missionId));
        }
        return patchCraEntries(previousEntries, isSlot, {
          hours: String(cappedHours),
          dayQuantity: "",
        });
      });
    },
    [activeMissionId, buildCraEntry],
  );

  /** Saisie en jours d'une entreprise sur une date, meme si elle n'y figure pas encore. */
  const setCraEntryDayQuantity = useCallback(
    (workDate: string, dayQuantity: number, missionId: string = activeMissionId) => {
      const isSlot = (entry: CraEntryDraft) => isSameCraSlot(entry, workDate, missionId);

      // Une quantite nulle ou negative vaut « retirer la ligne ».
      if (!Number.isFinite(dayQuantity) || dayQuantity <= 0) {
        setCraEntries((previousEntries) => removeCraEntries(previousEntries, isSlot));
        return;
      }

      const capped = Math.min(1, dayQuantity);
      setCraEntries((previousEntries) => {
        if (!previousEntries.some(isSlot)) {
          return addCraEntry(previousEntries, buildCraEntry(workDate, capped, missionId));
        }
        return patchCraEntries(previousEntries, isSlot, {
          dayQuantity: String(capped),
          hours: "",
        });
      });
    },
    [activeMissionId, buildCraEntry],
  );

  /** Retire une entreprise d'une journee, ou la journee entiere si aucune n'est precisee. */
  const removeCraWorkDate = useCallback((workDate: string, missionId?: string) => {
    setCraEntries((previousEntries) =>
      removeCraEntries(previousEntries, (entry) =>
        missionId === undefined
          ? entry.workDate === workDate
          : isSameCraSlot(entry, workDate, missionId),
      ),
    );
  }, []);

  /** Applique le meme volume horaire a tous les jours coches de la mission active. */
  const applyCraHoursToAllEntries = useCallback(
    (hours: number) => {
      if (!Number.isFinite(hours) || hours <= 0) return;
      const cappedHours = Math.min(24, hours);
      setCraEntries((previousEntries) =>
        patchCraEntries(previousEntries, (entry) => entry.missionId === activeMissionId, {
          hours: String(cappedHours),
          dayQuantity: "",
        }),
      );
    },
    [activeMissionId],
  );

  const fillCraWorkingDays = useCallback(() => {
    if (!confirmCraMonthSwitch(craCalendarMonth)) return;

    const workingDates = buildWorkingDatesForMonth(craCalendarMonth);
    const quantity = defaultQuantityFor(activeMissionId);
    setCraEntries((previousEntries) => {
      // Ne concerne que la mission active : les jours des autres entreprises restent.
      const missionDates = new Set(
        previousEntries
          .filter((entry) => entry.missionId === activeMissionId)
          .map((entry) => entry.workDate),
      );
      const added = workingDates
        .filter((workDate) => !missionDates.has(workDate))
        .map((workDate) => buildCraEntry(workDate, quantity, activeMissionId));
      return sortCraEntries([...previousEntries, ...added]);
    });
  }, [
    activeMissionId,
    buildCraEntry,
    confirmCraMonthSwitch,
    craCalendarMonth,
    defaultQuantityFor,
  ]);

  const clearCraEntries = useCallback(() => {
    setCraEntries([]);
  }, []);

  const updateCraEntry = useCallback(
    (workDate: string, patch: Partial<CraEntryDraft>, missionId?: string) => {
      // `missionId` omis = toutes les lignes de la journee, toutes missions confondues.
      setCraEntries((previousEntries) =>
        patchCraEntries(
          previousEntries,
          (entry) =>
            missionId === undefined
              ? entry.workDate === workDate
              : isSameCraSlot(entry, workDate, missionId),
          patch,
        ),
      );
    },
    [],
  );

  // --- Valeurs derivees -----------------------------------------------------------------

  const craEntriesByDate = useMemo(() => groupCraEntriesByDate(craEntries), [craEntries]);
  const craDraftTotalHours = useMemo(() => craTotalHours(craEntries), [craEntries]);
  const craDraftTotalDays = useMemo(
    () => craTotalDays(craEntries, missionUnitOf),
    [craEntries, missionUnitOf],
  );
  const craAbsenceTotals = useMemo(() => craAbsenceTotalsByType(craEntries), [craEntries]);
  const totalsByMission = useMemo(
    () => craTotalsByMission(craEntries, missionUnitOf),
    [craEntries, missionUnitOf],
  );

  const craMissions = useMemo<CraEditorCalendarMission[]>(
    () =>
      missions.map((mission) => ({
        id: mission.id,
        companyName: mission.company_name,
        timeUnit: missionUnitOf(mission.id),
      })),
    [missionUnitOf, missions],
  );

  /**
   * Lignes de la facture : une par entreprise saisie, avec sa quantite dans son unite et son
   * propre tarif. C'est ce decoupage qui permet de facturer une entreprise a l'heure et une
   * autre au jour sur la meme facture.
   */
  const craInvoiceLines = useMemo<InvoiceLineInput[]>(
    () =>
      Array.from(totalsByMission.entries())
        .map(([missionId, total]) => {
          const mission = missions.find((item) => item.id === missionId);
          return {
            missionId,
            label: mission?.company_name ?? "Sans entreprise",
            quantity: total.quantity,
            rate: Number(mission?.rate ?? 0),
            unit: total.unit,
          };
        })
        .filter((line) => line.quantity > 0),
    [missions, totalsByMission],
  );

  return {
    // etat
    craCalendarMonth,
    craNotes,
    setCraNotes,
    craEntries,
    setCraEntries,
    invoiceSettings,
    setInvoiceSettings,
    activeMissionId,
    activeAbsenceType,
    craPeriodMonth,
    craTimeUnit,
    /** Expose pour l'enregistrement : l'appelant doit connaitre l'unite de chaque ligne. */
    missionUnitOf,
    // derives
    craEntriesByDate,
    craDraftTotalDays,
    craDraftTotalHours,
    craAbsenceTotals,
    craMissions,
    craInvoiceLines,
    // actions
    selectMission,
    selectAbsence,
    resetCraEditor,
    handleCraCalendarMonthChange,
    cycleCraWorkDate,
    setCraEntryHours,
    setCraEntryDayQuantity,
    removeCraWorkDate,
    applyCraHoursToAllEntries,
    fillCraWorkingDays,
    clearCraEntries,
    updateCraEntry,
    // outils exposes pour le chargement d'un CRA existant par l'appelant
    buildCraEntry,
    buildAbsenceEntry,
    setCraCalendarMonth,
  };
}
