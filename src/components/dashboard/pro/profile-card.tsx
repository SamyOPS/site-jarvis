import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ProProfileRow } from "@/features/dashboard/pro/types";

type ProProfileCardProps = {
  profile: ProProfileRow | null;
};

export function ProProfileCard({ profile }: ProProfileCardProps) {
  return (
    <Card className="border-slate-200 bg-white text-[#0A1A2F] shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Profil</CardTitle>
        <CardDescription className="text-[#0A1A2F]/70">
          Informations issues de la table profiles.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-[#0A1A2F]/70">Email</span>
          <span className="font-medium">{profile?.email ?? "-"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#0A1A2F]/70">Nom complet</span>
          <span className="font-medium">{profile?.full_name ?? "Non renseigne"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#0A1A2F]/70">Entreprise</span>
          <span className="font-medium">{profile?.company_name ?? "Non renseignée"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#0A1A2F]/70">Role</span>
          <Badge variant="outline" className="border-slate-300 text-[#0A1A2F]">
            {profile?.role ?? "professional"}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#0A1A2F]/70">Statut pro</span>
          <Badge variant="outline" className="border-slate-300 text-[#0A1A2F]">
            {profile?.professional_status ?? "inconnu"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
