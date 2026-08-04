"use client";

import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatCraPeriodLabel } from "@/features/dashboard/salarie/cra";
import { getFrenchHolidayName } from "@/features/dashboard/salarie/holidays";
import type { CraCalendarCell, CraEntryDraft } from "@/features/dashboard/salarie/types";
import { cn } from "@/lib/utils";

type WorkDaysCalendarProps = {
  calendarMonth: string;
  periodMonth: string;
  onCalendarMonthChange: (value: string) => void;
  shiftMonthInputValue: (value: string, offset: number) => string;
  weekdayLabels: string[];
  calendarCells: CraCalendarCell[];
  entries: CraEntryDraft[];
  entriesByDate: Map<string, CraEntryDraft>;
  totalDays: number;
  onCycleWorkDate: (workDate: string) => void;
  onFillWorkingDays: () => void;
  onClearEntries: () => void;
  onUpdateEntry: (workDate: string, patch: { dayQuantity?: string; label?: string }) => void;
  formatEntryDateLabel: (value: string) => string;
  /** Montant HT de la prestation, affiche a cote du total de jours quand un TJM est connu. */
  serviceAmountLabel?: string | null;
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
}: WorkDaysCalendarProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [pendingCommentDate, setPendingCommentDate] = useState("");

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
          <span className="text-sm font-semibold text-[#0A1A2F]">
            {totalDays.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} jour
            {totalDays > 1 ? "s" : ""}
          </span>
          {serviceAmountLabel ? (
            <span className="text-sm text-[#0A1A2F]/60">· {serviceAmountLabel} HT</span>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={onFillWorkingDays}>
            Tous les jours ouvres
          </Button>
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
            const entry = entriesByDate.get(isoDate);
            const isHalfDay = entry ? Number(entry.dayQuantity) === 0.5 : false;

            return (
              <button
                key={isoDate}
                type="button"
                onClick={() => onCycleWorkDate(isoDate)}
                title={holidayName ?? (entry ? "Cliquer pour passer en demi-journee" : undefined)}
                className={cn(
                  "relative aspect-square rounded-lg border text-sm transition-colors",
                  entry
                    ? "border-[#2aa0dd] bg-[#2aa0dd] font-semibold text-white"
                    : isDimmed
                      ? "border-transparent bg-slate-100 text-slate-400 hover:bg-slate-200"
                      : "border-slate-200 bg-white text-[#0A1A2F] hover:border-[#2aa0dd]/40 hover:bg-slate-50",
                )}
                aria-pressed={Boolean(entry)}
              >
                {dayNumber}
                {isHalfDay ? (
                  <span className="absolute bottom-0.5 right-1 text-[10px] font-bold leading-none">
                    ½
                  </span>
                ) : null}
                {entry?.label.trim() ? (
                  <span className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-white/90" />
                ) : null}
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-[#0A1A2F]/55">
          Un clic coche une journee, un second la passe en demi-journee, un troisieme la retire.
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
