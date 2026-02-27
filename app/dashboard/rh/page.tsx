"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowLeft,
  Ban,
  Loader2,
  LogOut,
  Trash2,
  Upload,
  Users,
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

type EmployeeFiles = {
  employeeDocuments: StoredFile[];
  paySlips: StoredFile[];
};

const EMPLOYEE_DOCS_BUCKET = "employee-documents";
const PAY_SLIPS_BUCKET = "pay-slips";

const formatBytes = (value: number | null) => {
  if (!value) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export default function RhDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [employees, setEmployees] = useState<ProfileRow[]>([]);
  const [filesByEmployee, setFilesByEmployee] = useState<Record<string, EmployeeFiles>>({});
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [filesLoading, setFilesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPaySlip, setUploadingPaySlip] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: "idle" | "error" | "success"; message: string }>({
    type: "idle",
    message: "",
  });
  const [deleteStatus, setDeleteStatus] = useState<{ type: "idle" | "error" | "success"; message: string }>({
    type: "idle",
    message: "",
  });
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
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

  const loadEmployeeFiles = useCallback(async (employeeRows: ProfileRow[]) => {
    if (!supabase || !employeeRows.length) {
      setFilesByEmployee({});
      return;
    }

    setFilesLoading(true);
    const entries = await Promise.all(
      employeeRows.map(async (employee) => {
        const [employeeDocuments, paySlips] = await Promise.all([
          listFiles(EMPLOYEE_DOCS_BUCKET, employee.id),
          listFiles(PAY_SLIPS_BUCKET, employee.id),
        ]);

        return [employee.id, { employeeDocuments, paySlips }] as const;
      })
    );

    setFilesByEmployee(Object.fromEntries(entries));
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

      if (profileData?.role !== "rh") {
        setError("Acces reserve aux comptes RH.");
        setLoading(false);
        return;
      }

      setProfile(profileData);

      const { data: employeesData, error: employeesError } = await supabase
        .from("profiles")
        .select("id,email,full_name,role,professional_status,company_name")
        .eq("role", "salarie")
        .order("email", { ascending: true });

      if (employeesError) {
        setError(employeesError.message);
        setLoading(false);
        return;
      }

      const employeeRows = employeesData ?? [];
      setEmployees(employeeRows);

      if (employeeRows.length) {
        setSelectedEmployeeId((prev) => prev || employeeRows[0].id);
      }

      await loadEmployeeFiles(employeeRows);
      setLoading(false);
    };

    void load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void load();
    });

    return () => subscription.unsubscribe();
  }, [loadEmployeeFiles, router]);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId]
  );

  const selectedEmployeeFiles = selectedEmployeeId
    ? filesByEmployee[selectedEmployeeId] ?? { employeeDocuments: [], paySlips: [] }
    : { employeeDocuments: [], paySlips: [] };

  const allEmployeeDocuments = employees.flatMap((employee) => {
    const files = filesByEmployee[employee.id]?.employeeDocuments ?? [];
    return files.map((file) => ({ employee, file }));
  });

  const handlePaySlipUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !supabase || !selectedEmployeeId) return;

    setUploadStatus({ type: "idle", message: "" });
    setUploadingPaySlip(true);

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
    const rawName = file.name.replace(/\.[^/.]+$/, "");
    const safeBaseName =
      rawName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || "fiche-paie";

    const filePath = `${selectedEmployeeId}/${Date.now()}-${safeBaseName}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(PAY_SLIPS_BUCKET)
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setUploadStatus({ type: "error", message: uploadError.message });
      setUploadingPaySlip(false);
      return;
    }

    const [employeeDocuments, paySlips] = await Promise.all([
      listFiles(EMPLOYEE_DOCS_BUCKET, selectedEmployeeId),
      listFiles(PAY_SLIPS_BUCKET, selectedEmployeeId),
    ]);

    setFilesByEmployee((prev) => ({
      ...prev,
      [selectedEmployeeId]: { employeeDocuments, paySlips },
    }));

    setUploadStatus({ type: "success", message: "Fiche de paie deposee avec succes." });
    setUploadingPaySlip(false);
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

  const handleDeleteFile = async (bucket: string, employeeId: string, path: string) => {
    if (!supabase) return;

    const confirmDelete = window.confirm("Supprimer ce fichier ?");
    if (!confirmDelete) return;

    setDeleteStatus({ type: "idle", message: "" });
    setDeletingPath(path);

    const { data: removedItems, error: deleteError } = await supabase.storage.from(bucket).remove([path]);

    if (deleteError) {
      setDeleteStatus({ type: "error", message: deleteError.message });
      setDeletingPath(null);
      return;
    }

    if (!removedItems?.length) {
      setDeleteStatus({
        type: "error",
        message: "Suppression non confirmee (fichier introuvable ou droits insuffisants).",
      });
      setDeletingPath(null);
      return;
    }

    const [employeeDocuments, paySlips] = await Promise.all([
      listFiles(EMPLOYEE_DOCS_BUCKET, employeeId),
      listFiles(PAY_SLIPS_BUCKET, employeeId),
    ]);

    setFilesByEmployee((prev) => ({
      ...prev,
      [employeeId]: { employeeDocuments, paySlips },
    }));

    setDeleteStatus({ type: "success", message: "Fichier supprime." });
    setDeletingPath(null);
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/auth");
  };

  const isRejected = profile?.professional_status === "rejected";

  return (
    <div className="min-h-screen bg-white text-[#0A1A2F]">
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-10">
        <div className="flex items-center gap-3 text-sm uppercase tracking-wide text-[#0A1A2F]/70">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A1A2F]/5 text-[#0A1A2F]">
            <Users className="h-4 w-4" />
          </span>
          <span>Espace RH</span>
        </div>
        <h1 className="text-3xl font-semibold">Dashboard RH</h1>
        <p className="text-[#0A1A2F]/70">
          Consultation des documents salaries et depot des fiches de paie par employe.
        </p>

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
                Ton compte RH n&apos;a pas ete valide. Acces au dashboard bloque.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card className="border-slate-200 bg-white text-[#0A1A2F] shadow-sm md:col-span-1">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-xl">Comptes salaries</CardTitle>
                  <CardDescription className="text-[#0A1A2F]/70">
                    Liste complete des salaries ({employees.length}).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {employees.length ? (
                    <div className="space-y-2">
                      {employees.map((employee) => (
                        <button
                          key={employee.id}
                          type="button"
                          className={`w-full rounded border p-2 text-left ${
                            selectedEmployeeId === employee.id
                              ? "border-[#0A1A2F] bg-[#0A1A2F]/5"
                              : "border-slate-200"
                          }`}
                          onClick={() => setSelectedEmployeeId(employee.id)}
                        >
                          <p className="font-medium">{employee.full_name ?? employee.email}</p>
                          <p className="text-xs text-[#0A1A2F]/60">{employee.email}</p>
                          <div className="mt-1">
                            <Badge variant="outline" className="border-slate-300 text-[#0A1A2F]">
                              {employee.professional_status ?? "inconnu"}
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#0A1A2F]/70">Aucun compte salarie trouve.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white text-[#0A1A2F] shadow-sm md:col-span-2">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-xl">Fiches de paie</CardTitle>
                  <CardDescription className="text-[#0A1A2F]/70">
                    Deposer une fiche de paie pour le salarie selectionne.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                    <select
                      value={selectedEmployeeId}
                      onChange={(event) => setSelectedEmployeeId(event.target.value)}
                      className="h-10 border border-slate-300 px-3 text-sm"
                    >
                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.full_name ?? employee.email} ({employee.email})
                        </option>
                      ))}
                    </select>
                    <label className="inline-flex h-10 cursor-pointer items-center justify-center border border-slate-300 px-3 text-sm">
                      <Upload className="mr-2 h-4 w-4" />
                      Deposer une fiche
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        className="hidden"
                        onChange={handlePaySlipUpload}
                        disabled={!selectedEmployeeId || uploadingPaySlip}
                      />
                    </label>
                  </div>

                  {uploadingPaySlip && <p className="text-sm text-[#0A1A2F]/70">Upload en cours...</p>}

                  {uploadStatus.type !== "idle" && (
                    <p className={`text-sm ${uploadStatus.type === "error" ? "text-red-700" : "text-emerald-700"}`}>
                      {uploadStatus.message}
                    </p>
                  )}
                  {deleteStatus.type !== "idle" && (
                    <p className={`text-sm ${deleteStatus.type === "error" ? "text-red-700" : "text-emerald-700"}`}>
                      {deleteStatus.message}
                    </p>
                  )}

                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Fiches de paie de {selectedEmployee?.full_name ?? selectedEmployee?.email ?? "-"}
                    </p>
                    {filesLoading ? (
                      <p className="text-sm text-[#0A1A2F]/70">Chargement...</p>
                    ) : selectedEmployeeFiles.paySlips.length ? (
                      <div className="space-y-2">
                        {selectedEmployeeFiles.paySlips.map((file) => (
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
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-slate-300 text-[#0A1A2F]"
                                onClick={() => handleDownload(PAY_SLIPS_BUCKET, file.path, file.name)}
                              >
                                <ArrowDownToLine className="mr-2 h-4 w-4" />
                                Telecharger
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-300 text-red-700 hover:bg-red-50"
                                disabled={deletingPath === file.path}
                                onClick={() => void handleDeleteFile(PAY_SLIPS_BUCKET, selectedEmployeeId, file.path)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Supprimer
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[#0A1A2F]/70">Aucune fiche de paie pour ce salarie.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-slate-200 bg-white text-[#0A1A2F] shadow-sm">
              <CardHeader className="space-y-1">
                <CardTitle className="text-xl">Tous les documents deposes par les salaries</CardTitle>
                <CardDescription className="text-[#0A1A2F]/70">
                  Vue globale sur les documents RH de tous les comptes salaries.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {filesLoading ? (
                  <p className="text-sm text-[#0A1A2F]/70">Chargement...</p>
                ) : allEmployeeDocuments.length ? (
                  <div className="space-y-2">
                    {allEmployeeDocuments.map(({ employee, file }) => (
                      <div
                        key={`${employee.id}-${file.path}`}
                        className="flex items-center justify-between rounded border border-slate-200 p-2 text-sm"
                      >
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-xs text-[#0A1A2F]/60">
                            {employee.full_name ?? employee.email} | {employee.email}
                          </p>
                          <p className="text-xs text-[#0A1A2F]/60">
                            {file.createdAt ? new Date(file.createdAt).toLocaleDateString() : "-"} | {formatBytes(file.size)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-300 text-[#0A1A2F]"
                            onClick={() => handleDownload(EMPLOYEE_DOCS_BUCKET, file.path, file.name)}
                          >
                            <ArrowDownToLine className="mr-2 h-4 w-4" />
                            Telecharger
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-300 text-red-700 hover:bg-red-50"
                            disabled={deletingPath === file.path}
                            onClick={() => void handleDeleteFile(EMPLOYEE_DOCS_BUCKET, employee.id, file.path)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#0A1A2F]/70">Aucun document salarie trouve.</p>
                )}
              </CardContent>
            </Card>
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
