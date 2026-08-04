"use client";

import { useCallback, useMemo } from "react";

import { PdfPreviewFrame } from "@/components/dashboard/salarie/cra/pdf-preview-frame";
import {
  buildInvoicePreviewInput,
  type InvoicePreviewEntry,
  type InvoicePreviewProfile,
  type InvoicePreviewSettings,
} from "@/features/dashboard/salarie/invoice-preview-input";
import { buildInvoicePdfBytes } from "@/lib/invoice-pdf";

type InvoiceLivePreviewProps = {
  billingProfile: InvoicePreviewProfile;
  entries: InvoicePreviewEntry[];
  periodMonth: string;
  totalDays: number;
  settings: InvoicePreviewSettings;
  /** Rang provisoire de la facture dans le mois. */
  sequence: number;
  /**
   * Horodatage d'emission. Fourni par le parent pour que l'apercu ne se reconstruise
   * pas en boucle : un `new Date()` cree ici changerait a chaque rendu.
   */
  issuedAtIso: string;
  enabled?: boolean;
  disabledLabel?: string;
};

export function InvoiceLivePreview({
  billingProfile,
  entries,
  periodMonth,
  totalDays,
  settings,
  sequence,
  issuedAtIso,
  enabled = true,
  disabledLabel,
}: InvoiceLivePreviewProps) {
  const pdfInput = useMemo(
    () =>
      buildInvoicePreviewInput({
        profile: billingProfile,
        entries,
        periodMonth,
        totalDays,
        settings,
        sequence,
        issuedAt: new Date(issuedAtIso),
      }),
    [billingProfile, entries, issuedAtIso, periodMonth, sequence, settings, totalDays],
  );

  const build = useCallback(() => buildInvoicePdfBytes(pdfInput), [pdfInput]);

  return (
    <PdfPreviewFrame
      title="Apercu PDF facture"
      build={build}
      enabled={enabled}
      disabledLabel={disabledLabel}
    />
  );
}
