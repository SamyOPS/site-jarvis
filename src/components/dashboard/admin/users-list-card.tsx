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
import type { AsyncStatus } from "@/domain/common";
import type {
  AdminProfileRow,
  AdminUserActivityRow,
} from "@/features/dashboard/admin/types";

type ProfessionalStatus = "none" | "pending" | "verified" | "rejected";

/** Doit rester aligne sur ASSIGNABLE_ROLES de /api/admin/users/[id], qui fait foi. */
const ASSIGNABLE_ROLES = [
  { value: "candidate", label: "Candidat" },
  { value: "professional", label: "Professionnel" },
  { value: "salarie", label: "Salarie" },
  { value: "rh", label: "RH" },
  { value: "admin", label: "Administrateur" },
] as const;

type AdminUsersListCardProps = {
  allProfiles: AdminProfileRow[];
  activityByUserId: Record<string, AdminUserActivityRow>;
  profileStatus: AsyncStatus;
  userDeleteStatus: AsyncStatus;
  profileUpdatingId: string | null;
  roleUpdatingId: string | null;
  deletingUserId: string | null;
  currentUserId: string | undefined;
  onProfessionalStatusChange: (profileId: string, nextStatus: ProfessionalStatus) => void | Promise<void>;
  onRoleChange: (profile: AdminProfileRow, nextRole: string) => void | Promise<void>;
  onDeleteUser: (profile: AdminProfileRow) => void | Promise<void>;
};

export function AdminUsersListCard({
  allProfiles,
  activityByUserId,
  profileStatus,
  userDeleteStatus,
  profileUpdatingId,
  roleUpdatingId,
  deletingUserId,
  currentUserId,
  onProfessionalStatusChange,
  onRoleChange,
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
            // Reste d'un fond de carte sombre : sur la carte blanche actuelle, text-red-100
            // et text-emerald-50 rendaient le message illisible, donc invisible.
            className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
              profileStatus.type === "error"
                ? "border-red-300 bg-red-50 text-red-900"
                : "border-emerald-300 bg-emerald-50 text-emerald-900"
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
            const isRoleUpdating = roleUpdatingId === profile.id;
            const isDeleting = deletingUserId === profile.id;
            const isSelf = profile.id === currentUserId;
            const activity = activityByUserId[profile.id];
            const recentlyActive = isRecentlyActive(activity);
            return (
              <div
                key={profile.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate font-semibold">{profile.email}</span>
                  {isSelf ? (
                    // Changer son propre type de compte fermerait l'acces a cette page.
                    <Badge
                      variant="outline"
                      className="shrink-0 border-slate-300 text-[#0A1A2F]"
                      title="Tu ne peux pas changer le type de ton propre compte."
                    >
                      {profile.role ?? "inconnu"}
                    </Badge>
                  ) : (
                    <select
                      value={ASSIGNABLE_ROLES.some((role) => role.value === profile.role)
                        ? (profile.role as string)
                        : ""}
                      onChange={(event) => void onRoleChange(profile, event.target.value)}
                      disabled={isRoleUpdating || isDeleting}
                      aria-label={`Type de compte de ${profile.email}`}
                      className="h-8 shrink-0 rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-[#0A1A2F] disabled:opacity-50"
                    >
                      {/* Un role inattendu en base ne doit pas disparaitre du select. */}
                      {ASSIGNABLE_ROLES.some((role) => role.value === profile.role) ? null : (
                        <option value="">{profile.role ?? "inconnu"}</option>
                      )}
                      {ASSIGNABLE_ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {isRoleUpdating ? (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-[#0A1A2F]/60">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Changement du type de compte...
                  </p>
                ) : null}
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
