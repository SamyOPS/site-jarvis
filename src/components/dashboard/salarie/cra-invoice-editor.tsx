"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";

import { CraHistory } from "@/components/dashboard/salarie/cra/cra-history";
import { ABSENCE_LABELS } from "@/domain/cra";
import { formatInvoiceAmount, InvoiceSummary } from "@/components/dashboard/salarie/cra/invoice-summary";
import {
  computeInvoiceTotals,
  type InvoiceLineInput,
} from "@/features/dashboard/salarie/invoice-totals";
import {
  WorkDaysCalendar,
  type CalendarMission,
} from "@/components/dashboard/salarie/cra/work-days-calendar";
import { Button } from "@/components/ui/button";
import type { TimeUnit } from "@/domain/common";
import type { CraCalendarCell, CraEntryDraft } from "@/domain/cra";
import type { CraSummaryRow } from "@/features/dashboard/salarie/types";
import { cn } from "@/lib/utils";

export type CraInvoiceTab = "cra" | "facture";

export type SalarieInvoiceSettings = {
  discountGranted: boolean;
  vatEnabled: boolean;
  amountAlreadyPaid: string;
  fraisKm: string;
  fraisRepas: string;
  fraisNuitee: string;
};


const expenseFields = [
  { key: "fraisKm", label: "Frais kilometriques" },
  { key: "fraisRepas", label: "Frais de repas" },
  { key: "fraisNuitee", label: "Frais de nuitee" },
] as const;

function toAmount(value: string) {
  return value.trim() === "" ? 0 : Number(value) || 0;
}

function CollapsibleSection({
  title,
  hint,
  badge,
  children,
}: {
  title: string;
  hint?: string;
  badge?: string | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-[#0A1A2F] transition hover:bg-slate-50"
        aria-expanded={open}
      >
        <span>
          {title}
          {badge ? (
            <span className="ml-2 rounded-full bg-[#2aa0dd]/12 px-2 py-0.5 text-xs font-semibold text-[#2aa0dd]">
              {badge}
            </span>
          ) : hint ? (
            <span className="ml-2 text-xs font-normal text-[#0A1A2F]/50">{hint}</span>
          ) : null}
        </span>
        <ChevronDown className={cn("h-4 w-4 transition", open ? "rotate-180" : "")} />
      </button>
      {open ? <div className="px-4 pb-4">{children}</div> : null}
    </div>
  );
}

type SalarieCraInvoiceEditorProps = {
  initialTab?: CraInvoiceTab;
  billingProfileReady: boolean;
  selectedCraId: string | null;
  selectedCraSummary: Pick<CraSummaryRow, "status" | "pdf_version"> | null;
  craItems: CraSummaryRow[];
  onSelectCra: (craId: string) => void | Promise<void>;
  resetCraEditor: () => void;
  onGenerateCraPdf: () => void | Promise<void>;
  onGenerateInvoicePdf: () => void | Promise<void>;
  craGenerating: boolean;
  invoiceGenerating: boolean;
  craCalendarMonth: string;
  craPeriodMonth: string;
  onCraCalendarMonthChange: (value: string) => void;
  shiftMonthInputValue: (value: string, offset: number) => string;
  craDraftTotalDays: number;
  craNotes: string;
  onCraNotesChange: (value: string) => void;
  invoice: SalarieInvoiceSettings;
  onInvoiceChange: (value: SalarieInvoiceSettings) => void;
  weekdayLabels: string[];
  craCalendarCells: CraCalendarCell[];
  craEntriesByDate: Map<string, CraEntryDraft[]>;
  craEntries: CraEntryDraft[];
  onCycleCraWorkDate: (workDate: string, missionId?: string) => void;
  onFillCraWorkingDays: () => void;
  onClearCraEntries: () => void;
  craTimeUnit: TimeUnit;
  craDraftTotalHours: number;
  onSetCraEntryHours: (workDate: string, hours: number, missionId?: string) => void;
  onSetCraEntryDayQuantity: (workDate: string, dayQuantity: number, missionId?: string) => void;
  onRemoveCraWorkDate: (workDate: string, missionId?: string) => void;
  onApplyCraHoursToAllEntries: (hours: number) => void;
  formatCraEntryDateLabel: (value: string) => string;
  updateCraEntry: (
    workDate: string,
    patch: { dayQuantity?: string; label?: string },
    missionId?: string,
  ) => void;
  /** Entreprises du collaborateur. Vide = comportement mono-entreprise historique. */
  craMissions: CalendarMission[];
  activeMissionId: string;
  onSelectMission: (missionId: string) => void;
  /** Une ligne de facture par entreprise saisie, avec sa quantite et son tarif. */
  craInvoiceLines: InvoiceLineInput[];
  /** Type d'absence actif : non vide, les clics pointent une absence. */
  activeAbsenceType: string;
  onSelectAbsence: (absenceType: string) => void;
  /** Totaux d'absence par type, deduits du calendrier. */
  craAbsenceTotals: Map<string, number>;
};

export function SalarieCraInvoiceEditor({
  initialTab = "cra",
  billingProfileReady,
  selectedCraId,
  selectedCraSummary,
  craItems,
  onSelectCra,
  resetCraEditor,
  onGenerateCraPdf,
  onGenerateInvoicePdf,
  craGenerating,
  invoiceGenerating,
  craCalendarMonth,
  craPeriodMonth,
  onCraCalendarMonthChange,
  shiftMonthInputValue,
  craDraftTotalDays,
  craNotes,
  onCraNotesChange,
  invoice,
  onInvoiceChange,
  weekdayLabels,
  craCalendarCells,
  craEntriesByDate,
  craEntries,
  onCycleCraWorkDate,
  onFillCraWorkingDays,
  onClearCraEntries,
  craTimeUnit,
  craDraftTotalHours,
  onSetCraEntryHours,
  onSetCraEntryDayQuantity,
  onRemoveCraWorkDate,
  onApplyCraHoursToAllEntries,
  craMissions,
  activeMissionId,
  onSelectMission,
  craInvoiceLines,
  activeAbsenceType,
  onSelectAbsence,
  craAbsenceTotals,
  formatCraEntryDateLabel,
  updateCraEntry,
}: SalarieCraInvoiceEditorProps) {
  const [tab, setTab] = useState<CraInvoiceTab>(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  // Le tarif appartient a la mission : la facture est facturable des qu'au moins une
  // entreprise saisie porte un tarif.
  const invoiceTotals = computeInvoiceTotals({
    lines: craInvoiceLines,
    discountGranted: invoice.discountGranted,
    vatEnabled: invoice.vatEnabled,
    amountAlreadyPaid: toAmount(invoice.amountAlreadyPaid),
    fraisKm: toAmount(invoice.fraisKm),
    fraisRepas: toAmount(invoice.fraisRepas),
    fraisNuitee: toAmount(invoice.fraisNuitee),
  });
  const hasDailyRate = invoiceTotals.serviceHt > 0;
  const missionsWithoutRate = craInvoiceLines
    .filter((line) => line.quantity > 0 && line.rate <= 0)
    .map((line) => line.label);
  const hasEntries = craEntries.length > 0;
  const busy = craGenerating || invoiceGenerating;

  // Deduit des jours pointes, plus d'un formulaire : les deux ne peuvent plus diverger.
  const leaveDaysTotal = Array.from(craAbsenceTotals.values()).reduce(
    (total, value) => total + value,
    0,
  );
  const expensesTotal =
    toAmount(invoice.fraisKm) + toAmount(invoice.fraisRepas) + toAmount(invoice.fraisNuitee);

  const tabTriggerClass = (value: CraInvoiceTab) =>
    cn(
      "rounded-lg px-4 py-2 text-sm font-medium transition",
      tab === value
        ? "bg-white text-[#0A1A2F] shadow-sm"
        : "text-[#0A1A2F]/60 hover:text-[#0A1A2F]",
    );

  return (
    <div className="min-w-0">
      {/* min-w-0 est obligatoire : sans lui la largeur mini vaut min-content, et la
          grille 7 colonnes du calendrier deborderait. */}
      <div className="min-w-0 space-y-4">
      {!billingProfileReady ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>Renseigne ton profil de facturation pour pouvoir generer un document.</span>
          <Link href="/dashboard/salarie/parametres" className="font-semibold underline">
            Aller aux parametres
          </Link>
        </div>
      ) : null}

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as CraInvoiceTab)}
        className="space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList className="inline-flex gap-1 rounded-xl bg-slate-100 p-1">
            <TabsTrigger value="cra" className={tabTriggerClass("cra")}>
              CRA
            </TabsTrigger>
            <TabsTrigger value="facture" className={tabTriggerClass("facture")}>
              Facture
            </TabsTrigger>
          </TabsList>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-[#0A1A2F]/55"
            onClick={resetCraEditor}
          >
            Remettre a 0
          </Button>
        </div>

        {/* Enfant direct de Tabs, hors de tout TabsContent : la saisie des jours est
            commune au CRA et a la facture, elle reste donc visible sur les deux onglets. */}
        <WorkDaysCalendar
          calendarMonth={craCalendarMonth}
          periodMonth={craPeriodMonth}
          onCalendarMonthChange={onCraCalendarMonthChange}
          shiftMonthInputValue={shiftMonthInputValue}
          weekdayLabels={weekdayLabels}
          calendarCells={craCalendarCells}
          entries={craEntries}
          entriesByDate={craEntriesByDate}
          totalDays={craDraftTotalDays}
          onCycleWorkDate={onCycleCraWorkDate}
          onFillWorkingDays={onFillCraWorkingDays}
          onClearEntries={onClearCraEntries}
          onUpdateEntry={updateCraEntry}
          formatEntryDateLabel={formatCraEntryDateLabel}
          serviceAmountLabel={
            hasDailyRate ? formatInvoiceAmount(invoiceTotals.serviceHt) : null
          }
          timeUnit={craTimeUnit}
          totalHours={craDraftTotalHours}
          onSetEntryHours={onSetCraEntryHours}
          onSetEntryDayQuantity={onSetCraEntryDayQuantity}
          onRemoveWorkDate={onRemoveCraWorkDate}
          onApplyHoursToAllEntries={onApplyCraHoursToAllEntries}
          missions={craMissions}
          activeMissionId={activeMissionId}
          onSelectMission={onSelectMission}
          absenceTypes={ABSENCE_LABELS}
          activeAbsenceType={activeAbsenceType}
          onSelectAbsence={onSelectAbsence}
          absenceTotals={craAbsenceTotals}
        />

        <TabsContent value="cra" className="space-y-4">
          {selectedCraSummary ? (
            <p className="text-sm text-[#0A1A2F]/65">
              CRA en cours · statut {selectedCraSummary.status} · PDF v
              {selectedCraSummary.pdf_version}
            </p>
          ) : null}

          {/* Les absences se pointent sur le calendrier, via les puces au-dessus : il n'y a
              plus de compteurs a saisir, leur total en decoule. */}
          {leaveDaysTotal > 0 ? (
            <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-[#0A1A2F]/70">
              Absences pointees :{" "}
              {ABSENCE_LABELS.filter((absence) => (craAbsenceTotals.get(absence.value) ?? 0) > 0)
                .map(
                  (absence) =>
                    `${absence.label} ${(craAbsenceTotals.get(absence.value) ?? 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} j`,
                )
                .join(" · ")}
            </p>
          ) : null}

          <div className="space-y-1">
            <label className="text-sm font-medium text-[#0A1A2F]">Notes</label>
            <textarea
              value={craNotes}
              onChange={(event) => onCraNotesChange(event.target.value)}
              rows={3}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Commentaire interne, precision de mission, etc."
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={() => void onGenerateCraPdf()}
              disabled={busy || !billingProfileReady || !hasEntries}
            >
              {craGenerating ? "Generation..." : "Generer le CRA"}
            </Button>
            {!hasEntries ? (
              <span className="text-sm text-[#0A1A2F]/55">
                Coche au moins un jour travaille.
              </span>
            ) : null}
          </div>

          <CraHistory items={craItems} selectedCraId={selectedCraId} onSelect={onSelectCra} />
        </TabsContent>

        <TabsContent value="facture" className="space-y-4">
          {!hasDailyRate && billingProfileReady ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <span>
                {missionsWithoutRate.length
                  ? `Aucun tarif renseigne pour ${missionsWithoutRate.join(", ")} : la facture ne peut pas etre generee.`
                  : "Aucune entreprise avec un tarif : la facture ne peut pas etre generee."}
              </span>
              <Link href="/dashboard/salarie/parametres" className="font-semibold underline">
                Regler mes entreprises
              </Link>
            </div>
          ) : missionsWithoutRate.length ? (
            <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {`Sans tarif, ${missionsWithoutRate.join(", ")} n'apparaitra pas sur la facture.`}
            </div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={invoice.vatEnabled}
                onChange={(event) =>
                  onInvoiceChange({ ...invoice, vatEnabled: event.target.checked })
                }
              />
              TVA appliquee (20%)
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={invoice.discountGranted}
                onChange={(event) =>
                  onInvoiceChange({ ...invoice, discountGranted: event.target.checked })
                }
              />
              Escompte accorde (2%)
            </label>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-[#0A1A2F]">Montant deja paye</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={invoice.amountAlreadyPaid}
              onChange={(event) =>
                onInvoiceChange({ ...invoice, amountAlreadyPaid: event.target.value })
              }
              onWheel={(event) => event.currentTarget.blur()}
              className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm sm:max-w-[12rem]"
              placeholder="0.00"
            />
          </div>

          <CollapsibleSection
            title="Frais professionnels"
            hint="aucun"
            badge={expensesTotal > 0 ? formatInvoiceAmount(expensesTotal) : null}
          >
            <p className="mb-3 text-xs text-[#0A1A2F]/60">
              Montants HT a refacturer. Les frais suivent la TVA si elle est activee, mais ne sont
              jamais escomptes.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {expenseFields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <label className="text-xs font-medium text-[#0A1A2F]/70">{field.label}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={invoice[field.key]}
                    onChange={(event) =>
                      onInvoiceChange({ ...invoice, [field.key]: event.target.value })
                    }
                    onWheel={(event) => event.currentTarget.blur()}
                    className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm"
                    placeholder="0.00"
                  />
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {hasEntries && hasDailyRate ? (
            <InvoiceSummary
              lines={craInvoiceLines}
              discountGranted={invoice.discountGranted}
              vatEnabled={invoice.vatEnabled}
              amountAlreadyPaid={toAmount(invoice.amountAlreadyPaid)}
              fraisKm={toAmount(invoice.fraisKm)}
              fraisRepas={toAmount(invoice.fraisRepas)}
              fraisNuitee={toAmount(invoice.fraisNuitee)}
            />
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={() => void onGenerateInvoicePdf()}
              disabled={busy || !billingProfileReady || !hasEntries || !hasDailyRate}
            >
              {invoiceGenerating ? "Generation..." : "Generer la facture"}
            </Button>
            {!hasEntries ? (
              <span className="text-sm text-[#0A1A2F]/55">
                Coche au moins un jour travaille.
              </span>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
      </div>

    </div>
  );
}
