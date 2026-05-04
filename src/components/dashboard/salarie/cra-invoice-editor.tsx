import { ChevronLeft, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  CraCalendarCell,
  CraEntryDraft,
  CraSummaryRow,
} from "@/features/dashboard/salarie/types";
import { cn } from "@/lib/utils";

type SalarieCraInvoiceEditorProps = {
  billingProfileReady: boolean;
  selectedCraId: string | null;
  selectedCraSummary: Pick<CraSummaryRow, "status" | "pdf_version"> | null;
  resetCraEditor: () => void;
  onGenerateCraPdf: () => void | Promise<void>;
  onGenerateInvoicePdf: () => void | Promise<void>;
  craGenerating: boolean;
  invoiceGenerating: boolean;
  craPeriodMonth: string;
  onCraPeriodMonthChange: (value: string) => void;
  shiftMonthInputValue: (value: string, offset: number) => string;
  craDraftTotalDays: number;
  craNotes: string;
  onCraNotesChange: (value: string) => void;
  invoiceDiscountGranted: boolean;
  onInvoiceDiscountGrantedChange: (value: boolean) => void;
  invoiceVatEnabled: boolean;
  onInvoiceVatEnabledChange: (value: boolean) => void;
  invoiceAmountAlreadyPaid: string;
  onInvoiceAmountAlreadyPaidChange: (value: string) => void;
  weekdayLabels: string[];
  craCalendarCells: CraCalendarCell[];
  craEntriesByDate: Map<string, CraEntryDraft>;
  craEntries: CraEntryDraft[];
  toggleCraWorkDate: (workDate: string) => void;
  formatCraEntryDateLabel: (value: string) => string;
  updateCraEntry: (workDate: string, patch: { dayQuantity?: string; label?: string }) => void;
};

export function SalarieCraInvoiceEditor({
  billingProfileReady,
  selectedCraId,
  selectedCraSummary,
  resetCraEditor,
  onGenerateCraPdf,
  onGenerateInvoicePdf,
  craGenerating,
  invoiceGenerating,
  craPeriodMonth,
  onCraPeriodMonthChange,
  shiftMonthInputValue,
  craDraftTotalDays,
  craNotes,
  onCraNotesChange,
  invoiceDiscountGranted,
  onInvoiceDiscountGrantedChange,
  invoiceVatEnabled,
  onInvoiceVatEnabledChange,
  invoiceAmountAlreadyPaid,
  onInvoiceAmountAlreadyPaidChange,
  weekdayLabels,
  craCalendarCells,
  craEntriesByDate,
  craEntries,
  toggleCraWorkDate,
  formatCraEntryDateLabel,
  updateCraEntry,
}: SalarieCraInvoiceEditorProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-[#0A1A2F]/80">
        Cette page permet de generer un CRA et une facture PDF a partir de la meme periode de travail.
      </div>

      <div className="max-w-5xl">
        <Card className="border-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">
                {selectedCraId ? "CRA en cours" : "Nouveau CRA"}
              </CardTitle>
              <p className="mt-1 text-sm text-[#0A1A2F]/70">
                {selectedCraSummary
                  ? `Statut actuel: ${selectedCraSummary.status} | PDF v${selectedCraSummary.pdf_version}`
                  : "Selectionne tes jours, puis genere directement le PDF depuis cette page."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={resetCraEditor}>
                Remettre a 0
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void onGenerateCraPdf()}
                disabled={craGenerating || invoiceGenerating}
              >
                {craGenerating ? "Generation..." : "Generer un CRA"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void onGenerateInvoicePdf()}
                disabled={invoiceGenerating || craGenerating}
              >
                {invoiceGenerating ? "Generation..." : "Generer une facture"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {!billingProfileReady ? (
              <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Enregistre d&apos;abord ton profil de facturation pour pouvoir creer un CRA.
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Periode</label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => onCraPeriodMonthChange(shiftMonthInputValue(craPeriodMonth, -1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <input
                    type="month"
                    value={craPeriodMonth}
                    onChange={(event) => onCraPeriodMonthChange(event.target.value)}
                    className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => onCraPeriodMonthChange(shiftMonthInputValue(craPeriodMonth, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Total saisi</label>
                <div className="flex h-10 items-center rounded-md bg-slate-50 px-3 text-sm">
                  {craDraftTotalDays.toFixed(2)} jour(s)
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={invoiceDiscountGranted}
                    onChange={(event) => onInvoiceDiscountGrantedChange(event.target.checked)}
                  />
                  Escompte accorde (2%)
                </label>
                <label className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={invoiceVatEnabled}
                    onChange={(event) => onInvoiceVatEnabledChange(event.target.checked)}
                  />
                  TVA appliquee (20%)
                </label>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Montant deja paye</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={invoiceAmountAlreadyPaid}
                  onChange={(event) => onInvoiceAmountAlreadyPaidChange(event.target.value)}
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Notes</label>
              <textarea
                value={craNotes}
                onChange={(event) => onCraNotesChange(event.target.value)}
                rows={4}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Commentaire interne, precision de mission, etc."
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">Journees travaillees</p>
                  <p className="text-sm text-[#0A1A2F]/70">
                    Clique sur les jours travailles dans le calendrier pour les ajouter ou les retirer.
                  </p>
                </div>
                <Badge variant="outline">{craEntries.length} selection(s)</Badge>
              </div>
              <div className="rounded-xl bg-slate-50/70 p-4">
                <div className="mb-3 grid grid-cols-7 gap-2">
                  {weekdayLabels.map((label) => (
                    <div
                      key={label}
                      className="px-1 text-center text-xs font-medium uppercase tracking-wide text-[#0A1A2F]/50"
                    >
                      {label}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {craCalendarCells.map((cell, index) => {
                    const isoDate = cell.isoDate;
                    const dayNumber = cell.dayNumber;

                    if (!isoDate || !dayNumber) {
                      return (
                        <div
                          key={`empty-${index}`}
                          className="aspect-square rounded-lg bg-slate-50/60"
                        />
                      );
                    }

                    const parsedDate = new Date(`${isoDate}T00:00:00`);
                    const isWeekend = [0, 6].includes(parsedDate.getDay());
                    const isSelected = craEntriesByDate.has(isoDate);

                    return (
                      <button
                        key={isoDate}
                        type="button"
                        onClick={() => toggleCraWorkDate(isoDate)}
                        className={cn(
                          "aspect-square rounded-lg border border-transparent text-sm transition-colors",
                          isSelected
                            ? "border-[#2aa0dd] bg-[#2aa0dd] text-white"
                            : "bg-white text-[#0A1A2F] hover:bg-slate-100",
                          isWeekend && !isSelected ? "text-[#0A1A2F]/55" : "",
                        )}
                        aria-pressed={isSelected}
                      >
                        {dayNumber}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Jours selectionnes</p>
                {craEntries.length ? (
                  craEntries.map((entry) => (
                    <div
                      key={entry.workDate}
                      className="grid gap-3 rounded-lg bg-slate-50 p-3 md:grid-cols-[1.1fr_120px_1.3fr_auto]"
                    >
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-[#0A1A2F]/70">Date</label>
                        <div className="flex h-10 items-center rounded-md bg-white px-3 text-sm capitalize">
                          {formatCraEntryDateLabel(entry.workDate)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-[#0A1A2F]/70">Jours</label>
                        <input
                          type="number"
                          min="0.25"
                          max="1"
                          step="0.25"
                          value={entry.dayQuantity}
                          onChange={(event) =>
                            updateCraEntry(entry.workDate, { dayQuantity: event.target.value })
                          }
                          className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-[#0A1A2F]/70">Libelle</label>
                        <input
                          value={entry.label}
                          onChange={(event) =>
                            updateCraEntry(entry.workDate, { label: event.target.value })
                          }
                          className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                          placeholder="Mission client, support, intervention..."
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => toggleCraWorkDate(entry.workDate)}
                        >
                          Retirer
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg bg-slate-50 px-4 py-6 text-sm text-[#0A1A2F]/65">
                    Aucun jour selectionne pour cette periode.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
