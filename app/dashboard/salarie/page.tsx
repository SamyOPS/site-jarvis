"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { AlertCircle, Ban, Loader2, Lock, Shield } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

export default function SalarieDashboardPage() {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      if (profileData?.role !== "salarie") {
        setError("Accès réservé aux comptes salarie.");
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

  return (
    <div className="min-h-screen bg-white text-[#0A1A2F]">
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-4">
        <div className="flex items-center gap-3 text-sm uppercase tracking-wide text-[#0A1A2F]/70">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A1A2F]/5 text-[#0A1A2F]">
            <Shield className="h-4 w-4" />
          </span>
          <span>Espace salarié</span>
        </div>
        <h1 className="text-3xl font-semibold">Dashboard Salarié</h1>
        <p className="text-[#0A1A2F]/70">
          Accès interne pour consulter les informations RH et documents.
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
                Ton compte n&apos;a pas été validé. Accès au dashboard bloqué.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-red-900/90">
              <p>Merci de contacter l&apos;administration ou de fournir de nouveaux justificatifs.</p>
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
                  <p>Dashboard accessible, mais les fonctionnalités avancées sont verrouillées tant que le compte n&apos;est pas validé.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card className="border-slate-200 bg-white text-[#0A1A2F] shadow-sm">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-xl">Profil</CardTitle>
                  <CardDescription className="text-[#0A1A2F]/70">
                    Données issues de la table profiles.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[#0A1A2F]/70">Email</span>
                    <span className="font-medium">{profile?.email ?? "-"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#0A1A2F]/70">Nom</span>
                    <span className="font-medium">{profile?.full_name ?? "Non renseigné"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#0A1A2F]/70">Statut</span>
                    <Badge variant="outline" className="border-slate-300 text-[#0A1A2F]">
                      {profile?.professional_status ?? "inconnu"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white text-[#0A1A2F] shadow-sm">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-xl">Fonctionnalités</CardTitle>
                  <CardDescription className="text-[#0A1A2F]/70">
                    Dépôt, téléchargement et consultation de documents internes (bientôt).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full bg-[#0A1A2F] text-white hover:bg-[#0d2a4b]" disabled>
                    <Lock className="mr-2 h-4 w-4" />
                    Déposer un document
                  </Button>
                  <Button variant="outline" className="w-full border-slate-300 text-[#0A1A2F]" disabled>
                    <Lock className="mr-2 h-4 w-4" />
                    Télécharger les documents RH
                  </Button>
                  <Button variant="outline" className="w-full border-slate-300 text-[#0A1A2F]" disabled>
                    <Lock className="mr-2 h-4 w-4" />
                    Consulter les offres internes
                  </Button>
                </CardContent>
              </Card>
            </div>
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
