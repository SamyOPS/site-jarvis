import { AlertCircle, CheckCircle2, Loader2, Trash2, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatLastSignIn,
  isProfileActionable,
  isRecentlyActive,
  renderStatusBadge,
} from "@/features/dashboard/admin/helpers";
import type {
  AdminProfileRow,
  AdminStatus,
  AdminUserActivityRow,
} from "@/features/dashboard/admin/types";

type ProfessionalStatus = "none" | "pending" | "verified" | "rejected";

type AdminUsersListCardProps = {
  allProfiles: AdminProfileRow[];
  activityByUserId: Record<string, AdminUserActivityRow>;
  profileStatus: AdminStatus;
  userDeleteStatus: AdminStatus;
  profileUpdatingId: string | null;
  deletingUserId: string | null;
  currentUserId: string | undefined;
  onProfessionalStatusChange: (profileId: string, nextStatus: ProfessionalStatus) => void | Promise<void>;
  onDeleteUser: (profile: AdminProfileRow) => void | Promise<void>;
};

export function AdminUsersListCard({
  allProfiles,
  activityByUserId,
  profileStatus,
  userDeleteStatus,
  profileUpdatingId,
  deletingUserId,
  currentUserId,
  onProfessionalStatusChange,
  onDeleteUser,
}: AdminUsersListCardProps) {
  return (
    <Card className="border-slate-200 bg-white text-[#0A1A2F] shadow-lg backdrop-blur">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Users className="h-5 w-5" />
            Utilisateurs
          </CardTitle>
          <CardDescription className="text-[#0A1A2F]/70">
            Liste issue de la table profiles (visible uniquement en admin).
          </CardDescription>
        </div>
        <Badge variant="outline" className="border-slate-300 text-[#0A1A2F]">
          {allProfiles.length} comptes
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {profileStatus.type !== "idle" && (
          <div
            className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
              profileStatus.type === "error"
                ? "border-red-400/70 bg-red-500/10 text-red-100"
                : "border-emerald-400/70 bg-emerald-500/10 text-emerald-50"
            }`}
          >
            {profileStatus.type === "error" ? (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <p className="leading-relaxed">{profileStatus.message}</p>
          </div>
        )}
        {userDeleteStatus.type !== "idle" && (
          <div
            className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
              userDeleteStatus.type === "error"
                ? "border-red-300 bg-red-50 text-red-900"
                : "border-emerald-300 bg-emerald-50 text-emerald-900"
            }`}
          >
            {userDeleteStatus.type === "error" ? (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <p className="leading-relaxed">{userDeleteStatus.message}</p>
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {allProfiles.map((profile) => {
            const isUpdating = profileUpdatingId === profile.id;
            const isDeleting = deletingUserId === profile.id;
            const activity = activityByUserId[profile.id];
            const recentlyActive = isRecentlyActive(activity);
            return (
              <div
                key={profile.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{profile.email}</span>
                  <Badge variant="outline" className="border-slate-300 text-[#0A1A2F]">
                    {profile.role ?? "inconnu"}
                  </Badge>
                </div>
                <div className="mt-1 text-[#0A1A2F]/70">
                  {profile.full_name ?? "Nom non renseigne"}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {renderStatusBadge(profile.professional_status)}
                  <Badge variant="outline" className="border-slate-300 text-[#0A1A2F]/80">
                    {profile.company_name ?? "Aucune societe"}
                  </Badge>
                  <Badge
                    className={
                      recentlyActive
                        ? "bg-emerald-600 text-[#0A1A2F] hover:bg-emerald-600"
                        : "bg-slate-100 text-[#0A1A2F] hover:bg-slate-100"
                    }
                  >
                    {recentlyActive ? "Actif recemment" : "Hors ligne"}
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-[#0A1A2F]/70">
                  Derniere connexion : {formatLastSignIn(activity)}
                </div>
                {isProfileActionable(profile.role) && (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isUpdating}
                      onClick={() => onProfessionalStatusChange(profile.id, "verified")}
                      className="border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                    >
                      {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Valider
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isUpdating}
                      onClick={() => onProfessionalStatusChange(profile.id, "pending")}
                      className="border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                    >
                      Remettre en attente
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isUpdating}
                      onClick={() => onProfessionalStatusChange(profile.id, "rejected")}
                      className="border-red-300 bg-red-50 text-red-800 hover:bg-red-100"
                    >
                      Refuser
                    </Button>
                  </div>
                )}
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isDeleting || profile.id === currentUserId}
                    onClick={() => void onDeleteUser(profile)}
                    className="border-red-300 text-red-800 hover:bg-red-50"
                  >
                    {isDeleting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Supprimer le compte
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        {!allProfiles.length && (
          <p className="text-sm text-[#0A1A2F]/70">
            Aucun profil trouve ou RLS empêche la lecture.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
