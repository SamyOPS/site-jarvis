"use client";

import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { TimeUnit } from "@/domain/common";
import { useDismissable } from "@/hooks/use-dismissable";
import { craEntryHours, formatCraHours, formatCraPeriodLabel } from "@/domain/cra";
import { getFrenchHolidayName } from "@/domain/holidays";
import type { CraCalendarCell, CraEntryDraft, CraTimeSlotDraft } from "@/domain/cra";
import { cn } from "@/lib/utils";
import { DayDetails } from "@/components/dashboard/salarie/cra/day-details";

/** Entreprise selectionnable dans le calendrier. */
export type CalendarMission = {
  id: string;
  companyName: string;
  timeUnit: TimeUnit;
};

/**
 * Couleurs des entreprises, dans l'ordre de la liste. La premiere reprend exactement le
 * bleu historique : un consultant mono-entreprise ne voit donc aucun changement.
 * La couleur n'est jamais seule porteuse d'information — le popover nomme les entreprises.
 */
const MISSION_COLORS = [
  { bg: "bg-[#2aa0dd]", border: "border-[#2aa0dd]" },
  { bg: "bg-[#f59e0b]", border: "border-[#f59e0b]" },
  { bg: "bg-[#10b981]", border: "border-[#10b981]" },
  { bg: "bg-[#8b5cf6]", border: "border-[#8b5cf6]" },
  { bg: "bg-[#ef4444]", border: "border-[#ef4444]" },
  { bg: "bg-[#0ea5e9]", border: "border-[#0ea5e9]" },
];

/** Les absences se distinguent des clients : teintes neutres, jamais une couleur de mission. */
const ABSENCE_COLORS: Record<string, { bg: string; border: string }> = {
  paid: { bg: "bg-[#64748b]", border: "border-[#64748b]" },
  sick: { bg: "bg-[#b45309]", border: "border-[#b45309]" },
  exceptional: { bg: "bg-[#7c3aed]", border: "border-[#7c3aed]" },
  unpaid: { bg: "bg-[#475569]", border: "border-[#475569]" },
};

export function missionColor(
  missions: CalendarMission[],
  missionId: string,
  absenceType?: string | null,
) {
  if (absenceType) {
    return ABSENCE_COLORS[absenceType] ?? ABSENCE_COLORS.paid;
  }
  const index = missions.findIndex((mission) => mission.id === missionId);
  return MISSION_COLORS[(index < 0 ? 0 : index) % MISSION_COLORS.length];
}

type WorkDaysCalendarProps = {
  calendarMonth: string;
  periodMonth: string;
  onCalendarMonthChange: (value: string) => void;
  shiftMonthInputValue: (value: string, offset: number) => string;
  weekdayLabels: string[];
  calendarCells: CraCalendarCell[];
  entries: CraEntryDraft[];
  /** Une date peut porter plusieurs entreprises. */
  entriesByDate: Map<string, CraEntryDraft[]>;
  totalDays: number;
  onCycleWorkDate: (workDate: string, missionId?: string) => void;
  onFillWorkingDays: () => void;
  onClearEntries: () => void;
  onUpdateEntry: (
    workDate: string,
    patch: { dayQuantity?: string; label?: string },
    missionId?: string,
  ) => void;
  formatEntryDateLabel: (value: string) => string;
  /** Montant HT de la prestation, affiche a cote du total de jours quand un TJM est connu. */
  serviceAmountLabel?: string | null;
  /** "day" (defaut historique) ou "hour". Unite de la mission active. */
  timeUnit?: TimeUnit;
  totalHours?: number;
  onSetEntryHours?: (workDate: string, hours: number, missionId?: string) => void;
  /** Creneaux d'une journee horaire. Absent : pas de detail horaire (saisie historique). */
  onSetEntryTimeSlots?: (workDate: string, missionId: string, timeSlots: CraTimeSlotDraft[]) => void;
  onSetEntryDayQuantity?: (workDate: string, dayQuantity: number, missionId?: string) => void;
  onRemoveWorkDate?: (workDate: string, missionId?: string) => void;
  onApplyHoursToAllEntries?: (hours: number) => void;
  /** Entreprises du collaborateur. Vide = comportement mono-entreprise historique. */
  missions?: CalendarMission[];
  activeMissionId?: string;
  onSelectMission?: (missionId: string) => void;
  /** Types d'absence pointables sur le calendrier. */
  absenceTypes?: readonly { value: string; label: string }[];
  activeAbsenceType?: string;
  onSelectAbsence?: (absenceType: string) => void;
  /** Totaux d'absence par type, affiches sur les puces. */
  absenceTotals?: Map<string, number>;
};

export function WorkDaysCalendar({
  calendarMonth,
  periodMonth,
  onCalendarMonthChange,
  shiftMonthInputValue,
  weekdayLabels,
  calendarCells,
  entries,
  entriesByDate,
  totalDays,
  onCycleWorkDate,
  onFillWorkingDays,
  onClearEntries,
  onUpdateEntry,
  formatEntryDateLabel,
  serviceAmountLabel,
  timeUnit = "day",
  totalHours = 0,
  onSetEntryHours,
  onSetEntryTimeSlots,
  onSetEntryDayQuantity,
  onRemoveWorkDate,
  onApplyHoursToAllEntries,
  missions = [],
  activeMissionId = "",
  onSelectMission,
  absenceTypes = [],
  activeAbsenceType = "",
  onSelectAbsence,
  absenceTotals,
}: WorkDaysCalendarProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  // Un seul editeur ouvert a la fois : la grille reste lisible.
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const editorRef = useDismissable<HTMLDivElement>(Boolean(editingDate), () =>
    setEditingDate(null),
  );
  const isHourly = timeUnit === "hour";
  // Le popover de repartition ne sert que s'il y a plusieurs entreprises a departager.
  const isMultiMission = missions.length > 1;

  // Journees deja detaillees : commentaire ou creneaux.
  const detailedEntries = entries.filter((entry) => entry.label.trim() || entry.timeSlots.length);
  // La periode saisie peut differer du mois affiche : on le signale plutot que de
  // supprimer silencieusement les jours coches en naviguant.
  const isViewingOtherMonth = entries.length > 0 && periodMonth !== calendarMonth;

  return (
    <div className="rounded-app-card border border-app-line bg-app-surface">
      <div className="flex flex-col gap-3 border-b border-app-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onCalendarMonthChange(shiftMonthInputValue(calendarMonth, -1))}
            aria-label="Mois precedent"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[9.5rem] text-center text-app-sm font-semibold capitalize text-app-text">
            {formatCraPeriodLabel(calendarMonth)}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onCalendarMonthChange(shiftMonthInputValue(calendarMonth, 1))}
            aria-label="Mois suivant"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isHourly ? (
            // Pas d'equivalent en jours ici : il tomberait sur des decimales peu
            // parlantes. Il reste affiche dans le recapitulatif de la facture, seul
            // endroit ou il sert.
            <span className="text-app-sm font-semibold text-app-text">
              {formatCraHours(totalHours)}
            </span>
          ) : (
            <span className="text-app-sm font-semibold text-app-text">
              {totalDays.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} jour
              {totalDays > 1 ? "s" : ""}
            </span>
          )}
          {serviceAmountLabel ? (
            <span className="text-app-sm text-app-text-muted">· {serviceAmountLabel} HT</span>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={onFillWorkingDays}>
            Tous les jours ouvres
          </Button>
          {isHourly && entries.length && onApplyHoursToAllEntries ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const answer = window.prompt(
                  "Appliquer combien d'heures a chaque jour coche ?",
                  String(totalHours > 0 && entries.length ? totalHours / entries.length : 7),
                );
                if (answer === null) return;
                const parsed = Number(answer.replace(",", "."));
                if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 24) return;
                onApplyHoursToAllEntries(parsed);
              }}
            >
              Appliquer a tous
            </Button>
          ) : null}
          {entries.length ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-app-text-muted"
              onClick={onClearEntries}
            >
              Vider
            </Button>
          ) : null}
        </div>
      </div>

      {isViewingOtherMonth ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-pending-line bg-pending-soft px-4 py-2 text-app-xs text-pending">
          <span>
            {entries.length} jour{entries.length > 1 ? "s" : ""} coche
            {entries.length > 1 ? "s" : ""} en {formatCraPeriodLabel(periodMonth)}. Le document
            portera sur ce mois.
          </span>
          <button
            type="button"
            onClick={() => onCalendarMonthChange(periodMonth)}
            className="font-semibold underline"
          >
            Y revenir
          </button>
        </div>
      ) : null}

      <div className="p-4">
        <div className="mb-2 grid grid-cols-7 gap-1 sm:gap-2">
          {weekdayLabels.map((label) => (
            <div
              key={label}
              className="px-1 text-center text-app-xs font-medium uppercase tracking-wide text-app-text-muted"
            >
              {label}
            </div>
          ))}
        </div>
        {/* Ce que pose le prochain clic : une entreprise, ou une absence. La barre des
            entreprises n'apparait qu'a partir de deux, pour qu'un consultant
            mono-entreprise retrouve son ecran d'avant. */}
        {isMultiMission || absenceTypes.length ? (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-app-xs text-app-text-muted">Pointer :</span>

            {(isMultiMission ? missions : []).map((mission) => {
              const color = missionColor(missions, mission.id);
              const isActive = !activeAbsenceType && mission.id === activeMissionId;
              return (
                <button
                  key={mission.id}
                  type="button"
                  onClick={() => onSelectMission?.(mission.id)}
                  aria-pressed={isActive}
                  className={cn(
                    "flex items-center gap-2 rounded-app-control border px-3 py-1 text-app-xs transition",
                    isActive
                      ? `${color.border} bg-app-surface-hover font-semibold text-app-text`
                      : "border-app-line text-app-text-secondary hover:border-app-line-strong hover:text-app-text",
                  )}
                >
                  <span className={cn("h-2.5 w-2.5 rounded-sm", color.bg)} />
                  <span className="max-w-[10rem] truncate">{mission.companyName}</span>
                  <span className="text-app-xs text-app-text-muted">
                    {mission.timeUnit === "hour" ? "h" : "j"}
                  </span>
                </button>
              );
            })}

            {/* Un consultant mono-entreprise n'a pas de puce client : il lui en faut une
                pour revenir au travail apres avoir pointe une absence. */}
            {!isMultiMission && absenceTypes.length ? (
              <button
                type="button"
                onClick={() => onSelectAbsence?.("")}
                aria-pressed={!activeAbsenceType}
                className={cn(
                  "flex items-center gap-2 rounded-app-control border px-3 py-1 text-app-xs transition",
                  !activeAbsenceType
                    ? "border-[#2aa0dd] bg-app-surface-hover font-semibold text-app-text"
                    : "border-app-line text-app-text-secondary hover:border-app-line-strong hover:text-app-text",
                )}
              >
                <span className="h-2.5 w-2.5 rounded-sm bg-[#2aa0dd]" />
                <span>Travail</span>
              </button>
            ) : null}

            {absenceTypes.map((absence) => {
              const color = missionColor(missions, "", absence.value);
              const isActive = activeAbsenceType === absence.value;
              const total = absenceTotals?.get(absence.value) ?? 0;
              return (
                <button
                  key={absence.value}
                  type="button"
                  onClick={() => onSelectAbsence?.(isActive ? "" : absence.value)}
                  aria-pressed={isActive}
                  className={cn(
                    "flex items-center gap-2 rounded-app-control border px-3 py-1 text-app-xs transition",
                    isActive
                      ? `${color.border} bg-app-surface-hover font-semibold text-app-text`
                      : "border-app-line text-app-text-secondary hover:border-app-line-strong hover:text-app-text",
                  )}
                >
                  <span className={cn("h-2.5 w-2.5 rounded-sm", color.bg)} />
                  <span>{absence.label}</span>
                  {total > 0 ? (
                    <span className="text-app-xs text-app-text-muted">
                      {total.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} j
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarCells.map((cell, index) => {
            const { isoDate, dayNumber } = cell;

            if (!isoDate || !dayNumber) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const parsedDate = new Date(`${isoDate}T00:00:00`);
            const isWeekend = [0, 6].includes(parsedDate.getDay());
            const holidayName = getFrenchHolidayName(isoDate);
            const isDimmed = isWeekend || Boolean(holidayName);
            const dayEntries = entriesByDate.get(isoDate) ?? [];
            // En mode absence, c'est l'absence du jour qui pilote l'affichage de la case.
            const entry = activeAbsenceType
              ? (dayEntries.find((item) => item.absenceType) ?? dayEntries[0])
              : (dayEntries.find((item) => item.missionId === activeMissionId) ?? dayEntries[0]);
            const hasEntries = dayEntries.length > 0;
            const isHalfDay =
              !isHourly && dayEntries.length === 1 && entry
                ? Number(entry.dayQuantity) === 0.5
                : false;
            const entryHours = entry ? craEntryHours(entry) : 0;
            // Total de la journee toutes entreprises confondues, en equivalent jour.
            const dayTotal = dayEntries.reduce(
              (total, item) => total + (Number(item.dayQuantity) || 0),
              0,
            );
            const isEditing = editingDate === isoDate && (isHourly || isMultiMission);

            return (
              <div key={isoDate} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    // Mode absence : le clic enchaine toujours le cycle 1 j -> 1/2 j ->
                    // retire, l'editeur de repartition ne concerne que le travail.
                    if (activeAbsenceType) {
                      onCycleWorkDate(isoDate);
                      return;
                    }
                    // Mode horaire ou plusieurs entreprises : le second clic ouvre
                    // l'editeur au lieu d'enchainer sur la demi-journee.
                    if ((isHourly || isMultiMission) && hasEntries) {
                      setEditingDate((current) => (current === isoDate ? null : isoDate));
                      return;
                    }
                    onCycleWorkDate(isoDate, activeMissionId || undefined);
                  }}
                  title={
                    holidayName ??
                    (hasEntries
                      ? isMultiMission
                        ? "Cliquer pour repartir la journee entre les entreprises"
                        : isHourly
                          ? "Cliquer pour modifier les heures"
                          : "Cliquer pour passer en demi-journee"
                      : undefined)
                  }
                  className={cn(
                    "relative aspect-square w-full overflow-hidden rounded-app-control border transition-colors",
                    isHourly ? "text-app-xs" : "text-app-sm",
                    hasEntries
                      ? "font-semibold text-white"
                      : isDimmed
                        ? "border-transparent bg-app-surface-hover text-app-text-muted hover:bg-app-line"
                        : "border-app-line bg-app-field text-app-text hover:border-app-accent/50 hover:bg-app-surface-hover",
                    hasEntries
                      ? missionColor(missions, entry?.missionId ?? "", entry?.absenceType).border
                      : "",
                    isEditing ? "ring-2 ring-app-accent/60 ring-offset-1 ring-offset-app-surface" : "",
                  )}
                  aria-pressed={hasEntries}
                >
                  {/* Bandes proportionnelles : une entreprise occupe toute la case, deux
                      demi-journees la partagent en deux. */}
                  {hasEntries ? (
                    <span className="absolute inset-0 flex" aria-hidden="true">
                      {dayEntries.map((item) => (
                        <span
                          key={item.absenceType || item.missionId || "sans-mission"}
                          style={{ flexGrow: Number(item.dayQuantity) || 0.5 }}
                          className={missionColor(missions, item.missionId, item.absenceType).bg}
                        />
                      ))}
                    </span>
                  ) : null}

                  <span className="relative">
                    {isHourly && entry && dayEntries.length === 1 ? (
                      <span className="flex h-full flex-col items-center justify-center leading-tight">
                        <span className="text-app-2xs font-normal opacity-80">{dayNumber}</span>
                        <span className="font-semibold">
                          {entryHours.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}h
                        </span>
                      </span>
                    ) : (
                      dayNumber
                    )}
                  </span>

                  {isHalfDay ? (
                    <span className="absolute bottom-0.5 right-1 text-app-2xs font-semibold leading-none">
                      ½
                    </span>
                  ) : null}
                  {dayEntries.length > 1 ? (
                    <span className="absolute bottom-0.5 right-1 text-[9px] font-semibold leading-none">
                      {dayTotal.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} j
                    </span>
                  ) : null}
                  {dayEntries.some((item) => item.label.trim() || item.timeSlots.length) ? (
                    <span className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-white/90" />
                  ) : null}
                </button>

                {isEditing && isMultiMission ? (
                  <div
                    ref={editorRef}
                    className="absolute left-1/2 top-full z-30 mt-1 w-72 -translate-x-1/2 rounded-app-card border border-app-line bg-app-raised p-3 shadow-app-raised"
                  >
                    <div className="mb-2 flex items-baseline justify-between gap-2">
                      <p className="text-app-xs capitalize text-app-text-muted">
                        {formatEntryDateLabel(isoDate)}
                      </p>
                      <p
                        className={cn(
                          "text-app-xs font-semibold",
                          dayTotal > 1 ? "text-pending" : "text-app-text-muted",
                        )}
                      >
                        total {dayTotal.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} j
                      </p>
                    </div>

                    {/* Une ligne par entreprise, y compris celles non encore saisies :
                        c'est ainsi qu'on ajoute une seconde entreprise a la journee. */}
                    <ul className="space-y-2">
                      {missions.map((mission) => {
                        const missionEntry = dayEntries.find(
                          (item) => item.missionId === mission.id,
                        );
                        const missionHours = missionEntry
                          ? craEntryHours(missionEntry)
                          : 0;
                        const color = missionColor(missions, mission.id);

                        return (
                          <li key={mission.id} className="flex items-center gap-2">
                            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-sm", color.bg)} />
                            <span className="min-w-0 flex-1 truncate text-app-xs text-app-text">
                              {mission.companyName}
                            </span>
                            {mission.timeUnit === "hour" ? (
                              <input
                                type="number"
                                min="0"
                                max="24"
                                step="0.5"
                                value={missionEntry ? missionHours : ""}
                                placeholder="0"
                                // Detaillee en creneaux, la ligne tire ses heures des creneaux.
                                disabled={Boolean(missionEntry?.timeSlots.length)}
                                title={
                                  missionEntry?.timeSlots.length
                                    ? "Heures calculees depuis les creneaux"
                                    : undefined
                                }
                                onChange={(event) => {
                                  const parsed = Number(event.target.value);
                                  if (!event.target.value.trim() || parsed <= 0) {
                                    onRemoveWorkDate?.(isoDate, mission.id);
                                    return;
                                  }
                                  onSetEntryHours?.(isoDate, parsed, mission.id);
                                }}
                                onWheel={(event) => event.currentTarget.blur()}
                                className="h-7 w-16 rounded-app-control border border-app-line bg-app-field text-app-text placeholder:text-app-text-muted focus-visible:outline-app px-2 text-center text-app-xs"
                                aria-label={`Heures chez ${mission.companyName}`}
                              />
                            ) : (
                              <select
                                value={missionEntry?.dayQuantity ?? "0"}
                                onChange={(event) =>
                                  onSetEntryDayQuantity?.(
                                    isoDate,
                                    Number(event.target.value),
                                    mission.id,
                                  )
                                }
                                className="h-7 w-16 rounded-app-control border border-app-line bg-app-field text-app-text placeholder:text-app-text-muted focus-visible:outline-app px-1 text-center text-app-xs"
                                aria-label={`Journee chez ${mission.companyName}`}
                              >
                                <option value="0">—</option>
                                <option value="0.5">½ j</option>
                                <option value="1">1 j</option>
                              </select>
                            )}
                            <span className="w-3 text-app-xs text-app-text-muted">
                              {mission.timeUnit === "hour" ? "h" : ""}
                            </span>
                          </li>
                        );
                      })}
                    </ul>

                    <button
                      type="button"
                      onClick={() => {
                        onRemoveWorkDate?.(isoDate);
                        setEditingDate(null);
                      }}
                      className="mt-2 w-full rounded-app-control px-2 py-1 text-app-xs text-rejected transition hover:bg-rejected-soft"
                    >
                      Retirer ce jour
                    </button>
                  </div>
                ) : null}

                {isEditing && !isMultiMission && entry ? (
                  <div
                    ref={editorRef}
                    className="absolute left-1/2 top-full z-30 mt-1 w-44 -translate-x-1/2 rounded-app-card border border-app-line bg-app-raised p-2 shadow-app-raised"
                  >
                    <p className="mb-2 px-1 text-app-xs capitalize text-app-text-muted">
                      {formatEntryDateLabel(isoDate)}
                    </p>
                    {entry.timeSlots.length ? (
                      <div className="space-y-2 px-1">
                        <p className="text-app-sm font-semibold text-app-text">
                          {formatCraHours(entryHours)}
                        </p>
                        <p className="text-app-xs text-app-text-muted">
                          Calcule depuis {entry.timeSlots.length} creneau
                          {entry.timeSlots.length > 1 ? "x" : ""}.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setCommentsOpen(true);
                            setEditingDate(null);
                          }}
                          className="text-app-xs font-medium text-app-accent-fg underline"
                        >
                          Modifier le detail
                        </button>
                      </div>
                    ) : (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => onSetEntryHours?.(isoDate, entryHours - 0.5)}
                        disabled={entryHours <= 0.5}
                        aria-label="Retirer une demi-heure"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <input
                        type="number"
                        min="0.5"
                        max="24"
                        step="0.5"
                        value={entry.hours || String(entryHours)}
                        onChange={(event) => {
                          const parsed = Number(event.target.value);
                          if (Number.isFinite(parsed) && parsed > 0) {
                            onSetEntryHours?.(isoDate, parsed);
                          }
                        }}
                        onWheel={(event) => event.currentTarget.blur()}
                        className="h-8 w-full rounded-app-control border border-app-line bg-app-field text-app-text placeholder:text-app-text-muted focus-visible:outline-app px-2 text-center text-app-sm"
                        autoFocus
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => onSetEntryHours?.(isoDate, entryHours + 0.5)}
                        disabled={entryHours >= 24}
                        aria-label="Ajouter une demi-heure"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        onRemoveWorkDate?.(isoDate);
                        setEditingDate(null);
                      }}
                      className="mt-2 w-full rounded-app-control px-2 py-1 text-app-xs text-rejected transition hover:bg-rejected-soft"
                    >
                      Retirer ce jour
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-app-xs text-app-text-muted">
          {isHourly
            ? "Un clic coche le jour, un second ouvre la saisie des heures."
            : "Un clic coche une journee, un second la passe en demi-journee, un troisieme la retire."}
        </p>
      </div>

      <div className="border-t border-app-line">
        <button
          type="button"
          onClick={() => setCommentsOpen((open) => !open)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-app-sm font-medium text-app-text transition hover:bg-app-surface-hover"
          aria-expanded={commentsOpen}
        >
          <span>
            Detail des journees
            {detailedEntries.length ? (
              <span className="ml-2 rounded-app-control bg-app-accent-soft px-2 py-1 text-app-xs font-semibold text-app-accent-fg">
                {detailedEntries.length}
              </span>
            ) : (
              <span className="ml-2 text-app-xs font-normal text-app-text-muted">
                commentaires et creneaux horaires
              </span>
            )}
          </span>
          <ChevronDown
            className={cn("h-4 w-4 transition", commentsOpen ? "rotate-180" : "")}
          />
        </button>

        {commentsOpen ? (
          <div className="space-y-3 px-4 pb-4">
            <p className="text-app-xs text-app-text-muted">
              Chaque journee figure dans le detail du PDF. Pour une mission facturee a l&apos;heure,
              decris ta journee en creneaux : les heures sont calculees a partir d&apos;eux.
            </p>
            <DayDetails
              entries={entries}
              missions={missions}
              colorOf={(missionId, absenceType) => missionColor(missions, missionId, absenceType)}
              formatEntryDateLabel={formatEntryDateLabel}
              onUpdateEntry={onUpdateEntry}
              onSetEntryTimeSlots={onSetEntryTimeSlots}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
