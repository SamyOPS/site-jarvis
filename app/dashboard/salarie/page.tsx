"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowLeft,
  Ban,
  Loader2,
  LogOut,
  Shield,
} from "lucide-react";

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

type StoredFile = {
  name: string;
  path: string;
  createdAt: string | null;
  size: number | null;
};

const EMPLOYEE_DOCS_BUCKET = "employee-documents";
const PAY_SLIPS_BUCKET = "pay-slips";

const formatBytes = (value: number | null) => {
  if (!value) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export default function SalarieDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: "idle" | "error" | "success"; message: string }>({
    type: "idle",
    message: "",
  });
  const [documents, setDocuments] = useState<StoredFile[]>([]);
  const [paySlips, setPaySlips] = useState<StoredFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const configError = !supabase ? "Configuration Supabase manquante (URL / cle publique)." : null;

  const listFiles = useCallback(async (bucket: string, employeeId: string) => {
    if (!supabase) return [] as StoredFile[];

    const { data, error: listError } = await supabase.storage
      .from(bucket)
      .list(employeeId, { limit: 100, sortBy: { column: "created_at", order: "desc" } });

    if (listError || !data) return [];

    return data
      .filter((file) => file.name)
      .map((file) => ({
        name: file.name,
        path: `${employeeId}/${file.name}`,
        createdAt: file.created_at ?? null,
        size: file.metadata?.size ?? null,
      }));
  }, []);

  const refreshFiles = useCallback(async (employeeId: string) => {
    if (!supabase) return;

    setFilesLoading(true);
    const [employeeDocuments, employeePaySlips] = await Promise.all([
      listFiles(EMPLOYEE_DOCS_BUCKET, employeeId),
      listFiles(PAY_SLIPS_BUCKET, employeeId),
    ]);
    setDocuments(employeeDocuments);
    setPaySlips(employeePaySlips);
    setFilesLoading(false);
  }, [listFiles]);

  useEffect(() => {
    if (!supabase) return;

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
        setLoading(false);
        router.push("/auth");
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
        setError("Acces reserve aux comptes salarie.");
        setLoading(false);
        return;
      }

      setProfile(profileData);
      await refreshFiles(profileData.id);
      setLoading(false);
    };

    void load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void load();
    });

    return () => subscription.unsubscribe();
  }, [refreshFiles, router]);

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !supabase || !profile?.id) return;

    setUploadStatus({ type: "idle", message: "" });
    setUploadingDoc(true);

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "dat";
    const rawName = file.name.replace(/\.[^/.]+$/, "");
    const safeBaseName =
      rawName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || "document";

    const filePath = `${profile.id}/${Date.now()}-${safeBaseName}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(EMPLOYEE_DOCS_BUCKET)
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setUploadStatus({ type: "error", message: uploadError.message });
      setUploadingDoc(false);
      return;
    }

    setUploadStatus({ type: "success", message: "Document depose avec succes." });
    await refreshFiles(profile.id);
    setUploadingDoc(false);
    event.currentTarget.value = "";
  };

  const handleDownload = async (bucket: string, path: string, filename: string) => {
    if (!supabase) return;

    const { data, error: signedUrlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60);

    if (signedUrlError || !data?.signedUrl) {
      setError(signedUrlError?.message ?? "Impossible de telecharger le document.");
      return;
    }

    const link = document.createElement("a");
    link.href = data.signedUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.download = filename;
    link.click();
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/auth");
  };

  const isPending = profile?.professional_status === "pending";
  const isRejected = profile?.professional_status === "rejected";

  return (
    <div className="min-h-screen bg-white text-[#0A1A2F]">
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-10">
        <div className="flex items-center gap-3 text-sm uppercase tracking-wide text-[#0A1A2F]/70">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A1A2F]/5 text-[#0A1A2F]">
            <Shield className="h-4 w-4" />
          </span>
          <span>Espace salarie</span>
        </div>
        <h1 className="text-3xl font-semibold">Dashboard Salarie</h1>
        <p className="text-[#0A1A2F]/70">Acces interne RH pour les documents et fiches de paie.</p>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="border-slate-300 text-[#0A1A2F]"
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour accueil
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-slate-300 text-[#0A1A2F]"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Deconnexion
          </Button>
        </div>

        {(configError || error) && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Erreur</p>
              <p>{configError ?? error}</p>
            </div>
          </div>
        )}

        {isRejected ? (
          <Card className="border-red-200 bg-red-50 text-[#0A1A2F]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-red-800">
                <Ban className="h-5 w-5 text-red-700" />
                Compte refuse
              </CardTitle>
              <CardDescription className="text-red-800/80">
                Ton compte n&apos;a pas ete valide. Acces au dashboard bloque.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            {isPending && (
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <div>
                  <p className="font-semibold text-amber-900">Statut en attente</p>
                  <p>Certaines actions peuvent etre restreintes tant que le compte n&apos;est pas valide.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card className="border-slate-200 bg-white text-[#0A1A2F] shadow-sm">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-xl">Profil</CardTitle>
                  <CardDescription className="text-[#0A1A2F]/70">Donnees issues de la table profiles.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[#0A1A2F]/70">Email</span>
                    <span className="font-medium">{profile?.email ?? "-"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#0A1A2F]/70">Nom</span>
                    <span className="font-medium">{profile?.full_name ?? "Non renseigne"}</span>
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
                  <CardTitle className="text-xl">Mes documents</CardTitle>
                  <CardDescription className="text-[#0A1A2F]/70">Depose tes documents RH.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <input
                    type="file"
                    onChange={handleDocumentUpload}
                    className="h-10 w-full border border-slate-300 px-3 text-sm"
                    disabled={uploadingDoc || isPending}
                  />
                  {uploadingDoc && (
                    <p className="text-sm text-[#0A1A2F]/70">Upload en cours...</p>
                  )}
                  {uploadStatus.type !== "idle" && (
                    <p className={`text-sm ${uploadStatus.type === "error" ? "text-red-700" : "text-emerald-700"}`}>
                      {uploadStatus.message}
                    </p>
                  )}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Documents deposes</p>
                    {filesLoading ? (
                      <p className="text-sm text-[#0A1A2F]/70">Chargement...</p>
                    ) : documents.length ? (
                      <div className="space-y-2">
                        {documents.map((file) => (
                          <div
                            key={file.path}
                            className="flex items-center justify-between rounded border border-slate-200 p-2 text-sm"
                          >
                            <div>
                              <p className="font-medium">{file.name}</p>
                              <p className="text-xs text-[#0A1A2F]/60">
                                {file.createdAt ? new Date(file.createdAt).toLocaleDateString() : "-"} | {formatBytes(file.size)}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-300 text-[#0A1A2F]"
                              onClick={() => handleDownload(EMPLOYEE_DOCS_BUCKET, file.path, file.name)}
                            >
                              <ArrowDownToLine className="mr-2 h-4 w-4" />
                              Telecharger
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[#0A1A2F]/70">Aucun document depose.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white text-[#0A1A2F] shadow-sm md:col-span-2">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-xl">Fiches de paie RH</CardTitle>
                  <CardDescription className="text-[#0A1A2F]/70">Documents de paie deposes pour ton compte.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {filesLoading ? (
                    <p className="text-sm text-[#0A1A2F]/70">Chargement...</p>
                  ) : paySlips.length ? (
                    <div className="space-y-2">
                      {paySlips.map((file) => (
                        <div
                          key={file.path}
                          className="flex items-center justify-between rounded border border-slate-200 p-2 text-sm"
                        >
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-xs text-[#0A1A2F]/60">
                              {file.createdAt ? new Date(file.createdAt).toLocaleDateString() : "-"} | {formatBytes(file.size)}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-300 text-[#0A1A2F]"
                            onClick={() => handleDownload(PAY_SLIPS_BUCKET, file.path, file.name)}
                          >
                            <ArrowDownToLine className="mr-2 h-4 w-4" />
                            Telecharger
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#0A1A2F]/70">Aucune fiche de paie disponible.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {loading && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm text-[#0A1A2F] shadow">
              <Loader2 className="h-4 w-4 animate-spin text-[#0A1A2F]" />
              Chargement des donnees...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
