"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { AlertCircle, Ban, Loader2, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

type Status =
  | { type: "idle" }
  | { type: "error"; message: string }
  | { type: "success"; message: string };

export default function ProDashboardPage() {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    if (!supabase) {
      setError("Configuration Supabase manquante (URL / clé publique).");
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        setError(sessionError.message);
        setLoading(false);
        return;
      }

      if (!sessionData.session) {
        setError("Aucune session active. Merci de te connecter.");
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id,email,full_name,role,professional_status,company_name")
        .eq("id", sessionData.session.user.id)
        .single();

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      if (profileData?.role !== "professional") {
        setError("Accès réservé aux comptes professional.");
        setLoading(false);
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

  const isPending = profile?.professional_status === "pending";
  const isRejected = profile?.professional_status === "rejected";
  const isVerified = profile?.professional_status === "verified";

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

    const { error: insertError } = await supabase.from("job_offers").insert(payload);

    if (insertError) {
      setOfferStatus({ type: "error", message: insertError.message });
    } else {
      setOfferStatus({ type: "success", message: "Offre publiee avec succes." });
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

  return (
    <div className="min-h-screen bg-white text-[#0A1A2F]">
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-4">
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
          <Card className="border-red-200 bg-red-50 text-[#0A1A2F]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-red-800">
                <Ban className="h-5 w-5 text-red-700" />
                Compte refusé
              </CardTitle>
              <CardDescription className="text-red-800/80">
                Ton compte n&apos;a pas été validé. Contacte l&apos;administration pour plus d&apos;informations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-red-900/90">
              <Button
                variant="outline"
                className="border-red-300 text-red-800 hover:bg-red-100"
                onClick={() => (window.location.href = "/contact")}
              >
                Contacter le support
              </Button>
            </CardContent>
          </Card>
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
                    <span className="text-[#0A1A2F]/70">Entreprise</span>
                    <span className="font-medium">{profile?.company_name ?? "Non renseignée"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#0A1A2F]/70">Statut pro</span>
                    <Badge variant="outline" className="border-slate-300 text-[#0A1A2F]">
                      {profile?.professional_status ?? "inconnu"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {!isVerified && (
                <Card className="border-slate-200 bg-white text-[#0A1A2F] shadow-sm">
                  <CardHeader className="space-y-1">
                    <CardTitle className="text-xl">Deposer une offre</CardTitle>
                    <CardDescription className="text-[#0A1A2F]/70">
                      Disponible apres validation du compte professionnel.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-[#0A1A2F]/70">
                    {isPending
                      ? "Ton compte est en cours de verification. Tu pourras publier des offres des que le statut sera verifie."
                      : "Demande la verification de ton compte pour publier des offres."}
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        className="border-slate-300 text-[#0A1A2F]"
                        onClick={() => (window.location.href = "/contact")}
                      >
                        Contacter l'administration
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {isVerified && (
              <Card className="border-slate-200 bg-white text-[#0A1A2F] shadow-sm">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-xl">Deposer une offre</CardTitle>
                  <CardDescription className="text-[#0A1A2F]/70">
                    Publie une offre visible immediatement sur le site.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4" onSubmit={handleOfferSubmit}>
                    <div className="space-y-2">
                      <Label htmlFor="pro-offer-title" className="text-[#0A1A2F]/80">
                        Titre
                      </Label>
                      <Input
                        id="pro-offer-title"
                        required
                        value={offerForm.title}
                        onChange={(e) =>
                          setOfferForm((prev) => ({ ...prev, title: e.target.value }))
                        }
                        className="border-slate-200 bg-slate-50 text-[#0A1A2F] placeholder:text-[#0A1A2F]/40 focus-visible:ring-[#2aa0dd]"
                        placeholder="Responsable support IT"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pro-offer-description" className="text-[#0A1A2F]/80">
                        Description
                      </Label>
                      <Textarea
                        id="pro-offer-description"
                        required
                        value={offerForm.description}
                        onChange={(e) =>
                          setOfferForm((prev) => ({ ...prev, description: e.target.value }))
                        }
                        className="border-slate-200 bg-slate-50 text-[#0A1A2F] placeholder:text-[#0A1A2F]/40 focus-visible:ring-[#2aa0dd]"
                        placeholder="Missions, profil recherche, stack..."
                        rows={4}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="pro-offer-location" className="text-[#0A1A2F]/80">
                          Localisation
                        </Label>
                        <Input
                          id="pro-offer-location"
                          value={offerForm.location}
                          onChange={(e) =>
                            setOfferForm((prev) => ({ ...prev, location: e.target.value }))
                          }
                          className="border-slate-200 bg-slate-50 text-[#0A1A2F] placeholder:text-[#0A1A2F]/40 focus-visible:ring-[#2aa0dd]"
                          placeholder="Paris / Remote"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pro-offer-contract" className="text-[#0A1A2F]/80">
                          Type de contrat
                        </Label>
                        <Input
                          id="pro-offer-contract"
                          value={offerForm.contract_type}
                          onChange={(e) =>
                            setOfferForm((prev) => ({ ...prev, contract_type: e.target.value }))
                          }
                          className="border-slate-200 bg-slate-50 text-[#0A1A2F] placeholder:text-[#0A1A2F]/40 focus-visible:ring-[#2aa0dd]"
                          placeholder="CDI / CDD / Freelance"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="pro-offer-department" className="text-[#0A1A2F]/80">
                          Departement
                        </Label>
                        <Input
                          id="pro-offer-department"
                          value={offerForm.department}
                          onChange={(e) =>
                            setOfferForm((prev) => ({ ...prev, department: e.target.value }))
                          }
                          className="border-slate-200 bg-slate-50 text-[#0A1A2F] placeholder:text-[#0A1A2F]/40 focus-visible:ring-[#2aa0dd]"
                          placeholder="Support / Cloud / IT"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pro-offer-workmode" className="text-[#0A1A2F]/80">
                          Mode de travail
                        </Label>
                        <Input
                          id="pro-offer-workmode"
                          value={offerForm.work_mode}
                          onChange={(e) =>
                            setOfferForm((prev) => ({ ...prev, work_mode: e.target.value }))
                          }
                          className="border-slate-200 bg-slate-50 text-[#0A1A2F] placeholder:text-[#0A1A2F]/40 focus-visible:ring-[#2aa0dd]"
                          placeholder="Remote / Hybride / On-site"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="pro-offer-experience" className="text-[#0A1A2F]/80">
                          Niveau d&apos;experience
                        </Label>
                        <Input
                          id="pro-offer-experience"
                          value={offerForm.experience_level}
                          onChange={(e) =>
                            setOfferForm((prev) => ({ ...prev, experience_level: e.target.value }))
                          }
                          className="border-slate-200 bg-slate-50 text-[#0A1A2F] placeholder:text-[#0A1A2F]/40 focus-visible:ring-[#2aa0dd]"
                          placeholder="Junior / Intermediaire / Senior"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="pro-offer-salary-min" className="text-[#0A1A2F]/80">
                            Salaire min
                          </Label>
                          <Input
                            id="pro-offer-salary-min"
                            type="number"
                            value={offerForm.salary_min}
                            onChange={(e) =>
                              setOfferForm((prev) => ({ ...prev, salary_min: e.target.value }))
                            }
                            className="border-slate-200 bg-slate-50 text-[#0A1A2F] placeholder:text-[#0A1A2F]/40 focus-visible:ring-[#2aa0dd]"
                            placeholder="50000"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="pro-offer-salary-max" className="text-[#0A1A2F]/80">
                            Salaire max
                          </Label>
                          <Input
                            id="pro-offer-salary-max"
                            type="number"
                            value={offerForm.salary_max}
                            onChange={(e) =>
                              setOfferForm((prev) => ({ ...prev, salary_max: e.target.value }))
                            }
                            className="border-slate-200 bg-slate-50 text-[#0A1A2F] placeholder:text-[#0A1A2F]/40 focus-visible:ring-[#2aa0dd]"
                            placeholder="70000"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pro-offer-tech" className="text-[#0A1A2F]/80">
                        Stack technique (separee par des virgules)
                      </Label>
                      <Input
                        id="pro-offer-tech"
                        value={offerForm.tech_stack}
                        onChange={(e) =>
                          setOfferForm((prev) => ({ ...prev, tech_stack: e.target.value }))
                        }
                        className="border-slate-200 bg-slate-50 text-[#0A1A2F] placeholder:text-[#0A1A2F]/40 focus-visible:ring-[#2aa0dd]"
                        placeholder="React, Node, PostgreSQL"
                      />
                    </div>

                    {offerStatus.type !== "idle" && (
                      <div
                        className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                          offerStatus.type === "error"
                            ? "border-red-300 bg-red-50 text-red-900"
                            : "border-emerald-300 bg-emerald-50 text-emerald-900"
                        }`}
                      >
                        {offerStatus.type === "error" ? (
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        ) : (
                          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                        )}
                        <p className="leading-relaxed">{offerStatus.message}</p>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={offerSaving}
                      className="w-full bg-[#0A1A2F] text-white hover:bg-[#0d2a4b]"
                    >
                      {offerSaving ? "Publication en cours..." : "Publier l'offre"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {loading && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm text-[#0A1A2F] shadow">
              <Loader2 className="h-4 w-4 animate-spin text-[#0A1A2F]" />
              Chargement des données...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


