"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type LeaveRequestPayload = {
  startDate: string;
  endDate: string;
  leaveType: "paid" | "unpaid";
};

type SalarieLeaveRequestEditorProps = {
  generating: boolean;
  onGenerate: (payload: LeaveRequestPayload) => void | Promise<void>;
};

export function SalarieLeaveRequestEditor({
  generating,
  onGenerate,
}: SalarieLeaveRequestEditorProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [leaveType, setLeaveType] = useState<"paid" | "unpaid">("paid");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const daysCount =
    startDate && endDate && endDate >= startDate
      ? Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000) + 1
      : 0;

  const handleSubmit = () => {
    const nextErrors: Record<string, string> = {};
    if (!startDate) nextErrors.startDate = "La date de debut est obligatoire.";
    if (!endDate) nextErrors.endDate = "La date de fin est obligatoire.";
    if (startDate && endDate && endDate < startDate) {
      nextErrors.endDate = "La date de fin doit etre posterieure ou egale au debut.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    void onGenerate({
      startDate,
      endDate,
      leaveType,
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-[#0A1A2F]/80">
        Renseigne les informations puis genere un PDF de demande de congé, ajoute a tes documents.
      </div>

      <div className="max-w-3xl">
        <Card className="border-0 shadow-none">
          <CardHeader className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Nouvelle demande de congé</CardTitle>
              <p className="mt-1 text-sm text-[#0A1A2F]/70">
                Le document sera transmis a ton RH pour validation.
              </p>
            </div>
            <Button type="button" size="sm" onClick={handleSubmit} disabled={generating}>
              {generating ? "Generation..." : "Generer la demande"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1">
              <label className="text-sm font-medium">Type de congé</label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="leaveType"
                    checked={leaveType === "paid"}
                    onChange={() => setLeaveType("paid")}
                  />
                  Congé payé
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="leaveType"
                    checked={leaveType === "unpaid"}
                    onChange={() => setLeaveType("unpaid")}
                  />
                  Congé sans solde
                </label>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Date de debut" error={errors.startDate}>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                />
              </Field>
              <Field label="Date de fin" error={errors.endDate}>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                />
              </Field>
            </div>

            {daysCount > 0 && (
              <p className="text-sm text-[#0A1A2F]/70">
                Duree : <span className="font-semibold text-[#0A1A2F]">{daysCount} jour(s)</span> (calendaires).
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
