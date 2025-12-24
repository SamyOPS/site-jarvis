"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient, type Session, type User } from "@supabase/supabase-js";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Loader2,
  LogOut,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  professional_status: string | null;
  company_name: string | null;
};

type JobOffer = {
  id: string;
  title: string;
  company_name: string | null;
  status: string | null;
  location: string | null;
  contract_type: string | null;
  published_at: string | null;
};

type Status =
  | { type: "idle" }
  | { type: "error"; message: string }
  | { type: "success"; message: string };

export default function DashboardPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<ProfileRow | null>(null);
  const [allProfiles, setAllProfiles] = useState<ProfileRow[]>([]);
  const [jobOffers, setJobOffers] = useState<JobOffer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [offerSaving, setOfferSaving] = useState(false);
  const [offerStatus, setOfferStatus] = useState<Status>({ type: "idle" });
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

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        setError(sessionError.message);
        setLoading(false);
        return;
      }

      if (!sessionData.session) {
        setError("Aucune session active. Connecte-toi avant de continuer.");
        setLoading(false);
        return;
      }

      const currentSession = sessionData.session;
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

      const { data: offersData, error: offersError } = await supabase
        .from("job_offers")
        .select("id,title,company_name,status,location,contract_type,published_at")
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
  }, []);

  const sessionExpiry = useMemo(() => {
    if (!session?.expires_at) return null;
    return new Date(session.expires_at * 1000).toLocaleString();
  }, [session]);

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const renderStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline">Inconnu</Badge>;
    if (status === "verified") {
      return (
        <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
          Verifie
        </Badge>
      );
    }
    if (status === "pending") {
      return (
        <Badge className="bg-amber-500 text-white hover:bg-amber-500">
          En attente
        </Badge>
      );
    }
    if (status === "rejected") {
      return (
        <Badge className="bg-red-600 text-white hover:bg-red-600">
          Refuse
        </Badge>
      );
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120);

  const handleOfferSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !adminProfile) return;

    setOfferSaving(true);
    setOfferStatus({ type: "idle" });

    const payload = {
      title: offerForm.title,
      slug: slugify(offerForm.title) || crypto.randomUUID(),
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

    const { error: insertError } = await supabase
      .from("job_offers")
      .insert(payload);

    if (insertError) {
      setOfferStatus({ type: "error", message: insertError.message });
    } else {
      setOfferStatus({ type: "success", message: "Offre créée." });
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1A2F] via-[#0f2744] to-[#0A1A2F] text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 text-sm uppercase tracking-wide text-white/70">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span>Dashboard admin</span>
          </div>
          <h1 className="text-3xl font-semibold leading-tight">
            Supervision des utilisateurs
          </h1>
          <p className="text-white/70">
            Visualise ton profil admin, les comptes utilisateurs, leur statut de
            verification et ta session active.
          </p>
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
          <Card className="border-white/10 bg-white/10 text-white shadow-lg backdrop-blur">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-xl">
                <ShieldCheck className="h-5 w-5" />
                Profil admin
              </CardTitle>
              <CardDescription className="text-white/70">
                Informations issues de la table profiles.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-white/70">Email</span>
                <span className="font-medium">{adminProfile?.email ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Nom complet</span>
                <span className="font-medium">
                  {adminProfile?.full_name ?? "Non renseigne"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Role</span>
                <Badge className="bg-blue-600 text-white hover:bg-blue-600">
                  {adminProfile?.role ?? "Inconnu"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Statut pro</span>
                {renderStatusBadge(adminProfile?.professional_status ?? null)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Societe</span>
                <span className="font-medium">
                  {adminProfile?.company_name ?? "Non renseignee"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/10 text-white shadow-lg backdrop-blur">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Clock3 className="h-5 w-5" />
                Session actuelle
              </CardTitle>
              <CardDescription className="text-white/70">
                Infos supabase.auth.getSession().
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-white/70">Etat</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-50">
                  <CheckCircle2 className="h-4 w-4" />
                  Connecte
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Expire</span>
                <span className="font-medium">
                  {sessionExpiry ?? "Inconnu"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">User ID</span>
                <span className="font-mono text-xs">
                  {user?.id ?? "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Email confirme</span>
                <span className="font-medium">
                  {user?.email_confirmed_at ? "Oui" : "Non / inconnu"}
                </span>
              </div>
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Se deconnecter
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="border-white/10 bg-white/10 text-white shadow-lg backdrop-blur">
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Users className="h-5 w-5" />
                Utilisateurs
              </CardTitle>
              <CardDescription className="text-white/70">
                Liste issue de la table profiles (visible uniquement en admin).
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-white/30 text-white">
              {allProfiles.length} comptes
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {allProfiles.map((profile) => (
                <div
                  key={profile.id}
                  className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{profile.email}</span>
                    <Badge variant="outline" className="border-white/20 text-white">
                      {profile.role ?? "inconnu"}
                    </Badge>
                  </div>
                  <div className="mt-1 text-white/70">
                    {profile.full_name ?? "Nom non renseigne"}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {renderStatusBadge(profile.professional_status)}
                    <Badge variant="outline" className="border-white/20 text-white/80">
                      {profile.company_name ?? "Aucune societe"}
                    </Badge>
                    <Badge variant="outline" className="border-white/20 text-white/80">
                      Connexion globale: non disponible avec la cle publique
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            {!allProfiles.length && (
              <p className="text-sm text-white/70">
                Aucun profil trouve ou RLS empêche la lecture.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/10 text-white shadow-lg backdrop-blur">
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-xl">Offres d&apos;emploi</CardTitle>
              <CardDescription className="text-white/70">
                Liste des offres présentes en base (job_offers), triées par date de publication.
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-white/30 text-white">
              {jobOffers.length} offres
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {jobOffers.length ? (
              <div className="grid gap-3">
                {jobOffers.map((offer) => (
                  <div
                    key={offer.id}
                    className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">{offer.title}</p>
                        <p className="text-white/70 text-xs">
                          {offer.company_name ?? "Entreprise inconnue"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-white/20 text-white">
                          {offer.status ?? "inconnu"}
                        </Badge>
                        {offer.contract_type && (
                          <Badge variant="outline" className="border-white/20 text-white/80">
                            {offer.contract_type}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 text-white/70">
                      <span>{offer.location ?? "Localisation non précisée"}</span>
                    </div>
                    <div className="mt-1 text-xs text-white/60">
                      Publiée le{" "}
                      {offer.published_at
                        ? new Date(offer.published_at).toLocaleString()
                        : "N/A"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/70">Aucune offre trouvée.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/10 text-white shadow-lg backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl">Créer une offre d&apos;emploi</CardTitle>
            <CardDescription className="text-white/70">
              Formulaire rapide pour publier une offre (table job_offers).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleOfferSubmit}>
              <div className="space-y-2">
                <Label htmlFor="offer-title" className="text-white/80">
                  Titre
                </Label>
                <Input
                  id="offer-title"
                  required
                  value={offerForm.title}
                  onChange={(e) => setOfferForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-[#2aa0dd]"
                  placeholder="Développeur Full Stack"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="offer-description" className="text-white/80">
                  Description
                </Label>
                <Textarea
                  id="offer-description"
                  required
                  value={offerForm.description}
                  onChange={(e) =>
                    setOfferForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-[#2aa0dd]"
                  placeholder="Missions, profil recherché, stack..."
                  rows={4}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="offer-location" className="text-white/80">
                    Localisation
                  </Label>
                  <Input
                    id="offer-location"
                    value={offerForm.location}
                    onChange={(e) =>
                      setOfferForm((prev) => ({ ...prev, location: e.target.value }))
                    }
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-[#2aa0dd]"
                    placeholder="Paris / Remote"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="offer-contract" className="text-white/80">
                    Type de contrat
                  </Label>
                  <Input
                    id="offer-contract"
                    value={offerForm.contract_type}
                    onChange={(e) =>
                      setOfferForm((prev) => ({ ...prev, contract_type: e.target.value }))
                    }
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-[#2aa0dd]"
                    placeholder="CDI / CDD / Freelance"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="offer-department" className="text-white/80">
                    Département
                  </Label>
                  <Input
                    id="offer-department"
                    value={offerForm.department}
                    onChange={(e) =>
                      setOfferForm((prev) => ({ ...prev, department: e.target.value }))
                    }
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-[#2aa0dd]"
                    placeholder="IT / Support / Cloud..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="offer-workmode" className="text-white/80">
                    Mode de travail
                  </Label>
                  <Input
                    id="offer-workmode"
                    value={offerForm.work_mode}
                    onChange={(e) =>
                      setOfferForm((prev) => ({ ...prev, work_mode: e.target.value }))
                    }
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-[#2aa0dd]"
                    placeholder="Remote / Hybride / On-site"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="offer-experience" className="text-white/80">
                    Niveau d&apos;expérience
                  </Label>
                  <Input
                    id="offer-experience"
                    value={offerForm.experience_level}
                    onChange={(e) =>
                      setOfferForm((prev) => ({ ...prev, experience_level: e.target.value }))
                    }
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-[#2aa0dd]"
                    placeholder="Junior / Intermédiaire / Senior"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="offer-salary-min" className="text-white/80">
                      Salaire min
                    </Label>
                    <Input
                      id="offer-salary-min"
                      type="number"
                      value={offerForm.salary_min}
                      onChange={(e) =>
                        setOfferForm((prev) => ({ ...prev, salary_min: e.target.value }))
                      }
                      className="border-white/10 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-[#2aa0dd]"
                      placeholder="50000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="offer-salary-max" className="text-white/80">
                      Salaire max
                    </Label>
                    <Input
                      id="offer-salary-max"
                      type="number"
                      value={offerForm.salary_max}
                      onChange={(e) =>
                        setOfferForm((prev) => ({ ...prev, salary_max: e.target.value }))
                      }
                      className="border-white/10 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-[#2aa0dd]"
                      placeholder="70000"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="offer-tech" className="text-white/80">
                  Stack technique (séparée par des virgules)
                </Label>
                <Input
                  id="offer-tech"
                  value={offerForm.tech_stack}
                  onChange={(e) =>
                    setOfferForm((prev) => ({ ...prev, tech_stack: e.target.value }))
                  }
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-[#2aa0dd]"
                  placeholder="React, Node, PostgreSQL"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="offer-company" className="text-white/80">
                  Nom de l&apos;entreprise
                </Label>
                <Input
                  id="offer-company"
                  value={offerForm.company_name}
                  onChange={(e) =>
                    setOfferForm((prev) => ({ ...prev, company_name: e.target.value }))
                  }
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-[#2aa0dd]"
                  placeholder="Jarvis Connect"
                />
              </div>

              {offerStatus.type !== "idle" && (
                <div
                  className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                    offerStatus.type === "error"
                      ? "border-red-400/70 bg-red-500/10 text-red-100"
                      : "border-emerald-400/70 bg-emerald-500/10 text-emerald-50"
                  }`}
                >
                  {offerStatus.type === "error" ? (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <p className="leading-relaxed">{offerStatus.message}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={offerSaving}
                className="w-full bg-[#2aa0dd] text-white hover:bg-[#2493cb]"
              >
                {offerSaving ? "Création en cours..." : "Publier l'offre"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/10 text-white shadow-lg backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg">Notes importantes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-white/70">
            <p>
              - Le suivi des connexions de tous les utilisateurs necessite la cle
              service (auth.admin) ou une table dediee aux sessions. Avec la cle
              publique, seule ta session active est visible.
            </p>
            <p>
              - Assure-toi que RLS autorise les admins a lire la table profiles.
            </p>
          </CardContent>
        </Card>

        {loading && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-3 text-sm text-white">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement des donnees...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
