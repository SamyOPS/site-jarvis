"use client";

import { useEffect, useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type CraLivePreviewProps = {
  billingProfile: BillingProfilePreview;
  periodMonth: string;
  notes: string;
  entries: CraEntryPreview[];
  totalDays: number;
};

export function CraLivePreview({
  billingProfile,
  periodMonth,
  notes,
  entries,
  totalDays,
}: CraLivePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [logoRgbBase64, setLogoRgbBase64] = useState<string | null>(null);

  const pdfInput = useMemo(
    () => ({
      firstName: billingProfile.firstName.trim(),
      lastName: billingProfile.lastName.trim(),
      companyName: billingProfile.companyName.trim(),
      esnPartenaire: billingProfile.esnPartenaire.trim() || null,
      addressLine1: billingProfile.addressLine1.trim(),
      addressLine2: billingProfile.addressLine2.trim() || null,
      postalCode: billingProfile.postalCode.trim(),
      city: billingProfile.city.trim(),
      country: billingProfile.country.trim(),
      phone: billingProfile.phone.trim(),
      email: billingProfile.email.trim(),
      siret: billingProfile.siret.trim(),
      iban: billingProfile.iban.trim(),
      bic: billingProfile.bic.trim(),
      dailyRate: Number(billingProfile.dailyRate || 0),
      workedDaysCount: totalDays,
      periodMonth: periodMonth || new Date().toISOString().slice(0, 7),
      notes: notes.trim() || null,
      entries: entries
        .filter(
          (entry) =>
            entry.workDate.trim() ||
            entry.label.trim() ||
            Number(entry.dayQuantity || 0) > 0,
        )
        .map((entry) => ({
          workDate: entry.workDate.trim(),
          dayQuantity: Number(entry.dayQuantity || 0),
          label: entry.label.trim() || null,
        })),
    }),
    [billingProfile, entries, notes, periodMonth, totalDays],
  );

  useEffect(() => {
    let cancelled = false;

    void fetch("/logonoir-rgb120.b64")
      .then((response) => response.text())
      .then((value) => {
        if (!cancelled) {
          setLogoRgbBase64(value.trim());
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLogoRgbBase64(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const pdfBytes = buildCraPdfBytes(pdfInput, logoRgbBase64);
    const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });
    const nextUrl = URL.createObjectURL(pdfBlob);

    setPreviewUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
      return nextUrl;
    });

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [logoRgbBase64, pdfInput]);

  return (
    <Card className="border-slate-200 shadow-none xl:sticky xl:top-6">
      <CardHeader>
        <CardTitle className="text-base">PDF en direct</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-[#0A1A2F]/70">
          Apercu du PDF final genere a partir des donnees saisies.
        </p>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          {previewUrl ? (
            <iframe
              title="Apercu PDF CRA"
              src={previewUrl}
              className="h-[760px] w-full bg-white"
            />
          ) : (
            <div className="flex h-[760px] items-center justify-center text-sm text-[#0A1A2F]/60">
              Generation de l&apos;apercu...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
