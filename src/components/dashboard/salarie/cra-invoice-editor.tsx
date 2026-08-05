"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";

import type { BillingProfileFormState } from "@/components/dashboard/billing-profile-card";
import { CraHistory } from "@/components/dashboard/salarie/cra/cra-history";
import { formatInvoiceAmount, InvoiceSummary } from "@/components/dashboard/salarie/cra/invoice-summary";
import { WorkDaysCalendar } from "@/components/dashboard/salarie/cra/work-days-calendar";
import { CraLivePreview } from "@/components/dashboard/salarie/cra-live-preview";
import { InvoiceLivePreview } from "@/components/dashboard/salarie/invoice-live-preview";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import type {
  CraCalendarCell,
  CraEntryDraft,
  CraLeaveDaysDraft,
  CraSummaryRow,
  CraTimeUnit,
} from "@/features/dashboard/salarie/types";
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

const leaveFields = [
  { key: "paid", label: "Conge paye" },
  { key: "sick", label: "Arret maladie" },
  { key: "exceptional", label: "Conge exceptionnel" },
  { key: "unpaid", label: "Conge sans solde" },
] as const;

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
  billingProfileForm: BillingProfileFormState;
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
  craLeaveDays: CraLeaveDaysDraft;
  onCraLeaveDaysChange: (value: CraLeaveDaysDraft) => void;
  invoice: SalarieInvoiceSettings;
  onInvoiceChange: (value: SalarieInvoiceSettings) => void;
  /** Rang provisoire de la prochaine facture du mois, pour l'apercu uniquement. */
  nextInvoiceSequence: number;
  weekdayLabels: string[];
  craCalendarCells: CraCalendarCell[];
  craEntriesByDate: Map<string, CraEntryDraft>;
  craEntries: CraEntryDraft[];
  onCycleCraWorkDate: (workDate: string) => void;
  onFillCraWorkingDays: () => void;
  onClearCraEntries: () => void;
  craTimeUnit: CraTimeUnit;
  craHoursPerDay: number;
  craDraftTotalHours: number;
  onSetCraEntryHours: (workDate: string, hours: number) => void;
  onRemoveCraWorkDate: (workDate: string) => void;
  onApplyCraHoursToAllEntries: (hours: number) => void;
  formatCraEntryDateLabel: (value: string) => string;
  updateCraEntry: (workDate: string, patch: { dayQuantity?: string; label?: string }) => void;
};

export function SalarieCraInvoiceEditor({
  initialTab = "cra",
  billingProfileReady,
  billingProfileForm,
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
  craLeaveDays,
  onCraLeaveDaysChange,
  invoice,
  onInvoiceChange,
  nextInvoiceSequence,
  weekdayLabels,
  craCalendarCells,
  craEntriesByDate,
  craEntries,
  onCycleCraWorkDate,
  onFillCraWorkingDays,
  onClearCraEntries,
  craTimeUnit,
  craHoursPerDay,
  craDraftTotalHours,
  onSetCraEntryHours,
  onRemoveCraWorkDate,
  onApplyCraHoursToAllEntries,
  formatCraEntryDateLabel,
  updateCraEntry,
}: SalarieCraInvoiceEditorProps) {
  const [tab, setTab] = useState<CraInvoiceTab>(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const isWideViewport = useMediaQuery("(min-width: 1280px)");
  const [narrowPreviewOpen, setNarrowPreviewOpen] = useState(false);
  const previewEnabled = isWideViewport || narrowPreviewOpen;

  // Fige l'horodatage au montage : un `new Date()` a chaque rendu relancerait la
  // construction du PDF en boucle. Le serveur reste maitre de la date reelle.
  const [issuedAtIso] = useState(() => new Date().toISOString());

  const dailyRate = toAmount(billingProfileForm.dailyRate);
  const hasDailyRate = dailyRate > 0;
  const hasEntries = craEntries.length > 0;
  const busy = craGenerating || invoiceGenerating;

  const leaveDaysTotal = leaveFields.reduce(
    (total, field) => total + toAmount(craLeaveDays[field.key]),
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
    <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(400px,0.95fr)] 2xl:grid-cols-[minmax(0,1fr)_minmax(480px,600px)]">
      {/* min-w-0 est obligatoire : sans lui la largeur mini d'un element de grille
          vaut min-content, et la grille 7 colonnes du calendrier deborderait. */}
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
            hasDailyRate ? formatInvoiceAmount(craDraftTotalDays * dailyRate) : null
          }
          timeUnit={craTimeUnit}
          hoursPerDay={craHoursPerDay}
          totalHours={craDraftTotalHours}
          onSetEntryHours={onSetCraEntryHours}
          onRemoveWorkDate={onRemoveCraWorkDate}
          onApplyHoursToAllEntries={onApplyCraHoursToAllEntries}
        />

        <TabsContent value="cra" className="space-y-4">
          {selectedCraSummary ? (
            <p className="text-sm text-[#0A1A2F]/65">
              CRA en cours · statut {selectedCraSummary.status} · PDF v
              {selectedCraSummary.pdf_version}
            </p>
          ) : null}

          <CollapsibleSection
            title="Absences et conges"
            hint="aucune"
            badge={
              leaveDaysTotal > 0
                ? `${leaveDaysTotal.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} j`
                : null
            }
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {leaveFields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <label className="text-xs font-medium text-[#0A1A2F]/70">{field.label}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={craLeaveDays[field.key]}
                    onChange={(event) =>
                      onCraLeaveDaysChange({ ...craLeaveDays, [field.key]: event.target.value })
                    }
                    onWheel={(event) => event.currentTarget.blur()}
                    className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </CollapsibleSection>

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
                Aucun tarif journalier dans ton profil de facturation : la facture ne peut pas
                etre generee.
              </span>
              <Link href="/dashboard/salarie/parametres" className="font-semibold underline">
                Renseigner le TJM
              </Link>
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
              quantity={craDraftTotalDays}
              dailyRate={dailyRate}
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

      {/* Colonne d'apercu. Le sticky se resout contre l'unique conteneur scrollable
          du dashboard : n'ajouter aucun overflow-* entre les deux, sinon il casse. */}
      <aside className="min-w-0 xl:sticky xl:top-0 xl:self-start">
        <div className="rounded-xl border border-slate-200 bg-white p-2 xl:p-3">
          <p className="mb-2 px-1 text-sm font-medium text-[#0A1A2F]">
            Apercu {tab === "cra" ? "du CRA" : "de la facture"}
          </p>

          {previewEnabled ? (
            tab === "cra" ? (
              <CraLivePreview
                billingProfile={billingProfileForm}
                periodMonth={craPeriodMonth}
                notes={craNotes}
                entries={craEntries}
                totalDays={craDraftTotalDays}
                leaveDays={craLeaveDays}
              />
            ) : (
              <InvoiceLivePreview
                billingProfile={billingProfileForm}
                entries={craEntries}
                periodMonth={craPeriodMonth}
                totalDays={craDraftTotalDays}
                settings={invoice}
                sequence={nextInvoiceSequence}
                issuedAtIso={issuedAtIso}
                enabled={hasDailyRate}
                disabledLabel="Renseigne ton tarif journalier pour voir l'apercu de la facture."
              />
            )
          ) : (
            // Sous xl, on ne monte pas l'apercu : construire un PDF que l'ecran ne
            // peut pas afficher confortablement serait du calcul pur perdu.
            <button
              type="button"
              onClick={() => setNarrowPreviewOpen(true)}
              className="flex aspect-[595/842] w-full max-w-[520px] mx-auto flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 text-center text-sm text-[#0A1A2F]/60 transition hover:border-[#2aa0dd]/50 hover:bg-slate-100"
            >
              <span className="font-medium text-[#0A1A2F]">Afficher l&apos;apercu</span>
              <span className="text-xs">
                Le vis-a-vis avec le calendrier s&apos;active sur un ecran plus large.
              </span>
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
