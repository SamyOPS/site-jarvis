"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type RhLeaveRequestPayload = {
  employeeId: string;
  startDate: string;
  endDate: string;
  leaveType: "paid" | "unpaid";
};

type RhLeaveRequestEditorProps = {
  employees: { id: string; full_name: string | null; email: string }[];
  generating: boolean;
  onGenerate: (payload: RhLeaveRequestPayload) => void | Promise<void>;
};

export function RhLeaveRequestEditor({ employees, generating, onGenerate }: RhLeaveRequestEditorProps) {
  const [employeeId, setEmployeeId] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [leaveType, setLeaveType] = useState<"paid" | "unpaid">("paid");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const daysCount =
    startDate && endDate && endDate >= startDate
      ? Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000) + 1
      : 0;

  const query = employeeSearch.trim().toLowerCase();
  const filteredEmployees = query
    ? employees.filter((employee) =>
        [employee.full_name, employee.email]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
    : employees;

  const handleSubmit = () => {
    const nextErrors: Record<string, string> = {};
    if (!employeeId) nextErrors.employeeId = "Selectionne un collaborateur.";
    if (!startDate) nextErrors.startDate = "La date de debut est obligatoire.";
    if (!endDate) nextErrors.endDate = "La date de fin est obligatoire.";
    if (startDate && endDate && endDate < startDate) {
      nextErrors.endDate = "La date de fin doit etre posterieure ou egale au debut.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    void onGenerate({ employeeId, startDate, endDate, leaveType });
  };

  return (
    <div className="space-y-6">
      <div className="max-w-3xl">
        <Card className="border-0 shadow-none">
          <CardHeader className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Nouvelle demande de congé</CardTitle>
              <p className="mt-1 text-sm text-[#0A1A2F]/70">
                Selectionne le collaborateur, le type et les dates.
              </p>
            </div>
            <Button type="button" size="sm" onClick={handleSubmit} disabled={generating}>
              {generating ? "Generation..." : "Generer la demande"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            <Field label="Collaborateur" error={errors.employeeId}>
              <input
                type="search"
                value={employeeSearch}
                onChange={(event) => setEmployeeSearch(event.target.value)}
                placeholder="Rechercher un collaborateur (nom, email)..."
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              />
              <div className="mt-2 max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-md border border-slate-200">
                {filteredEmployees.length ? (
                  filteredEmployees.map((employee) => {
                    const isSelected = employee.id === employeeId;
                    return (
                      <button
                        key={employee.id}
                        type="button"
                        onClick={() => setEmployeeId(employee.id)}
                        className={`flex w-full flex-col items-start px-3 py-2 text-left transition ${
                          isSelected ? "bg-[#2aa0dd]/10 font-semibold text-[#0A1A2F]" : "hover:bg-slate-50"
                        }`}
                      >
                        <span className="text-sm">{employee.full_name ?? employee.email}</span>
                        {employee.full_name && (
                          <span className="text-xs text-[#0A1A2F]/60">{employee.email}</span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <p className="px-3 py-3 text-sm text-[#0A1A2F]/60">Aucun collaborateur trouvé.</p>
                )}
              </div>
            </Field>

            <div className="space-y-1">
              <label className="text-sm font-medium">Type de congé</label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="rhLeaveType"
                    checked={leaveType === "paid"}
                    onChange={() => setLeaveType("paid")}
                  />
                  Congé payé
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="rhLeaveType"
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
