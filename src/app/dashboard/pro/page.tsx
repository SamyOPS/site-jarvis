"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Session, User } from "@supabase/supabase-js";
import { AlertCircle, ArrowLeft, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DashboardLoadingOverlay } from "@/components/dashboard/loading-overlay";
import { ProOfferCreateForm } from "@/components/dashboard/pro/offer-create-form";
import { ProOffersListCard } from "@/components/dashboard/pro/offers-list-card";
import { ProProfileCard } from "@/components/dashboard/pro/profile-card";
import { ProRejectedCard } from "@/components/dashboard/pro/rejected-card";
import { ProSessionCard } from "@/components/dashboard/pro/session-card";
import { ProUnverifiedOfferPlaceholder } from "@/components/dashboard/pro/unverified-offer-placeholder";
import { forceClientSignOut, safeGetClientSession } from "@/lib/client-auth";
import { browserSupabase } from "@/lib/supabase-browser";

const supabase = browserSupabase;
import type {
  ProJobOffer as JobOffer,
  ProProfileRow as ProfileRow,
  ProStatus as Status,
} from "@/features/dashboard/pro/types";

export default function ProDashboardPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    supabase ? null : "Configuration Supabase manquante (URL / clé publique).",
  );
  const [jobOffers, setJobOffers] = useState<JobOffer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offersError, setOffersError] = useState<string | null>(null);
  const [offerActionId, setOfferActionId] = useState<string | null>(null);
  const [offerActionStatus, setOfferActionStatus] = useState<Status>({ type: "idle" });
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [offerEditSaving, setOfferEditSaving] = useState(false);
  const [offerEditStatus, setOfferEditStatus] = useState<Status>({ type: "idle" });
  const [offerEditForm, setOfferEditForm] = useState({
    title: "",
    location: "",
    contract_type: "",
    description: "",
    department: "",
    work_mode: "",
    experience_level: "",
    salary_min: "",
    salary_max: "",
    tech_stack: "",
    company_name: "",
  });
  const [offerSaving, setOfferSaving] = useState(false);
  const [offerStatus, setOfferStatus] = useState<Status>({ type: "idle" });
  const [offerForm, setOfferForm] = useState({
    title: "",
    description: "",
    location: "",
    contract_type: "",
    department: "",
    work_mode: "",
    experience_level: "",
    salary_min: "",
    salary_max: "",
    tech_stack: "",
  });

  useEffect(() => {
    if (!supabase) return;

    const load = async () => {
      setLoading(true);
      setError(null);

      const { session: currentSession, error: sessionError } = await safeGetClientSession(supabase);
      if (sessionError) {
        setError(sessionError.message);
        setLoading(false);
        return;
      }

      if (!currentSession) {
        setError("Aucune session active. Merci de te connecter.");
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

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      if (profileData?.role !== "professional" || profileData.professional_status !== "verified") {
        setError("Accès réservé aux comptes professional vérifiés.");
        setLoading(false);
        window.location.href = "/auth";
        return;
      }

      setProfile(profileData);
      setLoading(false);
    };

    void load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void load();
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !profile?.id) return;

    const loadOffers = async () => {
      setOffersLoading(true);
      setOffersError(null);

      const { data, error: offersError } = await supabase
        .from("job_offers")
        .select(
          "id,title,status,location,contract_type,description,department,work_mode,experience_level,salary_min,salary_max,tech_stack,company_name,published_at"
        )
        .eq("created_by", profile.id)
        .order("published_at", { ascending: false, nullsFirst: false });

      if (offersError) {
        setOffersError(offersError.message);
      } else {
        setJobOffers(data ?? []);
      }

      setOffersLoading(false);
    };

    void loadOffers();
  }, [profile?.id]);

  const isPending = profile?.professional_status === "pending";
  const isRejected = profile?.professional_status === "rejected";
  const isVerified = profile?.professional_status === "verified";

  const sessionExpiry = useMemo(() => {
    if (!session?.expires_at) return null;
    return new Date(session.expires_at * 1000).toLocaleString();
  }, [session]);

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

  const buildUniqueSlug = (title: string) => {
    const base = slugify(title) || "offre";
    const suffix = crypto.randomUUID().slice(0, 8);
    return `${base}-${suffix}`;
  };

  const handleOfferSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !profile) return;

    setOfferSaving(true);
    setOfferStatus({ type: "idle" });

    const payload = {
      title: offerForm.title,
      slug: buildUniqueSlug(offerForm.title),
      description: offerForm.description,
      location: offerForm.location || null,
      contract_type: offerForm.contract_type || null,
      company_name: profile.company_name || null,
      status: "published",
      created_by: profile.id,
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
        "id,title,status,location,contract_type,description,department,work_mode,experience_level,salary_min,salary_max,tech_stack,company_name,published_at"
      )
      .single();

    if (insertError) {
      setOfferStatus({ type: "error", message: insertError.message });
    } else {
      setOfferStatus({ type: "success", message: "Offre publiee avec succes." });
      if (data) {
        setJobOffers((prev) => [data, ...prev]);
      }
      setOfferForm({
        title: "",
        description: "",
        location: "",
        contract_type: "",
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

  const handleOfferEditStart = (offer: JobOffer) => {
    setOfferEditStatus({ type: "idle" });
    setOfferEditSaving(false);
    setEditingOfferId(offer.id);
    setOfferEditForm({
      title: offer.title ?? "",
      location: offer.location ?? "",
      contract_type: offer.contract_type ?? "",
      description: offer.description ?? "",
      department: offer.department ?? "",
      work_mode: offer.work_mode ?? "",
      experience_level: offer.experience_level ?? "",
      salary_min: offer.salary_min?.toString() ?? "",
      salary_max: offer.salary_max?.toString() ?? "",
      tech_stack: offer.tech_stack?.join(", ") ?? "",
      company_name: offer.company_name ?? "",
    });
  };

  const handleOfferEditCancel = () => {
    setEditingOfferId(null);
    setOfferEditStatus({ type: "idle" });
    setOfferEditSaving(false);
  };

  const handleOfferEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !editingOfferId) return;

    setOfferEditSaving(true);
    setOfferEditStatus({ type: "idle" });

    const payload = {
      title: offerEditForm.title,
      location: offerEditForm.location || null,
      contract_type: offerEditForm.contract_type || null,
      description: offerEditForm.description,
      department: offerEditForm.department || null,
      work_mode: offerEditForm.work_mode || null,
      experience_level: offerEditForm.experience_level || null,
      salary_min: offerEditForm.salary_min ? Number(offerEditForm.salary_min) : null,
      salary_max: offerEditForm.salary_max ? Number(offerEditForm.salary_max) : null,
      tech_stack: offerEditForm.tech_stack
        ? offerEditForm.tech_stack.split(",").map((s) => s.trim()).filter(Boolean)
        : null,
      company_name: offerEditForm.company_name || null,
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
                description: payload.description,
                department: payload.department,
                work_mode: payload.work_mode,
                experience_level: payload.experience_level,
                salary_min: payload.salary_min,
                salary_max: payload.salary_max,
                tech_stack: payload.tech_stack,
                company_name: payload.company_name,
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
      setOfferActionStatus({ type: "success", message: "Offre supprimee." });
      setJobOffers((prev) => prev.filter((offer) => offer.id !== offerId));
    }

    setOfferActionId(null);
  };

  return (
    <div className="min-h-screen bg-white text-[#0A1A2F]">
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-4">
        <Button variant="link" className="w-fit self-start p-0 text-[#0A1A2F]" asChild>
          <Link href="/" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Retour à l&apos;accueil
          </Link>
        </Button>
        <div className="flex items-center gap-3 text-sm uppercase tracking-wide text-[#0A1A2F]/70">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A1A2F]/5 text-[#0A1A2F]">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <span>Espace professionnel</span>
        </div>
        <h1 className="text-3xl font-semibold">Dashboard Pro</h1>
        <p className="text-[#0A1A2F]/70">
          Accès dédié aux entreprises pour gérer le compte et suivre la vérification.
        </p>

        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Erreur</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {isRejected ? (
          <ProRejectedCard />
        ) : (
          <>
            {isPending && (
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <div>
                  <p className="font-semibold text-amber-900">Statut en attente</p>
                  <p>Les actions avancées seront disponibles dès validation du compte.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ProProfileCard profile={profile} />
              <ProSessionCard
                user={user}
                sessionExpiry={sessionExpiry}
                onSignOut={handleSignOut}
              />
              {!isVerified && <ProUnverifiedOfferPlaceholder isPending={isPending} />}
            </div>

            {isVerified && (
              <ProOfferCreateForm
                offerForm={offerForm}
                setOfferForm={setOfferForm}
                offerSaving={offerSaving}
                offerStatus={offerStatus}
                onSubmit={handleOfferSubmit}
              />
            )}
            <ProOffersListCard
              jobOffers={jobOffers}
              offersLoading={offersLoading}
              offersError={offersError}
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
          </>
        )}

        {loading && <DashboardLoadingOverlay message="Chargement des données..." />}
      </div>
    </div>
  );
}


