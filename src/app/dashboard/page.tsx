"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { AlertCircle, ArrowLeft, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AdminProfileCard } from "@/components/dashboard/admin/admin-profile-card";
import { AdminAssignmentsCard } from "@/components/dashboard/admin/assignments-card";
import { AdminNotesCard } from "@/components/dashboard/admin/notes-card";
import { AdminOfferCreateForm } from "@/components/dashboard/admin/offer-create-form";
import { AdminOffersListCard } from "@/components/dashboard/admin/offers-list-card";
import { AdminSessionCard } from "@/components/dashboard/admin/session-card";
import { AdminUsersListCard } from "@/components/dashboard/admin/users-list-card";
import { DashboardLoadingOverlay } from "@/components/dashboard/loading-overlay";
import { forceClientSignOut, safeGetClientSession } from "@/lib/client-auth";
import { browserSupabase } from "@/lib/supabase-browser";
import type {
  AdminAssignmentUser as AssignmentUser,
  AdminJobOffer as JobOffer,
  AdminProfileRow as ProfileRow,
  AdminRhAssignmentsByRh as RhAssignmentsByRh,
  AdminStatus as Status,
  AdminUserActivityRow as UserActivityRow,
} from "@/features/dashboard/admin/types";

const supabase = browserSupabase;

type ProfessionalStatus = "none" | "pending" | "verified" | "rejected";

export default function DashboardPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<ProfileRow | null>(null);
  const [allProfiles, setAllProfiles] = useState<ProfileRow[]>([]);
  const [activityByUserId, setActivityByUserId] = useState<Record<string, UserActivityRow>>({});
  const [jobOffers, setJobOffers] = useState<JobOffer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileStatus, setProfileStatus] = useState<Status>({ type: "idle" });
  const [profileUpdatingId, setProfileUpdatingId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [userDeleteStatus, setUserDeleteStatus] = useState<Status>({ type: "idle" });
  const [offerSaving, setOfferSaving] = useState(false);
  const [offerStatus, setOfferStatus] = useState<Status>({ type: "idle" });
  const [offerActionStatus, setOfferActionStatus] = useState<Status>({ type: "idle" });
  const [offerActionId, setOfferActionId] = useState<string | null>(null);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [offerEditSaving, setOfferEditSaving] = useState(false);
  const [offerEditStatus, setOfferEditStatus] = useState<Status>({ type: "idle" });
  const [rhProfiles, setRhProfiles] = useState<AssignmentUser[]>([]);
  const [salarieProfiles, setSalarieProfiles] = useState<AssignmentUser[]>([]);
  const [assignmentsByRh, setAssignmentsByRh] = useState<RhAssignmentsByRh>({});
  const [selectedRhId, setSelectedRhId] = useState("");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [assignmentStatus, setAssignmentStatus] = useState<Status>({ type: "idle" });
  const [offerEditForm, setOfferEditForm] = useState({
    title: "",
    location: "",
    contract_type: "",
    company_name: "",
    status: "",
    description: "",
    department: "",
    work_mode: "",
    experience_level: "",
    salary_min: "",
    salary_max: "",
    tech_stack: "",
  });
  const [offerForm, setOfferForm] = useState({
    title: "",
    description: "",
    location: "",
    contract_type: "",
    company_name: "",
    department: "",
    work_mode: "",
    experience_level: "",
    salary_min: "",
    salary_max: "",
    tech_stack: "",
  });

  const loadRhCollaboratorAssignments = useCallback(async (accessToken: string) => {
    setAssignmentLoading(true);
    setAssignmentStatus({ type: "idle" });
    const response = await fetch("/api/admin/rh-collaborators", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const payload = (await response.json().catch(() => null)) as
      | {
          error?: string;
          rhs?: AssignmentUser[];
          employees?: AssignmentUser[];
          assignments?: RhAssignmentsByRh;
        }
      | null;
    if (!response.ok) {
      setAssignmentStatus({
        type: "error",
        message: payload?.error ?? "Chargement des affectations impossible.",
      });
      setAssignmentLoading(false);
      return;
    }
    setRhProfiles(payload?.rhs ?? []);
    setSalarieProfiles(payload?.employees ?? []);
    setAssignmentsByRh(payload?.assignments ?? {});
    setAssignmentLoading(false);
  }, []);

  const loadUsersActivity = useCallback(async (accessToken: string) => {
    const response = await fetch("/api/admin/users/activity", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const payload = (await response.json().catch(() => null)) as
      | { error?: string; items?: UserActivityRow[] }
      | null;
    if (!response.ok) {
      setProfileStatus({
        type: "error",
        message: payload?.error ?? "Chargement de l'activite des comptes impossible.",
      });
      return;
    }
    const next = Object.fromEntries((payload?.items ?? []).map((item) => [item.userId, item]));
    setActivityByUserId(next);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setError(
        "Variables NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY manquantes."
      );
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);

      const { session: currentSession, error: sessionError } =
        await safeGetClientSession(supabase);

      if (sessionError) {
        setError(sessionError.message);
        setLoading(false);
        return;
      }

      if (!currentSession) {
        setError("Aucune session active. Connecte-toi avant de continuer.");
        setLoading(false);
        return;
      }

      setSession(currentSession);
      setUser(currentSession.user);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id,email,full_name,role,professional_status,company_name")
        .eq("id", currentSession.user.id)
        .single();

      if (profileError || !profileData) {
        setError(profileError?.message ?? "Profil admin introuvable.");
        setLoading(false);
        return;
      }

      setAdminProfile(profileData);

      if (profileData.role !== "admin") {
        setError("Acces reserve aux administrateurs.");
        setLoading(false);
        return;
      }

      const { data: allProfilesData, error: allProfilesError } = await supabase
        .from("profiles")
        .select("id,email,full_name,role,professional_status,company_name")
        .order("email", { ascending: true });

      if (allProfilesError) {
        setError(allProfilesError.message);
        setLoading(false);
        return;
      }

      setAllProfiles(allProfilesData ?? []);
      await loadRhCollaboratorAssignments(currentSession.access_token);
      await loadUsersActivity(currentSession.access_token);

      const { data: offersData, error: offersError } = await supabase
        .from("job_offers")
        .select(
          "id,title,company_name,status,location,contract_type,description,department,work_mode,experience_level,salary_min,salary_max,tech_stack,published_at"
        )
        .order("published_at", { ascending: false, nullsFirst: false });

      if (offersError) {
        setError(offersError.message);
        setLoading(false);
        return;
      }

      setJobOffers(offersData ?? []);
      setLoading(false);
    };

    void load();
  }, [loadRhCollaboratorAssignments, loadUsersActivity]);

  useEffect(() => {
    if (!rhProfiles.length) {
      setSelectedRhId("");
      return;
    }
    if (!selectedRhId || !rhProfiles.some((profile) => profile.id === selectedRhId)) {
      setSelectedRhId(rhProfiles[0].id);
    }
  }, [rhProfiles, selectedRhId]);

  useEffect(() => {
    if (!selectedRhId) {
      setSelectedEmployeeIds([]);
      return;
    }
    setSelectedEmployeeIds(assignmentsByRh[selectedRhId] ?? []);
  }, [assignmentsByRh, selectedRhId]);

  const sessionExpiry = useMemo(() => {
    if (!session?.expires_at) return null;
    return new Date(session.expires_at * 1000).toLocaleString();
  }, [session]);
  const selectedRh = useMemo(
    () => rhProfiles.find((profile) => profile.id === selectedRhId) ?? null,
    [rhProfiles, selectedRhId]
  );

  const handleSignOut = async () => {
    if (!supabase) return;
    await forceClientSignOut(supabase);
    window.location.href = "/auth?logged_out=1";
  };

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120);

  const handleProfessionalStatusChange = async (
    profileId: string,
    nextStatus: ProfessionalStatus
  ) => {
    if (!supabase) {
      setProfileStatus({
        type: "error",
        message: "Configuration Supabase manquante.",
      });
      return;
    }

    setProfileUpdatingId(profileId);
    setProfileStatus({ type: "idle" });

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ professional_status: nextStatus })
      .eq("id", profileId);

    if (updateError) {
      setProfileStatus({ type: "error", message: updateError.message });
    } else {
      setProfileStatus({
        type: "success",
        message: `Statut mis a jour en ${nextStatus}.`,
      });
      setAllProfiles((prev) =>
        prev.map((profile) =>
          profile.id === profileId
            ? { ...profile, professional_status: nextStatus }
            : profile
        )
      );
    }

    setProfileUpdatingId(null);
  };

  const handleDeleteUser = async (targetProfile: ProfileRow) => {
    if (!session?.access_token) {
      setUserDeleteStatus({ type: "error", message: "Session admin manquante." });
      return;
    }
    if (targetProfile.id === user?.id) {
      setUserDeleteStatus({
        type: "error",
        message: "Tu ne peux pas supprimer ton propre compte admin.",
      });
      return;
    }
    const confirmed = window.confirm(
      `Supprimer definitivement le compte ${targetProfile.email} ?`
    );
    if (!confirmed) return;

    setDeletingUserId(targetProfile.id);
    setUserDeleteStatus({ type: "idle" });
    const response = await fetch(
      `/api/admin/users/${encodeURIComponent(targetProfile.id)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setUserDeleteStatus({
        type: "error",
        message: payload?.error ?? "Suppression du compte impossible.",
      });
      setDeletingUserId(null);
      return;
    }

    setAllProfiles((previous) => previous.filter((profile) => profile.id !== targetProfile.id));
    setRhProfiles((previous) => previous.filter((profile) => profile.id !== targetProfile.id));
    setSalarieProfiles((previous) =>
      previous.filter((profile) => profile.id !== targetProfile.id)
    );
    setAssignmentsByRh((previous) => {
      const next = Object.fromEntries(
        Object.entries(previous)
          .filter(([rhId]) => rhId !== targetProfile.id)
          .map(([rhId, employeeIds]) => [
            rhId,
            employeeIds.filter((employeeId) => employeeId !== targetProfile.id),
          ])
      );
      return next;
    });
    if (selectedRhId === targetProfile.id) {
      setSelectedRhId("");
    }

    setUserDeleteStatus({
      type: "success",
      message: `Compte ${targetProfile.email} supprime.`,
    });
    setDeletingUserId(null);
  };

  const buildUniqueSlug = (title: string) => {
    const base = slugify(title) || "offre";
    const suffix = crypto.randomUUID().slice(0, 8);
    return `${base}-${suffix}`;
  };

  const toggleAssignedEmployee = (employeeId: string) => {
    setSelectedEmployeeIds((previous) =>
      previous.includes(employeeId)
        ? previous.filter((id) => id !== employeeId)
        : [...previous, employeeId]
    );
  };

  const handleSaveAssignments = async () => {
    if (!session?.access_token || !selectedRhId) return;
    setAssignmentSaving(true);
    setAssignmentStatus({ type: "idle" });
    const response = await fetch("/api/admin/rh-collaborators", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rhId: selectedRhId,
        employeeIds: selectedEmployeeIds,
      }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setAssignmentStatus({
        type: "error",
        message: payload?.error ?? "Enregistrement des affectations impossible.",
      });
      setAssignmentSaving(false);
      return;
    }
    setAssignmentsByRh((previous) => ({
      ...previous,
      [selectedRhId]: selectedEmployeeIds,
    }));
    setAssignmentStatus({
      type: "success",
      message: "Affectations RH mises a jour.",
    });
    setAssignmentSaving(false);
  };

  const handleOfferSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !adminProfile) return;

    setOfferSaving(true);
    setOfferStatus({ type: "idle" });

    const payload = {
      title: offerForm.title,
      slug: buildUniqueSlug(offerForm.title),
      description: offerForm.description,
      location: offerForm.location || null,
      contract_type: offerForm.contract_type || null,
      company_name: offerForm.company_name || adminProfile.company_name || null,
      status: "published",
      created_by: adminProfile.id,
      department: offerForm.department || null,
      work_mode: offerForm.work_mode || null,
      experience_level: offerForm.experience_level || null,
      salary_min: offerForm.salary_min ? Number(offerForm.salary_min) : null,
      salary_max: offerForm.salary_max ? Number(offerForm.salary_max) : null,
      tech_stack: offerForm.tech_stack
        ? offerForm.tech_stack.split(",").map((s) => s.trim()).filter(Boolean)
        : null,
      published_at: new Date().toISOString(),
    };

    const { data, error: insertError } = await supabase
      .from("job_offers")
      .insert(payload)
      .select(
        "id,title,company_name,status,location,contract_type,description,department,work_mode,experience_level,salary_min,salary_max,tech_stack,published_at"
      )
      .single();

    if (insertError) {
      setOfferStatus({ type: "error", message: insertError.message });
    } else {
      setOfferStatus({ type: "success", message: "Offre créée." });
      if (data) {
        setJobOffers((prev) => [data, ...prev]);
      }
      setOfferForm({
        title: "",
        description: "",
        location: "",
        contract_type: "",
        company_name: "",
        department: "",
        work_mode: "",
        experience_level: "",
        salary_min: "",
        salary_max: "",
        tech_stack: "",
      });
    }

    setOfferSaving(false);
  };

  const handleOfferStatusUpdate = async (offerId: string, nextStatus: string) => {
    if (!supabase) return;
    setOfferActionId(offerId);
    setOfferActionStatus({ type: "idle" });

    const { error: updateError } = await supabase
      .from("job_offers")
      .update({ status: nextStatus })
      .eq("id", offerId);

    if (updateError) {
      setOfferActionStatus({ type: "error", message: updateError.message });
    } else {
      setOfferActionStatus({ type: "success", message: "Offre mise à jour." });
      setJobOffers((prev) =>
        prev.map((offer) => (offer.id === offerId ? { ...offer, status: nextStatus } : offer))
      );
    }

    setOfferActionId(null);
  };

  const handleOfferEditStart = (offer: JobOffer) => {
    setOfferEditStatus({ type: "idle" });
    setOfferEditSaving(false);
    setEditingOfferId(offer.id);
    setOfferEditForm({
      title: offer.title ?? "",
      location: offer.location ?? "",
      contract_type: offer.contract_type ?? "",
      company_name: offer.company_name ?? "",
      status: offer.status ?? "",
      description: offer.description ?? "",
      department: offer.department ?? "",
      work_mode: offer.work_mode ?? "",
      experience_level: offer.experience_level ?? "",
      salary_min: offer.salary_min?.toString() ?? "",
      salary_max: offer.salary_max?.toString() ?? "",
      tech_stack: offer.tech_stack?.join(", ") ?? "",
    });
  };

  const handleOfferEditCancel = () => {
    setEditingOfferId(null);
    setOfferEditStatus({ type: "idle" });
    setOfferEditSaving(false);
  };

  const handleOfferEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !editingOfferId) return;

    setOfferEditSaving(true);
    setOfferEditStatus({ type: "idle" });

    const payload = {
      title: offerEditForm.title,
      location: offerEditForm.location || null,
      contract_type: offerEditForm.contract_type || null,
      company_name: offerEditForm.company_name || null,
      status: offerEditForm.status || null,
      description: offerEditForm.description,
      department: offerEditForm.department || null,
      work_mode: offerEditForm.work_mode || null,
      experience_level: offerEditForm.experience_level || null,
      salary_min: offerEditForm.salary_min ? Number(offerEditForm.salary_min) : null,
      salary_max: offerEditForm.salary_max ? Number(offerEditForm.salary_max) : null,
      tech_stack: offerEditForm.tech_stack
        ? offerEditForm.tech_stack.split(",").map((s) => s.trim()).filter(Boolean)
        : null,
    };

    const currentId = editingOfferId;

    const { error: updateError } = await supabase
      .from("job_offers")
      .update(payload)
      .eq("id", currentId);

    if (updateError) {
      setOfferEditStatus({ type: "error", message: updateError.message });
    } else {
      setOfferEditStatus({ type: "success", message: "Offre mise a jour." });
      setJobOffers((prev) =>
        prev.map((offer) =>
          offer.id === currentId
            ? {
                ...offer,
                title: payload.title,
                location: payload.location,
                contract_type: payload.contract_type,
                company_name: payload.company_name,
                status: payload.status,
                description: payload.description,
                department: payload.department,
                work_mode: payload.work_mode,
                experience_level: payload.experience_level,
                salary_min: payload.salary_min,
                salary_max: payload.salary_max,
                tech_stack: payload.tech_stack,
              }
            : offer
        )
      );
      setEditingOfferId(null);
    }

    setOfferEditSaving(false);
  };

  const handleOfferDelete = async (offerId: string) => {
    if (!supabase) return;
    setOfferActionId(offerId);
    setOfferActionStatus({ type: "idle" });

    const { error: deleteError } = await supabase.from("job_offers").delete().eq("id", offerId);

    if (deleteError) {
      setOfferActionStatus({ type: "error", message: deleteError.message });
    } else {
      setOfferActionStatus({ type: "success", message: "Offre supprimée." });
      setJobOffers((prev) => prev.filter((offer) => offer.id !== offerId));
    }

    setOfferActionId(null);
  };

  return (
    <div className="min-h-screen bg-white text-[#0A1A2F]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
        <Button variant="link" className="w-fit self-start p-0 text-[#0A1A2F]" asChild>
          <a href="/" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Retour à l'accueil
          </a>
        </Button>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 text-sm uppercase tracking-wide text-[#0A1A2F]/70">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span>Dashboard admin</span>
          </div>
          <h1 className="text-3xl font-semibold leading-tight">
            Supervision des utilisateurs
          </h1>
          <p className="text-[#0A1A2F]/70">
            Visualise ton profil admin, les comptes utilisateurs, leur statut de
            verification et ta session active.
          </p>
          <a
            href="/dashboard/actus"
            className="inline-flex items-center text-sm font-medium text-[#000080]"
          >
            Gérer les actus
          </a>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-50">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Erreur</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AdminProfileCard adminProfile={adminProfile} />
          <AdminSessionCard
            user={user}
            sessionExpiry={sessionExpiry}
            onSignOut={handleSignOut}
          />
        </div>

        <AdminUsersListCard
          allProfiles={allProfiles}
          activityByUserId={activityByUserId}
          profileStatus={profileStatus}
          userDeleteStatus={userDeleteStatus}
          profileUpdatingId={profileUpdatingId}
          deletingUserId={deletingUserId}
          currentUserId={user?.id}
          onProfessionalStatusChange={handleProfessionalStatusChange}
          onDeleteUser={handleDeleteUser}
        />

        <AdminAssignmentsCard
          rhProfiles={rhProfiles}
          salarieProfiles={salarieProfiles}
          selectedRhId={selectedRhId}
          selectedRh={selectedRh}
          selectedEmployeeIds={selectedEmployeeIds}
          assignmentStatus={assignmentStatus}
          assignmentLoading={assignmentLoading}
          assignmentSaving={assignmentSaving}
          hasAccessToken={Boolean(session?.access_token)}
          onSelectedRhIdChange={setSelectedRhId}
          onToggleAssignedEmployee={toggleAssignedEmployee}
          onReload={() => {
            if (!session?.access_token) return;
            void loadRhCollaboratorAssignments(session.access_token);
          }}
          onSave={handleSaveAssignments}
        />

        <AdminOffersListCard
          jobOffers={jobOffers}
          offerActionStatus={offerActionStatus}
          offerActionId={offerActionId}
          editingOfferId={editingOfferId}
          offerEditSaving={offerEditSaving}
          offerEditStatus={offerEditStatus}
          offerEditForm={offerEditForm}
          setOfferEditForm={setOfferEditForm}
          onEditStart={handleOfferEditStart}
          onEditCancel={handleOfferEditCancel}
          onEditSubmit={handleOfferEditSubmit}
          onDelete={handleOfferDelete}
        />
        <AdminOfferCreateForm
          offerForm={offerForm}
          setOfferForm={setOfferForm}
          offerSaving={offerSaving}
          offerStatus={offerStatus}
          onSubmit={handleOfferSubmit}
        />
        <AdminNotesCard />

        {loading && <DashboardLoadingOverlay message="Chargement des donnees..." />}
      </div>
    </div>
  );
}
