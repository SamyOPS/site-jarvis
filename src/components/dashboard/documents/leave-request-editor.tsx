"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type LeaveRequestBasePayload = {
  startDate: string;
  endDate: string;
  leaveType: "paid" | "unpaid";
};

/**
 * Champ supplementaire insere en tete du formulaire.
 *
 * L'appelant garde son etat : il fournit le rendu et un validateur, et complete le
 * payload dans son propre `onGenerate`. C'est ce qui evite de remonter dans ce composant
 * un `employeeId` qui ne concerne qu'un seul des deux appelants.
 */
export type LeaveRequestExtraField = {
  render: (error?: string) => ReactNode;
  /** Message d'erreur, ou `null` si le champ est valide. */
  validate: () => string | null;
};

type LeaveRequestEditorProps = {
  generating: boolean;
  onGenerate: (payload: LeaveRequestBasePayload) => void | Promise<void>;
  /** Phrase sous le titre de la carte. */
  subtitle: string;
  /** Encart d'explication affiche au-dessus de la carte. */
  hint?: ReactNode;
  /**
   * Nom du groupe de boutons radio. Deux editeurs peuvent coexister dans la meme page :
   * un nom partage ferait basculer les deux ensemble.
   */
  radioName: string;
  extraField?: LeaveRequestExtraField;
};

/**
 * Formulaire de demande de conge : type, dates, duree calculee et validation.
 *
 * Les espaces RH et salarie en portaient chacun une copie. Elles ne differaient que par
 * l'encart d'introduction, la phrase de sous-titre et — pour le RH — un selecteur de
 * collaborateur, ici branche par `extraField`.
 */
export function LeaveRequestEditor({
  generating,
  onGenerate,
  subtitle,
  hint,
  radioName,
  extraField,
}: LeaveRequestEditorProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [leaveType, setLeaveType] = useState<"paid" | "unpaid">("paid");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Duree calendaire, bornes incluses.
  const daysCount =
    startDate && endDate && endDate >= startDate
      ? Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000) + 1
      : 0;

  const handleSubmit = () => {
    const nextErrors: Record<string, string> = {};

    const extraError = extraField?.validate() ?? null;
    if (extraError) nextErrors.extra = extraError;

    if (!startDate) nextErrors.startDate = "La date de debut est obligatoire.";
    if (!endDate) nextErrors.endDate = "La date de fin est obligatoire.";
    if (startDate && endDate && endDate < startDate) {
      nextErrors.endDate = "La date de fin doit etre posterieure ou egale au debut.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    void onGenerate({ startDate, endDate, leaveType });
  };

  return (
    <div className="space-y-6">
      {hint}

      <div className="max-w-3xl">
        <Card className="border-0 shadow-none">
          <CardHeader className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Nouvelle demande de congé</CardTitle>
              <p className="mt-1 text-sm text-[#0A1A2F]/70">{subtitle}</p>
            </div>
            <Button type="button" size="sm" onClick={handleSubmit} disabled={generating}>
              {generating ? "Generation..." : "Generer la demande"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            {extraField?.render(errors.extra)}

            <div className="space-y-1">
              <label className="text-sm font-medium">Type de congé</label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={radioName}
                    checked={leaveType === "paid"}
                    onChange={() => setLeaveType("paid")}
                  />
                  Congé payé
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={radioName}
                    checked={leaveType === "unpaid"}
                    onChange={() => setLeaveType("unpaid")}
                  />
                  Congé sans solde
                </label>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <LeaveRequestField label="Date de debut" error={errors.startDate}>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                />
              </LeaveRequestField>
              <LeaveRequestField label="Date de fin" error={errors.endDate}>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                />
              </LeaveRequestField>
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

/** Libelle, champ et message d'erreur. Exporte pour les champs fournis par l'appelant. */
export function LeaveRequestField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
