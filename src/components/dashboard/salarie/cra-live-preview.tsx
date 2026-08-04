"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { PdfPreviewFrame } from "@/components/dashboard/salarie/cra/pdf-preview-frame";
import { buildCraPdfBytes } from "@/lib/cra-pdf";

type BillingProfilePreview = {
  firstName: string;
  lastName: string;
  companyName: string;
  esnPartenaire: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  siret: string;
  iban: string;
  bic: string;
  dailyRate: string;
};

type CraEntryPreview = {
  workDate: string;
  dayQuantity: string;
  label: string;
};

type CraLeaveDaysPreview = {
  paid: string;
  sick: string;
  exceptional: string;
  unpaid: string;
};

/**
 * Les colonnes du profil de facturation sont nullables en base (iban, bic, siret et
 * daily_rate ne concernent que les auto-entrepreneurs) : l'apercu doit tolerer un
 * champ absent plutot que de casser le rendu de la page.
 */
function text(value: string | null | undefined) {
  return (value ?? "").trim();
}

function days(value: string | null | undefined) {
  return Number(value || 0) || 0;
}

type CraLivePreviewProps = {
  billingProfile: BillingProfilePreview;
  periodMonth: string;
  notes: string;
  entries: CraEntryPreview[];
  totalDays: number;
  leaveDays: CraLeaveDaysPreview;
  enabled?: boolean;
  disabledLabel?: string;
};

export function CraLivePreview({
  billingProfile,
  periodMonth,
  notes,
  entries,
  totalDays,
  leaveDays,
  enabled = true,
  disabledLabel,
}: CraLivePreviewProps) {
  // null = chargement en cours, { value } = resolu (le logo peut legitimement etre
  // absent). Distinguer les deux evite de construire un premier PDF sans logo,
  // aussitot remplace par un second avec logo.
  const [logo, setLogo] = useState<{ value: string | null } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    void fetch("/logonoir-rgb120.b64")
      .then((response) => (response.ok ? response.text() : null))
      .then((value) => {
        if (cancelled) return;
        const trimmed = value?.trim() ?? "";
        // Une page d'erreur HTML renvoyee a la place du fichier ferait echouer atob :
        // on valide que le corps ressemble bien a du base64.
        const isBase64 = trimmed.length > 0 && /^[A-Za-z0-9+/\r\n]+={0,2}$/.test(trimmed);
        setLogo({ value: isBase64 ? trimmed : null });
      })
      .catch(() => {
        if (!cancelled) setLogo({ value: null });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const pdfInput = useMemo(
    () => ({
      firstName: text(billingProfile.firstName),
      lastName: text(billingProfile.lastName),
      companyName: text(billingProfile.companyName),
      esnPartenaire: text(billingProfile.esnPartenaire) || null,
      addressLine1: text(billingProfile.addressLine1),
      addressLine2: text(billingProfile.addressLine2) || null,
      postalCode: text(billingProfile.postalCode),
      city: text(billingProfile.city),
      country: text(billingProfile.country),
      phone: text(billingProfile.phone),
      email: text(billingProfile.email),
      siret: text(billingProfile.siret) || null,
      iban: text(billingProfile.iban),
      bic: text(billingProfile.bic),
      dailyRate: Number(billingProfile.dailyRate || 0),
      workedDaysCount: totalDays,
      paidLeaveDays: days(leaveDays.paid),
      sickLeaveDays: days(leaveDays.sick),
      exceptionalLeaveDays: days(leaveDays.exceptional),
      unpaidLeaveDays: days(leaveDays.unpaid),
      periodMonth: periodMonth || new Date().toISOString().slice(0, 7),
      notes: text(notes) || null,
      entries: entries
        .filter(
          (entry) =>
            text(entry.workDate) || text(entry.label) || Number(entry.dayQuantity || 0) > 0,
        )
        .map((entry) => ({
          workDate: text(entry.workDate),
          dayQuantity: Number(entry.dayQuantity || 0),
          label: text(entry.label) || null,
        })),
    }),
    [billingProfile, entries, leaveDays, notes, periodMonth, totalDays],
  );

  const logoValue = logo?.value ?? null;
  const build = useCallback(() => buildCraPdfBytes(pdfInput, logoValue), [logoValue, pdfInput]);

  return (
    <PdfPreviewFrame
      title="Apercu PDF CRA"
      build={build}
      enabled={enabled && logo !== null}
      disabledLabel={disabledLabel}
    />
  );
}
