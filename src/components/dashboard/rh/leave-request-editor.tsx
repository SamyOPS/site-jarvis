"use client";

import { useState } from "react";

import {
  LeaveRequestEditor,
  LeaveRequestField,
  type LeaveRequestBasePayload,
} from "@/components/dashboard/documents/leave-request-editor";

export type RhLeaveRequestPayload = LeaveRequestBasePayload & {
  employeeId: string;
};

type RhLeaveRequestEditorProps = {
  employees: { id: string; full_name: string | null; email: string }[];
  generating: boolean;
  onGenerate: (payload: RhLeaveRequestPayload) => void | Promise<void>;
};

/**
 * Demande de conge cote RH : le formulaire commun, plus le choix du collaborateur.
 *
 * Le selecteur garde son etat ici et complete le payload a la soumission — le formulaire
 * partage n'a pas a connaitre la notion de collaborateur, qui n'existe que de ce cote.
 */
export function RhLeaveRequestEditor({
  employees,
  generating,
  onGenerate,
}: RhLeaveRequestEditorProps) {
  const [employeeId, setEmployeeId] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");

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

  return (
    <LeaveRequestEditor
      generating={generating}
      onGenerate={(payload) => onGenerate({ ...payload, employeeId })}
      radioName="rhLeaveType"
      subtitle="Selectionne le collaborateur, le type et les dates."
      extraField={{
        validate: () => (employeeId ? null : "Selectionne un collaborateur."),
        render: (error) => (
          <LeaveRequestField label="Collaborateur" error={error}>
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
          </LeaveRequestField>
        ),
      }}
    />
  );
}
