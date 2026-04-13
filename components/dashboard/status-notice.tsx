import { AlertCircle } from "lucide-react";

type StatusNoticeProps = {
  tone?: "error" | "neutral";
  title?: string;
  message: string;
};

export function StatusNotice({
  tone = "neutral",
  title,
  message,
}: StatusNoticeProps) {
  if (tone === "error") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          {title ? <p className="font-semibold">{title}</p> : null}
          <p>{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-[#0A1A2F]">
      {title ? <p className="font-semibold">{title}</p> : null}
      <p>{message}</p>
    </div>
  );
}
