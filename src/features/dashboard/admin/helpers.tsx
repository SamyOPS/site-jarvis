import { Badge } from "@/components/ui/badge";
import type { AdminUserActivityRow } from "./types";

export function isRecentlyActive(activity: AdminUserActivityRow | undefined) {
  if (!activity?.lastSignInAt) return false;
  const lastSignIn = new Date(activity.lastSignInAt).getTime();
  if (Number.isNaN(lastSignIn)) return false;
  return Date.now() - lastSignIn <= 15 * 60 * 1000;
}

export function formatLastSignIn(activity: AdminUserActivityRow | undefined) {
  if (!activity?.lastSignInAt) return "Jamais connecte";
  const date = new Date(activity.lastSignInAt);
  if (Number.isNaN(date.getTime())) return "Date de connexion inconnue";
  return date.toLocaleString();
}

export function isProfileActionable(role: string | null) {
  return role === "professional" || role === "salarie" || role === "rh";
}

export function renderStatusBadge(status: string | null) {
  if (!status) return <Badge variant="outline">Inconnu</Badge>;
  if (status === "verified") {
    return (
      <Badge className="bg-emerald-600 text-[#0A1A2F] hover:bg-emerald-600">
        Verifie
      </Badge>
    );
  }
  if (status === "pending") {
    return (
      <Badge className="bg-amber-500 text-[#0A1A2F] hover:bg-amber-500">
        En attente
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge className="bg-red-600 text-[#0A1A2F] hover:bg-red-600">
        Refuse
      </Badge>
    );
  }
  return <Badge variant="outline">{status}</Badge>;
}
