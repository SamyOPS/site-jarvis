import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type {
  AdminAssignmentUser,
  AdminDocumentType,
  AdminRhTypeRestrictions,
  AdminStatus,
} from "@/features/dashboard/admin/types";

type AdminAssignmentsCardProps = {
  rhProfiles: AdminAssignmentUser[];
  salarieProfiles: AdminAssignmentUser[];
  documentTypes: AdminDocumentType[];
  selectedRhId: string;
  selectedRh: AdminAssignmentUser | null;
  selectedEmployeeIds: string[];
  selectedRestrictions: AdminRhTypeRestrictions;
  assignmentStatus: AdminStatus;
  assignmentLoading: boolean;
  assignmentSaving: boolean;
  hasAccessToken: boolean;
  onSelectedRhIdChange: (value: string) => void;
  onToggleAssignedEmployee: (employeeId: string) => void;
  onToggleEmployeeDocumentType: (employeeId: string, documentTypeId: string) => void;
  onReload: () => void | Promise<void>;
  onSave: () => void | Promise<void>;
};

export function AdminAssignmentsCard({
  rhProfiles,
  salarieProfiles,
  documentTypes,
  selectedRhId,
  selectedRh,
  selectedEmployeeIds,
  selectedRestrictions,
  assignmentStatus,
  assignmentLoading,
  assignmentSaving,
  hasAccessToken,
  onSelectedRhIdChange,
  onToggleAssignedEmployee,
  onToggleEmployeeDocumentType,
  onReload,
  onSave,
}: AdminAssignmentsCardProps) {
  return (
    <Card className="border-slate-200 bg-white text-[#0A1A2F] shadow-lg backdrop-blur">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-xl">Affectations RH / Collaborateurs</CardTitle>
          <CardDescription className="text-[#0A1A2F]/70">
            Definis quels collaborateurs chaque RH peut voir et gerer.
          </CardDescription>
        </div>
        <Badge variant="outline" className="border-slate-300 text-[#0A1A2F]">
          {rhProfiles.length} RH
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {assignmentStatus.type !== "idle" && (
          <div
            className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
              assignmentStatus.type === "error"
                ? "border-red-300 bg-red-50 text-red-900"
                : "border-emerald-300 bg-emerald-50 text-emerald-900"
            }`}
          >
            {assignmentStatus.type === "error" ? (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <p className="leading-relaxed">{assignmentStatus.message}</p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="rh-selector" className="text-[#0A1A2F]/80">
              RH concerne
            </Label>
            <select
              id="rh-selector"
              value={selectedRhId}
              onChange={(event) => onSelectedRhIdChange(event.target.value)}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              disabled={assignmentLoading || assignmentSaving || !rhProfiles.length}
            >
              {!rhProfiles.length && <option value="">Aucun RH</option>}
              {rhProfiles.map((rhProfile) => (
                <option key={rhProfile.id} value={rhProfile.id}>
                  {(rhProfile.full_name ?? rhProfile.email) + " - " + rhProfile.email}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="text-[#0A1A2F]/70">RH selectionne</p>
            <p className="font-medium">
              {selectedRh ? selectedRh.full_name ?? selectedRh.email : "-"}
            </p>
            <p className="text-xs text-[#0A1A2F]/70">
              {selectedEmployeeIds.length} collaborateur(s) autorise(s)
            </p>
          </div>
        </div>

        <div className="rounded-md border border-slate-200">
          <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium">
            Collaborateurs autorises
          </div>
          <div className="max-h-96 space-y-2 overflow-auto p-3 text-sm">
            {salarieProfiles.length ? (
              salarieProfiles.map((employee) => {
                const isAssigned = selectedEmployeeIds.includes(employee.id);
                const allowedTypeIds = selectedRestrictions[employee.id] ?? [];
                const restricted = allowedTypeIds.length > 0;
                return (
                  <div
                    key={employee.id}
                    className="rounded-md border border-slate-200 bg-white"
                  >
                    <label className="flex items-center justify-between gap-3 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {employee.full_name ?? "Nom non renseigne"}
                        </p>
                        <p className="truncate text-xs text-[#0A1A2F]/70">{employee.email}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => onToggleAssignedEmployee(employee.id)}
                        disabled={assignmentLoading || assignmentSaving || !selectedRhId}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </label>
                    {isAssigned && (
                      <div className="border-t border-slate-100 px-3 py-2">
                        <p className="mb-1.5 text-xs text-[#0A1A2F]/70">
                          Types de documents autorises{" "}
                          {restricted ? (
                            <span className="font-medium text-[#0A1A2F]">
                              ({allowedTypeIds.length} selectionne(s))
                            </span>
                          ) : (
                            <span className="font-medium text-emerald-700">(tous)</span>
                          )}
                        </p>
                        {documentTypes.length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {documentTypes.map((documentType) => {
                              const active = allowedTypeIds.includes(documentType.id);
                              return (
                                <button
                                  key={documentType.id}
                                  type="button"
                                  onClick={() =>
                                    onToggleEmployeeDocumentType(employee.id, documentType.id)
                                  }
                                  disabled={assignmentLoading || assignmentSaving}
                                  className={`rounded-full border px-2.5 py-1 text-xs transition ${
                                    active
                                      ? "border-[#2aa0dd] bg-[#2aa0dd]/10 font-medium text-[#0A1A2F]"
                                      : "border-slate-300 bg-white text-[#0A1A2F]/70 hover:border-slate-400"
                                  }`}
                                >
                                  {documentType.label}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-[#0A1A2F]/60">Aucun type de document actif.</p>
                        )}
                        {restricted && (
                          <p className="mt-1.5 text-[11px] text-[#0A1A2F]/60">
                            Le RH ne pourra voir et gerer que ces types pour ce collaborateur.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-[#0A1A2F]/70">Aucun collaborateur salarie trouve.</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-slate-300 text-[#0A1A2F]"
            disabled={assignmentLoading || assignmentSaving || !hasAccessToken}
            onClick={() => void onReload()}
          >
            Recharger
          </Button>
          <Button
            type="button"
            onClick={() => void onSave()}
            disabled={
              assignmentLoading ||
              assignmentSaving ||
              !hasAccessToken ||
              !selectedRhId
            }
            className="bg-[#2aa0dd] text-[#0A1A2F] hover:bg-[#2493cb]"
          >
            {assignmentSaving ? "Enregistrement..." : "Enregistrer les affectations"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
