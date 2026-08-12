"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { craEntryHours, formatCraHours, formatCraPeriodLabel } from "@/features/dashboard/salarie/cra";
import { getFrenchHolidayName } from "@/features/dashboard/salarie/holidays";
import type {
  CraCalendarCell,
  CraEntryDraft,
  CraTimeUnit,
} from "@/features/dashboard/salarie/types";
import { cn } from "@/lib/utils";

/** Entreprise selectionnable dans le calendrier. */
export type CalendarMission = {
  id: string;
  companyName: string;
  timeUnit: CraTimeUnit;
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

export function missionColor(missions: CalendarMission[], missionId: string) {
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
  timeUnit?: CraTimeUnit;
  totalHours?: number;
  onSetEntryHours?: (workDate: string, hours: number, missionId?: string) => void;
  onSetEntryDayQuantity?: (workDate: string, dayQuantity: number, missionId?: string) => void;
  onRemoveWorkDate?: (workDate: string, missionId?: string) => void;
  onApplyHoursToAllEntries?: (hours: number) => void;
  /** Entreprises du collaborateur. Vide = comportement mono-entreprise historique. */
  missions?: CalendarMission[];
  activeMissionId?: string;
  onSelectMission?: (missionId: string) => void;
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
  onSetEntryDayQuantity,
  onRemoveWorkDate,
  onApplyHoursToAllEntries,
  missions = [],
  activeMissionId = "",
  onSelectMission,
}: WorkDaysCalendarProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [pendingCommentDate, setPendingCommentDate] = useState("");
  // Un seul editeur ouvert a la fois : la grille reste lisible.
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const isHourly = timeUnit === "hour";
  // Le popover de repartition ne sert que s'il y a plusieurs entreprises a departager.
  const isMultiMission = missions.length > 1;

  useEffect(() => {
    if (!editingDate) return;

    const closeOnOutside = (event: MouseEvent) => {
      if (!editorRef.current?.contains(event.target as Node)) setEditingDate(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEditingDate(null);
    };

    window.addEventListener("mousedown", closeOnOutside);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("mousedown", closeOnOutside);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [editingDate]);

  const commentedEntries = entries.filter((entry) => entry.label.trim());
  const commentableEntries = entries.filter((entry) => !entry.label.trim());
  // La periode saisie peut differer du mois affiche : on le signale plutot que de
  // supprimer silencieusement les jours coches en naviguant.
  const isViewingOtherMonth = entries.length > 0 && periodMonth !== calendarMonth;

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
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
          <span className="min-w-[9.5rem] text-center text-sm font-semibold capitalize text-[#0A1A2F]">
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
            <span className="text-sm font-semibold text-[#0A1A2F]">
              {formatCraHours(totalHours)}
            </span>
          ) : (
            <span className="text-sm font-semibold text-[#0A1A2F]">
              {totalDays.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} jour
              {totalDays > 1 ? "s" : ""}
            </span>
          )}
          {serviceAmountLabel ? (
            <span className="text-sm text-[#0A1A2F]/60">· {serviceAmountLabel} HT</span>
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
              className="text-[#0A1A2F]/60"
              onClick={onClearEntries}
            >
              Vider
            </Button>
          ) : null}
        </div>
      </div>

      {isViewingOtherMonth ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-900">
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
              className="px-1 text-center text-xs font-medium uppercase tracking-wide text-[#0A1A2F]/45"
            >
              {label}
            </div>
          ))}
        </div>
        {/* Barre des entreprises : n'apparait qu'a partir de deux, pour qu'un consultant
            mono-entreprise retrouve exactement l'ecran d'avant. */}
        {isMultiMission ? (
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-[#0A1A2F]/55">Saisir pour :</span>
            {missions.map((mission) => {
              const color = missionColor(missions, mission.id);
              const isActive = mission.id === activeMissionId;
              return (
                <button
                  key={mission.id}
                  type="button"
                  onClick={() => onSelectMission?.(mission.id)}
                  aria-pressed={isActive}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition",
                    isActive
                      ? `${color.border} bg-slate-50 font-semibold text-[#0A1A2F]`
                      : "border-slate-200 text-[#0A1A2F]/65 hover:border-slate-300",
                  )}
                >
                  <span className={cn("h-2.5 w-2.5 rounded-sm", color.bg)} />
                  <span className="max-w-[10rem] truncate">{mission.companyName}</span>
                  <span className="text-[10px] text-[#0A1A2F]/45">
                    {mission.timeUnit === "hour" ? "h" : "j"}
                  </span>
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
            const entry =
              dayEntries.find((item) => item.missionId === activeMissionId) ?? dayEntries[0];
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
                    "relative aspect-square w-full overflow-hidden rounded-lg border transition-colors",
                    isHourly ? "text-xs" : "text-sm",
                    hasEntries
                      ? "font-semibold text-white"
                      : isDimmed
                        ? "border-transparent bg-slate-100 text-slate-400 hover:bg-slate-200"
                        : "border-slate-200 bg-white text-[#0A1A2F] hover:border-[#2aa0dd]/40 hover:bg-slate-50",
                    hasEntries ? missionColor(missions, entry?.missionId ?? "").border : "",
                    isEditing ? "ring-2 ring-[#2aa0dd]/40 ring-offset-1" : "",
                  )}
                  aria-pressed={hasEntries}
                >
                  {/* Bandes proportionnelles : une entreprise occupe toute la case, deux
                      demi-journees la partagent en deux. */}
                  {hasEntries ? (
                    <span className="absolute inset-0 flex" aria-hidden="true">
                      {dayEntries.map((item) => (
                        <span
                          key={item.missionId || "sans-mission"}
                          style={{ flexGrow: Number(item.dayQuantity) || 0.5 }}
                          className={missionColor(missions, item.missionId).bg}
                        />
                      ))}
                    </span>
                  ) : null}

                  <span className="relative">
                    {isHourly && entry && dayEntries.length === 1 ? (
                      <span className="flex h-full flex-col items-center justify-center leading-tight">
                        <span className="text-[10px] font-normal opacity-80">{dayNumber}</span>
                        <span className="font-semibold">
                          {entryHours.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}h
                        </span>
                      </span>
                    ) : (
                      dayNumber
                    )}
                  </span>

                  {isHalfDay ? (
                    <span className="absolute bottom-0.5 right-1 text-[10px] font-bold leading-none">
                      ½
                    </span>
                  ) : null}
                  {dayEntries.length > 1 ? (
                    <span className="absolute bottom-0.5 right-1 text-[9px] font-bold leading-none">
                      {dayTotal.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} j
                    </span>
                  ) : null}
                  {dayEntries.some((item) => item.label.trim()) ? (
                    <span className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-white/90" />
                  ) : null}
                </button>

                {isEditing && isMultiMission ? (
                  <div
                    ref={editorRef}
                    className="absolute left-1/2 top-full z-30 mt-1 w-72 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-lg"
                  >
                    <div className="mb-2 flex items-baseline justify-between gap-2">
                      <p className="text-[11px] capitalize text-[#0A1A2F]/60">
                        {formatEntryDateLabel(isoDate)}
                      </p>
                      <p
                        className={cn(
                          "text-[11px] font-semibold",
                          dayTotal > 1 ? "text-amber-600" : "text-[#0A1A2F]/60",
                        )}
                      >
                        total {dayTotal.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} j
                      </p>
                    </div>

                    {/* Une ligne par entreprise, y compris celles non encore saisies :
                        c'est ainsi qu'on ajoute une seconde entreprise a la journee. */}
                    <ul className="space-y-1.5">
                      {missions.map((mission) => {
                        const missionEntry = dayEntries.find(
                          (item) => item.missionId === mission.id,
                        );
                        const missionHours = missionEntry
                          ? craEntryHours(missionEntry)
                          : 0;
                        const color = missionColor(missions, mission.id);

                        return (
                          <li key={mission.id} className="flex items-center gap-1.5">
                            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-sm", color.bg)} />
                            <span className="min-w-0 flex-1 truncate text-xs text-[#0A1A2F]">
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
                                onChange={(event) => {
                                  const parsed = Number(event.target.value);
                                  if (!event.target.value.trim() || parsed <= 0) {
                                    onRemoveWorkDate?.(isoDate, mission.id);
                                    return;
                                  }
                                  onSetEntryHours?.(isoDate, parsed, mission.id);
                                }}
                                onWheel={(event) => event.currentTarget.blur()}
                                className="h-7 w-16 rounded-md border border-slate-300 px-1.5 text-center text-xs"
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
                                className="h-7 w-16 rounded-md border border-slate-300 px-1 text-center text-xs"
                                aria-label={`Journee chez ${mission.companyName}`}
                              >
                                <option value="0">—</option>
                                <option value="0.5">½ j</option>
                                <option value="1">1 j</option>
                              </select>
                            )}
                            <span className="w-3 text-[10px] text-[#0A1A2F]/45">
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
                      className="mt-2 w-full rounded-md px-2 py-1 text-xs text-red-600 transition hover:bg-red-50"
                    >
                      Retirer ce jour
                    </button>
                  </div>
                ) : null}

                {isEditing && !isMultiMission && entry ? (
                  <div
                    ref={editorRef}
                    className="absolute left-1/2 top-full z-30 mt-1 w-44 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
                  >
                    <p className="mb-1.5 px-1 text-[11px] capitalize text-[#0A1A2F]/60">
                      {formatEntryDateLabel(isoDate)}
                    </p>
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
                        className="h-8 w-full rounded-md border border-slate-300 px-2 text-center text-sm"
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
                    <button
                      type="button"
                      onClick={() => {
                        onRemoveWorkDate?.(isoDate);
                        setEditingDate(null);
                      }}
                      className="mt-1.5 w-full rounded-md px-2 py-1 text-xs text-red-600 transition hover:bg-red-50"
                    >
                      Retirer ce jour
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-[#0A1A2F]/55">
          {isHourly
            ? "Un clic coche le jour, un second ouvre la saisie des heures."
            : "Un clic coche une journee, un second la passe en demi-journee, un troisieme la retire."}
        </p>
      </div>

      <div className="border-t border-slate-100">
        <button
          type="button"
          onClick={() => setCommentsOpen((open) => !open)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-[#0A1A2F] transition hover:bg-slate-50"
          aria-expanded={commentsOpen}
        >
          <span>
            Commentaires par jour
            {commentedEntries.length ? (
              <span className="ml-2 rounded-full bg-[#2aa0dd]/12 px-2 py-0.5 text-xs font-semibold text-[#2aa0dd]">
                {commentedEntries.length}
              </span>
            ) : (
              <span className="ml-2 text-xs font-normal text-[#0A1A2F]/50">optionnel</span>
            )}
          </span>
          <ChevronDown
            className={cn("h-4 w-4 transition", commentsOpen ? "rotate-180" : "")}
          />
        </button>

        {commentsOpen ? (
          <div className="space-y-2 px-4 pb-4">
            <p className="text-xs text-[#0A1A2F]/60">
              Chaque commentaire ajoute une ligne au PDF du CRA. Laisse vide pour les journees
              ordinaires.
            </p>

            {commentedEntries.map((entry) => (
              <div key={entry.workDate} className="flex items-center gap-2">
                <span className="w-40 shrink-0 truncate text-xs capitalize text-[#0A1A2F]/70">
                  {formatEntryDateLabel(entry.workDate)}
                </span>
                <input
                  value={entry.label}
                  onChange={(event) =>
                    onUpdateEntry(entry.workDate, { label: event.target.value })
                  }
                  className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm"
                  placeholder="Mission client, intervention..."
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-[#0A1A2F]/50 hover:text-red-600"
                  onClick={() => onUpdateEntry(entry.workDate, { label: "" })}
                  aria-label={`Retirer le commentaire du ${formatEntryDateLabel(entry.workDate)}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {commentableEntries.length ? (
              <div className="flex items-center gap-2 pt-1">
                <select
                  value={pendingCommentDate}
                  onChange={(event) => setPendingCommentDate(event.target.value)}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm capitalize sm:w-auto"
                >
                  <option value="">Choisir un jour...</option>
                  {commentableEntries.map((entry) => (
                    <option key={entry.workDate} value={entry.workDate}>
                      {formatEntryDateLabel(entry.workDate)}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!pendingCommentDate}
                  onClick={() => {
                    onUpdateEntry(pendingCommentDate, { label: "Journee travaillee" });
                    setPendingCommentDate("");
                  }}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Ajouter
                </Button>
              </div>
            ) : entries.length ? (
              <p className="text-xs text-[#0A1A2F]/50">Tous les jours coches sont commentes.</p>
            ) : (
              <p className="text-xs text-[#0A1A2F]/50">Coche d&apos;abord des jours travailles.</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
