"use client";

import { Clock, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ABSENCE_LABELS,
  CRA_SLOT_LABEL_MAX_LENGTH,
  CRA_SLOT_STEP_MINUTES,
  craEntryHours,
  craSlotsHours,
  craTimeSlotsError,
  formatClockTime,
  formatCraHours,
  parseClockTime,
  type CraEntryDraft,
  type CraTimeSlotDraft,
} from "@/domain/cra";
import type { TimeUnit } from "@/domain/common";
import { cn } from "@/lib/utils";

type DayDetailsProps = {
  entries: CraEntryDraft[];
  missions: { id: string; companyName: string; timeUnit: TimeUnit }[];
  /** Couleur d'une ligne, la meme que sur le calendrier. */
  colorOf: (missionId: string, absenceType: string) => { bg: string };
  formatEntryDateLabel: (value: string) => string;
  onUpdateEntry: (workDate: string, patch: { label?: string }, missionId?: string) => void;
  onSetEntryTimeSlots?: (workDate: string, missionId: string, timeSlots: CraTimeSlotDraft[]) => void;
};

/** Une journee horaire ? Par la mission ; a defaut (CRA ancien sans mission), par ses heures. */
function isHourlyEntry(entry: CraEntryDraft, missions: DayDetailsProps["missions"]) {
  if (entry.absenceType) return false;
  const mission = missions.find((item) => item.id === entry.missionId);
  return mission ? mission.timeUnit === "hour" : Boolean(entry.hours);
}

function quantityLabel(entry: CraEntryDraft, hourly: boolean) {
  if (entry.absenceType) {
    const label = ABSENCE_LABELS.find((absence) => absence.value === entry.absenceType)?.label ?? "Absence";
    return `${label} · ${Number(entry.dayQuantity).toLocaleString("fr-FR")} j`;
  }
  if (hourly) return formatCraHours(craEntryHours(entry));
  return `${Number(entry.dayQuantity).toLocaleString("fr-FR")} j`;
}

/** Creneau propose a l'ajout : il suit le dernier, pour une heure. */
function nextSlot(slots: CraTimeSlotDraft[]): CraTimeSlotDraft {
  const lastEnd = slots.length ? parseClockTime(slots[slots.length - 1].end) : null;
  const start = lastEnd !== null && lastEnd < 24 * 60 ? lastEnd : 9 * 60;
  return { start: formatClockTime(start), end: formatClockTime(Math.min(24 * 60, start + 60)), label: "" };
}

/**
 * Detail des journees du CRA : un commentaire par jour, et pour une mission facturee a
 * l'heure, des creneaux debut–fin commentes. Les heures d'une journee detaillee sont la
 * somme de ses creneaux : le total ne peut pas diverger du detail.
 *
 * Toutes les journees cochees sont listees (et pas seulement celles deja commentees) : le
 * PDF les imprime toutes, la saisie doit les montrer toutes.
 */
export function DayDetails({
  entries,
  missions,
  colorOf,
  formatEntryDateLabel,
  onUpdateEntry,
  onSetEntryTimeSlots,
}: DayDetailsProps) {
  if (!entries.length) {
    return <p className="text-app-xs text-app-text-muted">Coche d&apos;abord des jours sur le calendrier.</p>;
  }

  const showCompany = missions.length > 1;

  return (
    <ul className="space-y-3">
      {entries.map((entry, position) => {
        const hourly = isHourlyEntry(entry, missions);
        const mission = missions.find((item) => item.id === entry.missionId);
        const color = colorOf(entry.missionId, entry.absenceType);
        // Plusieurs entreprises le meme jour : la date n'est repetee que sur la premiere.
        const firstOfDay = position === 0 || entries[position - 1].workDate !== entry.workDate;
        const slots = entry.timeSlots;
        const slotError = slots.length ? craTimeSlotsError(slots) : null;
        const setSlots = (next: CraTimeSlotDraft[]) =>
          onSetEntryTimeSlots?.(entry.workDate, entry.missionId, next);
        const patchSlot = (index: number, patch: Partial<CraTimeSlotDraft>) =>
          setSlots(slots.map((slot, position) => (position === index ? { ...slot, ...patch } : slot)));

        return (
          <li
            key={`${entry.workDate}|${entry.missionId}|${entry.absenceType}`}
            className={cn("rounded-app-control border border-app-line p-3", !firstOfDay && "ml-4")}
          >
            <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-app-xs">
              <span
                className={cn(
                  "capitalize",
                  firstOfDay ? "font-semibold text-app-text" : "text-app-text-muted",
                )}
              >
                {firstOfDay ? formatEntryDateLabel(entry.workDate) : "meme jour"}
              </span>
              {showCompany || entry.absenceType ? (
                <span className="flex items-center gap-2 text-app-text-secondary">
                  <span className={cn("h-2.5 w-2.5 rounded-sm", color.bg)} />
                  {entry.absenceType ? "Absence" : (mission?.companyName ?? "Sans entreprise")}
                </span>
              ) : null}
              <span className="ml-auto font-medium text-app-text-secondary">{quantityLabel(entry, hourly)}</span>
            </div>

            <input
              value={entry.label}
              onChange={(event) =>
                onUpdateEntry(entry.workDate, { label: event.target.value }, entry.missionId)
              }
              maxLength={CRA_SLOT_LABEL_MAX_LENGTH}
              className="h-9 w-full rounded-app-control border border-app-line bg-app-field text-app-text placeholder:text-app-text-muted focus-visible:outline-app px-3 text-app-sm"
              placeholder={hourly ? "Resume de la journee (optionnel)" : "Commentaire de la journee (optionnel)"}
              aria-label={`Commentaire du ${formatEntryDateLabel(entry.workDate)}`}
            />

            {hourly && onSetEntryTimeSlots ? (
              <div className="mt-2 space-y-2">
                {slots.map((slot, index) => (
                  <div key={index} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                    <Clock className="hidden h-3.5 w-3.5 shrink-0 text-app-text-muted sm:block" />
                    <input
                      type="time"
                      step={CRA_SLOT_STEP_MINUTES * 60}
                      value={slot.start}
                      onChange={(event) => patchSlot(index, { start: event.target.value })}
                      className="h-8 w-[6.5rem] rounded-app-control border border-app-line bg-app-field text-app-text placeholder:text-app-text-muted focus-visible:outline-app px-2 text-app-sm"
                      aria-label={`Debut du creneau ${index + 1}`}
                    />
                    <span className="text-app-xs text-app-text-muted">a</span>
                    <input
                      type="time"
                      step={CRA_SLOT_STEP_MINUTES * 60}
                      value={slot.end === "24:00" ? "23:59" : slot.end}
                      onChange={(event) => patchSlot(index, { end: event.target.value })}
                      className="h-8 w-[6.5rem] rounded-app-control border border-app-line bg-app-field text-app-text placeholder:text-app-text-muted focus-visible:outline-app px-2 text-app-sm"
                      aria-label={`Fin du creneau ${index + 1}`}
                    />
                    <input
                      value={slot.label}
                      onChange={(event) => patchSlot(index, { label: event.target.value })}
                      maxLength={CRA_SLOT_LABEL_MAX_LENGTH}
                      className="h-8 min-w-0 flex-1 basis-full rounded-app-control border border-app-line bg-app-field text-app-text placeholder:text-app-text-muted focus-visible:outline-app px-2 text-app-sm sm:basis-auto"
                      placeholder="Ce qui a ete fait sur ce creneau"
                      aria-label={`Commentaire du creneau ${index + 1}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-app-text-muted hover:text-rejected"
                      onClick={() => setSlots(slots.filter((_, position) => position !== index))}
                      aria-label={`Retirer le creneau ${index + 1}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => setSlots([...slots, nextSlot(slots)])}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Ajouter un creneau
                  </Button>
                  {slots.length ? (
                    slotError ? (
                      <span className="text-app-xs font-medium text-pending">{slotError}</span>
                    ) : (
                      <span className="text-app-xs text-app-text-muted">
                        {formatCraHours(craSlotsHours(slots))} · calcule depuis les creneaux
                      </span>
                    )
                  ) : (
                    <span className="text-app-xs text-app-text-muted">
                      Detaille la journee heure par heure pour un CRA precis.
                    </span>
                  )}
                </div>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
