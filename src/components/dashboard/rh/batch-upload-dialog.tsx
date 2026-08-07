"use client";

import { useMemo } from "react";
import { AlertTriangle, Check, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getBatchRowIssue,
  type BatchRowIssue,
  type BatchUploadRow,
} from "@/features/dashboard/rh/document-batch";
import type { RhDocumentTypeRow, RhProfileRow } from "@/features/dashboard/rh/types";
import { cn } from "@/lib/utils";

const issueLabels: Record<Exclude<BatchRowIssue, null>, string> = {
  "no-employee": "Collaborateur a choisir",
  "no-type": "Type a choisir",
  "missing-period": "Periode obligatoire",
};

type BatchUploadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: BatchUploadRow[];
  employees: RhProfileRow[];
  documentTypes: RhDocumentTypeRow[];
  defaultDocumentTypeId: string;
  onDefaultDocumentTypeChange: (documentTypeId: string) => void;
  onFilesSelected: (files: File[]) => void;
  onRowChange: (key: string, patch: Partial<BatchUploadRow>) => void;
  onRemoveRow: (key: string) => void;
  /** Types autorises pour ce collaborateur, ou null si aucune restriction. */
  allowedTypeIdsForEmployee: (employeeId: string) => Set<string> | null;
  /** Signale qu'un document de meme collaborateur / type / periode existe deja. */
  isDuplicate: (row: BatchUploadRow) => boolean;
  onSubmit: () => void | Promise<void>;
  uploading: boolean;
};

export function RhBatchUploadDialog({
  open,
  onOpenChange,
  rows,
  employees,
  documentTypes,
  defaultDocumentTypeId,
  onDefaultDocumentTypeChange,
  onFilesSelected,
  onRowChange,
  onRemoveRow,
  allowedTypeIdsForEmployee,
  isDuplicate,
  onSubmit,
  uploading,
}: BatchUploadDialogProps) {
  const employeeLabel = (employee: RhProfileRow) => employee.full_name ?? employee.email;

  const readyRows = useMemo(
    () => rows.filter((row) => row.status !== "done" && !getBatchRowIssue(row, documentTypes)),
    [documentTypes, rows],
  );
  const blockedCount = rows.filter(
    (row) => row.status !== "done" && Boolean(getBatchRowIssue(row, documentTypes)),
  ).length;
  const doneCount = rows.filter((row) => row.status === "done").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Deposer un lot de documents</DialogTitle>
          <DialogDescription>
            Le collaborateur et la periode sont deduits du nom du fichier (annee mois nom).
            Verifie chaque ligne avant de deposer : le collaborateur est notifie par e-mail.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Type par defaut du lot</label>
              <select
                value={defaultDocumentTypeId}
                onChange={(event) => onDefaultDocumentTypeChange(event.target.value)}
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
              >
                <option value="">Choisir un type</option>
                {documentTypes.map((documentType) => (
                  <option key={documentType.id} value={documentType.id}>
                    {documentType.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Fichiers</label>
              <input
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={(event) => onFilesSelected(Array.from(event.target.files ?? []))}
                className="block w-full text-xs text-[#0A1A2F]/70 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-medium"
              />
            </div>
          </div>

          {rows.length ? (
            <>
              <p className="text-sm text-[#0A1A2F]/70">
                {rows.length} fichier{rows.length > 1 ? "s" : ""} · {readyRows.length} pret
                {readyRows.length > 1 ? "s" : ""}
                {blockedCount ? ` · ${blockedCount} a verifier` : ""}
                {doneCount ? ` · ${doneCount} depose${doneCount > 1 ? "s" : ""}` : ""}
              </p>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[52rem] text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-[#0A1A2F]/55">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Fichier</th>
                      <th className="px-3 py-2 text-left font-medium">Collaborateur</th>
                      <th className="px-3 py-2 text-left font-medium">Type</th>
                      <th className="px-3 py-2 text-left font-medium">Periode</th>
                      <th className="px-3 py-2 text-left font-medium">Etat</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => {
                      const issue = getBatchRowIssue(row, documentTypes);
                      const allowed = allowedTypeIdsForEmployee(row.employeeId);
                      const selectableTypes = allowed
                        ? documentTypes.filter((type) => allowed.has(type.id))
                        : documentTypes;
                      const duplicate = !issue && row.status === "pending" && isDuplicate(row);

                      return (
                        <tr
                          key={row.key}
                          className={cn(
                            row.status === "done" ? "bg-emerald-50/40" : "",
                            row.status === "error" ? "bg-red-50/40" : "",
                          )}
                        >
                          <td className="max-w-[16rem] truncate px-3 py-2" title={row.file.name}>
                            {row.file.name}
                          </td>

                          <td className="px-3 py-2">
                            <select
                              value={row.employeeId}
                              onChange={(event) =>
                                onRowChange(row.key, { employeeId: event.target.value })
                              }
                              disabled={row.status === "done" || uploading}
                              className={cn(
                                "h-9 w-full min-w-[11rem] rounded-md border px-2 text-sm",
                                row.employeeId ? "border-slate-300" : "border-amber-400 bg-amber-50",
                              )}
                            >
                              <option value="">
                                {row.match.status === "ambiguous"
                                  ? `${row.match.candidateIds.length} correspondances`
                                  : "Aucune correspondance"}
                              </option>
                              {/* Les homonymes detectes sont proposes en tete de liste. */}
                              {row.match.status === "ambiguous"
                                ? employees
                                    .filter((employee) => row.match.candidateIds.includes(employee.id))
                                    .map((employee) => (
                                      <option key={`c-${employee.id}`} value={employee.id}>
                                        {employeeLabel(employee)}
                                      </option>
                                    ))
                                : null}
                              {employees
                                .filter((employee) => !row.match.candidateIds.includes(employee.id))
                                .map((employee) => (
                                  <option key={employee.id} value={employee.id}>
                                    {employeeLabel(employee)}
                                  </option>
                                ))}
                            </select>
                          </td>

                          <td className="px-3 py-2">
                            <select
                              value={row.documentTypeId}
                              onChange={(event) =>
                                onRowChange(row.key, { documentTypeId: event.target.value })
                              }
                              disabled={row.status === "done" || uploading}
                              className="h-9 w-full min-w-[10rem] rounded-md border border-slate-300 px-2 text-sm"
                            >
                              <option value="">Choisir</option>
                              {selectableTypes.map((documentType) => (
                                <option key={documentType.id} value={documentType.id}>
                                  {documentType.label}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="px-3 py-2">
                            <input
                              type="month"
                              value={row.periodMonth}
                              onChange={(event) =>
                                onRowChange(row.key, { periodMonth: event.target.value })
                              }
                              disabled={row.status === "done" || uploading}
                              className={cn(
                                "h-9 w-[9.5rem] rounded-md border px-2 text-sm",
                                issue === "missing-period"
                                  ? "border-amber-400 bg-amber-50"
                                  : "border-slate-300",
                              )}
                            />
                          </td>

                          <td className="px-3 py-2">
                            {row.status === "uploading" ? (
                              <span className="flex items-center gap-1.5 text-xs text-[#0A1A2F]/70">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Depot...
                              </span>
                            ) : row.status === "done" ? (
                              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                                <Check className="h-3.5 w-3.5" />
                                Depose
                              </span>
                            ) : row.status === "error" ? (
                              <span
                                className="flex items-center gap-1.5 text-xs text-red-700"
                                title={row.error ?? undefined}
                              >
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                <span className="max-w-[12rem] truncate">
                                  {row.error ?? "Echec"}
                                </span>
                              </span>
                            ) : issue ? (
                              <span className="flex items-center gap-1.5 text-xs text-amber-800">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                {issueLabels[issue]}
                              </span>
                            ) : duplicate ? (
                              <span className="text-xs text-amber-800">Existe deja</span>
                            ) : (
                              <span className="text-xs text-[#0A1A2F]/55">Pret</span>
                            )}
                          </td>

                          <td className="px-3 py-2 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-[#0A1A2F]/50 hover:text-red-600"
                              onClick={() => onRemoveRow(row.key)}
                              disabled={uploading}
                              aria-label={`Retirer ${row.file.name}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="rounded-lg bg-slate-50 px-4 py-6 text-sm text-[#0A1A2F]/60">
              Choisis les fichiers a deposer. Le nom attendu est de la forme
              « 2026 08 Dupont.pdf ».
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <Button
            type="button"
            onClick={() => void onSubmit()}
            disabled={uploading || !readyRows.length}
          >
            {uploading
              ? "Depot en cours..."
              : `Deposer ${readyRows.length} fichier${readyRows.length > 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
