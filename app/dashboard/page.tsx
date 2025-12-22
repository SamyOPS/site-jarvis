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

export default function DashboardPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<ProfileRow | null>(null);
  const [allProfiles, setAllProfiles] = useState<ProfileRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
