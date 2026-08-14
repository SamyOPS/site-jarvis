"use client";

import {
  LeaveRequestEditor,
  type LeaveRequestBasePayload,
} from "@/components/dashboard/documents/leave-request-editor";

export type LeaveRequestPayload = LeaveRequestBasePayload;

type SalarieLeaveRequestEditorProps = {
  generating: boolean;
  onGenerate: (payload: LeaveRequestPayload) => void | Promise<void>;
};

export function SalarieLeaveRequestEditor({
  generating,
  onGenerate,
}: SalarieLeaveRequestEditorProps) {
  return (
    <LeaveRequestEditor
      generating={generating}
      onGenerate={onGenerate}
      radioName="leaveType"
      subtitle="Le document sera transmis a ton RH pour validation."
      hint={
        <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-[#0A1A2F]/80">
          Renseigne les informations puis genere un PDF de demande de congé, ajoute a tes documents.
        </div>
      }
    />
  );
}
