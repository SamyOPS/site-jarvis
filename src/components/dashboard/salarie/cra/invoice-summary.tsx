"use client";

import { computeInvoiceTotals } from "@/features/dashboard/salarie/invoice-totals";
import { cn } from "@/lib/utils";

const amountFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

export function formatInvoiceAmount(value: number) {
  return amountFormatter.format(value);
}

type InvoiceSummaryProps = {
  quantity: number;
  dailyRate: number;
  discountGranted: boolean;
  vatEnabled: boolean;
  amountAlreadyPaid: number;
  fraisKm: number;
  fraisRepas: number;
  fraisNuitee: number;
};

/**
 * Recapitulatif chiffre affiche avant generation. Les libelles et l'ordre des
 * lignes reprennent ceux du bloc de synthese du PDF (voir `buildInvoicePdfContent`),
 * et les montants viennent de la meme fonction de calcul : ce qui est affiche ici
 * est exactement ce qui sera imprime.
 */
export function InvoiceSummary({
  quantity,
  dailyRate,
  discountGranted,
  vatEnabled,
  amountAlreadyPaid,
  fraisKm,
  fraisRepas,
  fraisNuitee,
}: InvoiceSummaryProps) {
  const totals = computeInvoiceTotals({
    quantity,
    dailyRate,
    discountGranted,
    vatEnabled,
    amountAlreadyPaid,
    fraisKm,
    fraisRepas,
    fraisNuitee,
  });

  const rows: { label: string; value: string; muted?: boolean; strong?: boolean }[] = [
    {
      label: `Prestation · ${totals.quantity.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} j × ${formatInvoiceAmount(totals.dailyRate)}`,
      value: formatInvoiceAmount(totals.serviceHt),
    },
  ];

  if (totals.fraisKm > 0) {
    rows.push({ label: "Frais kilometriques", value: formatInvoiceAmount(totals.fraisKm) });
  }
  if (totals.fraisRepas > 0) {
    rows.push({ label: "Frais de repas", value: formatInvoiceAmount(totals.fraisRepas) });
  }
  if (totals.fraisNuitee > 0) {
    rows.push({ label: "Frais de nuitee", value: formatInvoiceAmount(totals.fraisNuitee) });
  }

  rows.push({ label: "Total HT", value: formatInvoiceAmount(totals.totalHt), strong: true });

  if (discountGranted) {
    rows.push({
      label: "Escompte 2%",
      value: `- ${formatInvoiceAmount(totals.discountAmount)}`,
      muted: true,
    });
    rows.push({
      label: "Total HT apres escompte",
      value: formatInvoiceAmount(totals.totalAfterDiscount),
    });
  }

  if (vatEnabled) {
    rows.push({ label: "TVA 20%", value: formatInvoiceAmount(totals.vatAmount), muted: true });
  }

  rows.push({ label: "Total TTC", value: formatInvoiceAmount(totals.totalTtc), strong: true });

  if (totals.amountAlreadyPaid > 0) {
    rows.push({
      label: "Deja paye",
      value: `- ${formatInvoiceAmount(totals.amountAlreadyPaid)}`,
      muted: true,
    });
    rows.push({
      label: "Net a payer",
      value: formatInvoiceAmount(totals.remainingToPay),
      strong: true,
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <dl className="space-y-1.5 text-sm">
        {rows.map((row, index) => (
          <div
            key={`${row.label}-${index}`}
            className={cn(
              "flex items-baseline justify-between gap-4",
              row.strong ? "border-t border-slate-200 pt-1.5" : "",
            )}
          >
            <dt
              className={cn(
                row.strong ? "font-semibold text-[#0A1A2F]" : "text-[#0A1A2F]/70",
                row.muted ? "text-[#0A1A2F]/60" : "",
              )}
            >
              {row.label}
            </dt>
            <dd
              className={cn(
                "shrink-0 tabular-nums",
                row.strong ? "font-semibold text-[#0A1A2F]" : "text-[#0A1A2F]/80",
              )}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
