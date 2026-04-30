import { ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { renderStatusBadge } from "@/features/dashboard/admin/helpers";
import type { AdminProfileRow } from "@/features/dashboard/admin/types";

type AdminProfileCardProps = {
  adminProfile: AdminProfileRow | null;
};

export function AdminProfileCard({ adminProfile }: AdminProfileCardProps) {
  return (
    <Card className="border-slate-200 bg-white text-[#0A1A2F] shadow-lg backdrop-blur">
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-xl">
          <ShieldCheck className="h-5 w-5" />
          Profil admin
        </CardTitle>
        <CardDescription className="text-[#0A1A2F]/70">
          Informations issues de la table profiles.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-[#0A1A2F]/70">Email</span>
          <span className="font-medium">{adminProfile?.email ?? "-"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#0A1A2F]/70">Nom complet</span>
          <span className="font-medium">
            {adminProfile?.full_name ?? "Non renseigne"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#0A1A2F]/70">Role</span>
          <Badge className="bg-blue-600 text-[#0A1A2F] hover:bg-blue-600">
            {adminProfile?.role ?? "Inconnu"}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#0A1A2F]/70">Statut pro</span>
          {renderStatusBadge(adminProfile?.professional_status ?? null)}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#0A1A2F]/70">Societe</span>
          <span className="font-medium">
            {adminProfile?.company_name ?? "Non renseignee"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
