import { Loader2 } from "lucide-react";

type DashboardLoadingOverlayProps = {
  message: string;
};

export function DashboardLoadingOverlay({
  message,
}: DashboardLoadingOverlayProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm text-[#0A1A2F]">
        <Loader2 className="h-4 w-4 animate-spin" />
        {message}
      </div>
    </div>
  );
}
