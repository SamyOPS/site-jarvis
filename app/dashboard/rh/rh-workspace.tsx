"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient, type Session, type User } from "@supabase/supabase-js";
import { AlertCircle, Loader2, LogOut } from "lucide-react";

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
  phone: string | null;
  role: string | null;
  professional_status: string | null;
  employment_status: "active" | "inactive" | "exited" | null;
  company_name: string | null;
  esn_partenaire: string | null;
};

type DocumentStatus = "pending" | "validated" | "rejected";

type RHDocumentRow = {
  id: string;
  employeeName: string;
  employeeEmail: string;
  fileName: string;
  status: DocumentStatus;
  createdAt: string | null;
  typeCode: string;
  typeLabel: string;
};

type JobOfferRow = {
  id: string;
  title: string;
  status: "draft" | "published" | "archived";
  location: string | null;
  createdAt: string;
};

type ApplicationRow = {
  id: string;
  candidateId: string;
  status: "submitted" | "reviewed" | "rejected" | "accepted";
  createdAt: string;
  jobTitle: string;
  candidateName: string;
};

type ProfileCvRow = {
  user_id: string;
  file_name: string | null;
  updated_at: string;
};

type RawDocumentRow = {
  id: string;
  status: DocumentStatus;
  file_name: string;
  created_at: string | null;
  document_type: { code: string; label: string } | { code: string; label: string }[] | null;
  employee: { email: string; full_name: string | null } | { email: string; full_name: string | null }[] | null;
};

type RawOfferRow = {
  id: string;
  title: string;
  status: "draft" | "published" | "archived";
  location: string | null;
  created_at: string;
};

type RawApplicationRow = {
  id: string;
  candidate_id: string;
  status: "submitted" | "reviewed" | "rejected" | "accepted";
  created_at: string;
  job: { title: string | null } | { title: string | null }[] | null;
  candidate:
    | { full_name: string | null; email: string | null }
    | { full_name: string | null; email: string | null }[]
    | null;
};

const normalizeJoinOne = <T,>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
};

export default function RhWorkspace() {
  const pathname = usePathname();
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [employees, setEmployees] = useState<ProfileRow[]>([]);
  const [documents, setDocuments] = useState<RHDocumentRow[]>([]);
  const [jobOffers, setJobOffers] = useState<JobOfferRow[]>([]);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [cvsByUser, setCvsByUser] = useState<Record<string, ProfileCvRow>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [employeeDrafts, setEmployeeDrafts] = useState<
    Record<string, { full_name: string; phone: string; company_name: string; esn_partenaire: string; employment_status: string }>
  >({});

  const configError = !supabase ? "Configuration Supabase manquante (URL / cle publique)." : null;

  const loadDashboardData = useCallback(async () => {
    if (!supabase) return;

    const [employeesRes, docsRes, offersRes, appsRes, cvsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,email,full_name,phone,role,professional_status,employment_status,company_name,esn_partenaire")
        .eq("role", "salarie")
        .order("email", { ascending: true }),
      supabase
        .from("employee_documents")
        .select(`
          id,
          status,
          file_name,
          created_at,
          document_type:document_types(code,label),
          employee:profiles!employee_documents_employee_id_fkey(email,full_name)
        `)
        .order("created_at", { ascending: false }),
      supabase
        .from("job_offers")
        .select("id,title,status,location,created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("applications")
        .select(`
          id,
          candidate_id,
          status,
          created_at,
          job:job_offers(title),
          candidate:profiles!applications_candidate_id_fkey(full_name,email)
        `)
        .order("created_at", { ascending: false }),
      supabase.from("profile_cvs").select("user_id,file_name,updated_at"),
    ]);

    if (employeesRes.error || docsRes.error || offersRes.error || appsRes.error || cvsRes.error) {
      setError(
        employeesRes.error?.message ||
          docsRes.error?.message ||
          offersRes.error?.message ||
          appsRes.error?.message ||
          cvsRes.error?.message ||
          "Erreur de chargement RH"
      );
      return;
    }

    setEmployees((employeesRes.data as ProfileRow[]) ?? []);

    const docs = ((docsRes.data ?? []) as RawDocumentRow[]).map((row) => {
      const type = normalizeJoinOne<{ code: string; label: string }>(row.document_type);
      const employee = normalizeJoinOne<{ email: string; full_name: string | null }>(row.employee);
      return {
        id: row.id,
        employeeName: employee?.full_name ?? employee?.email ?? "Utilisateur",
        employeeEmail: employee?.email ?? "-",
        fileName: row.file_name,
        status: row.status,
        createdAt: row.created_at,
        typeCode: type?.code ?? "autre",
        typeLabel: type?.label ?? "Autre",
      } satisfies RHDocumentRow;
    });
    setDocuments(docs);

    setJobOffers(
      ((offersRes.data ?? []) as RawOfferRow[]).map((row) => ({
        id: row.id,
        title: row.title,
        status: row.status,
        location: row.location,
        createdAt: row.created_at,
      }))
    );

    setApplications(
      ((appsRes.data ?? []) as RawApplicationRow[]).map((row) => {
        const job = normalizeJoinOne<{ title: string | null }>(row.job);
        const candidate = normalizeJoinOne<{ full_name: string | null; email: string | null }>(row.candidate);
        return {
          id: row.id,
          candidateId: row.candidate_id,
          status: row.status,
          createdAt: row.created_at,
          jobTitle: job?.title ?? "Offre",
          candidateName: candidate?.full_name ?? candidate?.email ?? "Candidat",
        } satisfies ApplicationRow;
      })
    );

    const cvsRows = (cvsRes.data ?? []) as ProfileCvRow[];
    setCvsByUser(Object.fromEntries(cvsRows.map((row) => [row.user_id, row])));
  }, []);

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

      const currentSession = sessionData.session;
      setSession(currentSession);
      setUser(currentSession.user);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id,email,full_name,phone,role,professional_status,employment_status,company_name,esn_partenaire")
        .eq("id", currentSession.user.id)
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
      await loadDashboardData();
      setLoading(false);
    };

    void load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void load();
    });

    return () => subscription.unsubscribe();
  }, [loadDashboardData, router]);

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/auth");
  };

  const displayName = useMemo(() => {
    const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string; display_name?: string };
    return meta.full_name ?? meta.name ?? meta.display_name ?? profile?.full_name ?? profile?.email ?? "utilisateur";
  }, [profile?.email, profile?.full_name, user?.user_metadata]);

  const currentSection = useMemo(() => {
    if (pathname.startsWith("/dashboard/rh/collaborateurs")) return "collaborateurs";
    if (pathname.startsWith("/dashboard/rh/documents")) return "documents";
    if (pathname.startsWith("/dashboard/rh/offres")) return "offres";
    if (pathname.startsWith("/dashboard/rh/parametres")) return "parametres";
    return "overview";
  }, [pathname]);

  const currentSubSection = useMemo(() => {
    if (/^\/dashboard\/rh\/collaborateurs\/[a-f0-9-]+$/i.test(pathname)) return "collab_detail";
    if (pathname.startsWith("/dashboard/rh/collaborateurs/actifs")) return "collab_actifs";
    if (pathname.startsWith("/dashboard/rh/collaborateurs/inactifs")) return "collab_inactifs";
    if (pathname.startsWith("/dashboard/rh/documents/a-valider")) return "docs_a_valider";
    if (pathname.startsWith("/dashboard/rh/documents/salaries")) return "docs_salaries";
    if (pathname.startsWith("/dashboard/rh/documents/entreprise")) return "docs_entreprise";
    if (pathname.startsWith("/dashboard/rh/offres/candidatures")) return "offres_candidatures";
    if (pathname.startsWith("/dashboard/rh/offres/archives")) return "offres_archives";
    if (pathname.startsWith("/dashboard/rh/offres/creer")) return "offres_creer";
    if (pathname.startsWith("/dashboard/rh/offres")) return "offres_actives";
    if (pathname.startsWith("/dashboard/rh/documents")) return "docs_tous";
    if (pathname.startsWith("/dashboard/rh/collaborateurs")) return "collab_tous";
    return "overview";
  }, [pathname]);

  const collaborateursRows = useMemo(() => {
    if (currentSubSection === "collab_actifs") return employees.filter((e) => e.employment_status === "active");
    if (currentSubSection === "collab_inactifs") return employees.filter((e) => ["inactive", "exited"].includes(e.employment_status ?? ""));
    return employees;
  }, [currentSubSection, employees]);

  const selectedEmployeeId = useMemo(() => {
    const match = pathname.match(/^\/dashboard\/rh\/collaborateurs\/([a-f0-9-]+)$/i);
    return match?.[1] ?? null;
  }, [pathname]);

  const selectedEmployee = useMemo(
    () => (selectedEmployeeId ? employees.find((employee) => employee.id === selectedEmployeeId) ?? null : null),
    [employees, selectedEmployeeId]
  );

  const selectedEmployeeDocuments = useMemo(
    () => documents.filter((doc) => doc.employeeEmail === selectedEmployee?.email),
    [documents, selectedEmployee?.email]
  );

  const selectedEmployeeApplications = useMemo(
    () => applications.filter((app) => app.candidateId === selectedEmployeeId),
    [applications, selectedEmployeeId]
  );

  const selectedEmployeeCv = useMemo(
    () => (selectedEmployeeId ? cvsByUser[selectedEmployeeId] ?? null : null),
    [cvsByUser, selectedEmployeeId]
  );

  const activeDraft = useMemo(() => {
    if (!selectedEmployee) return null;
    return (
      employeeDrafts[selectedEmployee.id] ?? {
        full_name: selectedEmployee.full_name ?? "",
        phone: selectedEmployee.phone ?? "",
        company_name: selectedEmployee.company_name ?? "",
        esn_partenaire: selectedEmployee.esn_partenaire ?? "",
        employment_status: selectedEmployee.employment_status ?? "active",
      }
    );
  }, [employeeDrafts, selectedEmployee]);

  const handleSaveEmployee = async () => {
    if (!supabase || !selectedEmployee || !activeDraft) return;
    setSavingEmployee(true);
    setSaveMessage(null);

    const { data: updatedRow, error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: activeDraft.full_name || null,
        phone: activeDraft.phone || null,
        company_name: activeDraft.company_name || null,
        esn_partenaire: activeDraft.esn_partenaire || null,
        employment_status: activeDraft.employment_status,
      })
      .eq("id", selectedEmployee.id)
      .select("id")
      .maybeSingle();

    if (updateError) {
      setSaveMessage(`Erreur: ${updateError.message}`);
      setSavingEmployee(false);
      return;
    }

    if (!updatedRow?.id) {
      setSaveMessage("Aucune modification appliquee (droits insuffisants ou ligne non accessible).");
      setSavingEmployee(false);
      return;
    }

    await loadDashboardData();
    setSaveMessage("Informations mises a jour.");
    setSavingEmployee(false);
  };

  const pendingCraCount = useMemo(() => documents.filter((d) => d.status === "pending" && d.typeCode === "cra").length, [documents]);
  const pendingInvoiceCount = useMemo(() => documents.filter((d) => d.status === "pending" && d.typeCode === "facture").length, [documents]);

  const currentMonthDocuments = useMemo(() => {
    const now = new Date();
    const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return documents.filter((d) => {
      if (!d.createdAt) return false;
      const dt = new Date(d.createdAt);
      if (Number.isNaN(dt.getTime())) return false;
      const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      return k === nowKey;
    });
  }, [documents]);

  const offersActives = useMemo(() => jobOffers.filter((o) => o.status === "published"), [jobOffers]);
  const offersArchives = useMemo(() => jobOffers.filter((o) => o.status === "archived"), [jobOffers]);

  const isRejected = profile?.professional_status === "rejected";

  const sessionExpiry = useMemo(() => {
    if (!session?.expires_at) return null;
    return new Date(session.expires_at * 1000).toLocaleString();
  }, [session]);

  return (
    <div className="min-h-screen bg-white text-[#0A1A2F]">
      <div className="relative">
        <aside className="hidden border-r border-slate-200 bg-slate-50 lg:fixed lg:inset-y-0 lg:left-0 lg:block lg:w-[300px]">
          <div className="flex h-full flex-col gap-4 p-4">
            <p className="text-sm font-medium text-[#0A1A2F]">Bonjour, {displayName}</p>
            <nav className="text-sm">
              <p className="mb-2 text-xs uppercase tracking-wide text-[#0A1A2F]/60">Navigation</p>
              <div className="space-y-1">
                <Link href="/dashboard/rh" className={`block px-1 py-2 hover:underline ${currentSection === "overview" ? "font-semibold" : ""}`}>Vue d&apos;ensemble</Link>
                <Link href="/dashboard/rh/collaborateurs" className={`block px-1 py-2 hover:underline ${currentSection === "collaborateurs" ? "font-semibold" : ""}`}>Salaries / Collaborateurs</Link>
                {currentSection === "collaborateurs" && <div className="ml-3 space-y-1 border-l border-slate-200 pl-3 text-xs"><Link href="/dashboard/rh/collaborateurs" className={`block py-1 ${currentSubSection === "collab_tous" ? "font-semibold" : ""}`}>Tous les collaborateurs</Link><Link href="/dashboard/rh/collaborateurs/actifs" className={`block py-1 ${currentSubSection === "collab_actifs" ? "font-semibold" : ""}`}>Actifs</Link><Link href="/dashboard/rh/collaborateurs/inactifs" className={`block py-1 ${currentSubSection === "collab_inactifs" ? "font-semibold" : ""}`}>Inactifs / Sortants</Link>{currentSubSection === "collab_detail" && <span className="block py-1 font-semibold">Fiche collaborateur</span>}</div>}
                <Link href="/dashboard/rh/documents" className={`block px-1 py-2 hover:underline ${currentSection === "documents" ? "font-semibold" : ""}`}>Documents</Link>
                {currentSection === "documents" && <div className="ml-3 space-y-1 border-l border-slate-200 pl-3 text-xs"><Link href="/dashboard/rh/documents/a-valider" className={`block py-1 ${currentSubSection === "docs_a_valider" ? "font-semibold" : ""}`}>A valider</Link><Link href="/dashboard/rh/documents" className={`block py-1 ${currentSubSection === "docs_tous" ? "font-semibold" : ""}`}>Tous les documents</Link><Link href="/dashboard/rh/documents/salaries" className={`block py-1 ${currentSubSection === "docs_salaries" ? "font-semibold" : ""}`}>Documents salaries</Link><Link href="/dashboard/rh/documents/entreprise" className={`block py-1 ${currentSubSection === "docs_entreprise" ? "font-semibold" : ""}`}>Documents entreprise</Link></div>}
                <Link href="/dashboard/rh/offres" className={`block px-1 py-2 hover:underline ${currentSection === "offres" ? "font-semibold" : ""}`}>Offres d&apos;emploi</Link>
                {currentSection === "offres" && <div className="ml-3 space-y-1 border-l border-slate-200 pl-3 text-xs"><Link href="/dashboard/rh/offres" className={`block py-1 ${currentSubSection === "offres_actives" ? "font-semibold" : ""}`}>Offres actives</Link><Link href="/dashboard/rh/offres/candidatures" className={`block py-1 ${currentSubSection === "offres_candidatures" ? "font-semibold" : ""}`}>Candidatures</Link><Link href="/dashboard/rh/offres/archives" className={`block py-1 ${currentSubSection === "offres_archives" ? "font-semibold" : ""}`}>Archives</Link><Link href="/dashboard/rh/offres/creer" className={`block py-1 ${currentSubSection === "offres_creer" ? "font-semibold" : ""}`}>Creer une offre</Link></div>}
              </div>
            </nav>
            <div className="mt-auto border-t border-slate-200 pt-3 text-sm">
              <Link href="/dashboard/rh/parametres" className={`block px-1 py-2 hover:underline ${currentSection === "parametres" ? "font-semibold" : ""}`}>Parametres</Link>
              <button type="button" className="flex w-full items-center px-1 py-2 text-left hover:underline" onClick={handleSignOut}><LogOut className="mr-2 h-4 w-4" />Deconnexion</button>
            </div>
          </div>
        </aside>

        <main className="space-y-4 px-4 py-6 lg:ml-[300px] lg:px-8 lg:py-8">
          {(configError || error) && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div><p className="font-semibold">Erreur</p><p>{configError ?? error}</p></div>
            </div>
          )}

          {isRejected ? (
            <Card className="border-red-200 bg-red-50 text-[#0A1A2F]">
              <CardHeader><CardTitle className="text-xl text-red-800">Compte refuse</CardTitle><CardDescription className="text-red-800/80">Ton compte RH n&apos;a pas ete valide.</CardDescription></CardHeader>
            </Card>
          ) : (
            <>
              {currentSection === "overview" && (
                <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Card><CardContent className="pt-6"><p className="text-sm text-[#0A1A2F]/70">CRA en attente</p><p className="mt-1 text-2xl font-semibold">{pendingCraCount}</p></CardContent></Card>
                  <Card><CardContent className="pt-6"><p className="text-sm text-[#0A1A2F]/70">Factures a valider</p><p className="mt-1 text-2xl font-semibold">{pendingInvoiceCount}</p></CardContent></Card>
                  <Card><CardContent className="pt-6"><p className="text-sm text-[#0A1A2F]/70">Documents ce mois</p><p className="mt-1 text-2xl font-semibold">{currentMonthDocuments.length}</p></CardContent></Card>
                </section>
              )}

              {currentSection === "parametres" && (
                <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Card><CardHeader><CardTitle>Profil</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><div className="flex items-center justify-between"><span>Email</span><span>{profile?.email ?? "-"}</span></div><div className="flex items-center justify-between"><span>Nom</span><span>{profile?.full_name ?? "-"}</span></div><div className="flex items-center justify-between"><span>Role</span><Badge variant="outline">{profile?.role ?? "rh"}</Badge></div></CardContent></Card>
                  <Card><CardHeader><CardTitle>Session</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><div className="flex items-center justify-between"><span>Expire</span><span>{sessionExpiry ?? "Inconnu"}</span></div><div className="flex items-center justify-between"><span>User ID</span><span className="font-mono text-xs">{user?.id ?? "N/A"}</span></div><Button variant="outline" onClick={handleSignOut}><LogOut className="mr-2 h-4 w-4" />Se deconnecter</Button></CardContent></Card>
                </section>
              )}

              {currentSection === "collaborateurs" && (
                <Card>
                  <CardHeader><CardTitle>Salaries / Collaborateurs</CardTitle></CardHeader>
                  <CardContent>
                    {currentSubSection === "collab_detail" && selectedEmployee ? (
                      <div className="space-y-4 text-sm">
                        <div>
                          <Button asChild variant="outline" size="sm">
                            <Link href="/dashboard/rh/collaborateurs">Retour</Link>
                          </Button>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded border border-slate-200 p-3">
                            <p className="text-xs text-[#0A1A2F]/60">Nom</p>
                            <input
                              type="text"
                              value={activeDraft?.full_name ?? ""}
                              onChange={(event) => selectedEmployee && setEmployeeDrafts((prev) => ({ ...prev, [selectedEmployee.id]: { ...(activeDraft ?? { full_name: "", phone: "", company_name: "", esn_partenaire: "", employment_status: "active" }), full_name: event.target.value } }))}
                              className="mt-1 h-9 w-full border border-slate-300 px-2 text-sm"
                            />
                          </div>
                          <div className="rounded border border-slate-200 p-3">
                            <p className="text-xs text-[#0A1A2F]/60">Email</p>
                            <p className="font-medium">{selectedEmployee.email}</p>
                          </div>
                          <div className="rounded border border-slate-200 p-3">
                            <p className="text-xs text-[#0A1A2F]/60">Telephone</p>
                            <input
                              type="text"
                              value={activeDraft?.phone ?? ""}
                              onChange={(event) => selectedEmployee && setEmployeeDrafts((prev) => ({ ...prev, [selectedEmployee.id]: { ...(activeDraft ?? { full_name: "", phone: "", company_name: "", esn_partenaire: "", employment_status: "active" }), phone: event.target.value } }))}
                              className="mt-1 h-9 w-full border border-slate-300 px-2 text-sm"
                            />
                          </div>
                          <div className="rounded border border-slate-200 p-3">
                            <p className="text-xs text-[#0A1A2F]/60">Statut employment</p>
                            <select
                              value={activeDraft?.employment_status ?? "active"}
                              onChange={(event) => selectedEmployee && setEmployeeDrafts((prev) => ({ ...prev, [selectedEmployee.id]: { ...(activeDraft ?? { full_name: "", phone: "", company_name: "", esn_partenaire: "", employment_status: "active" }), employment_status: event.target.value } }))}
                              className="mt-1 h-9 w-full border border-slate-300 px-2 text-sm"
                            >
                              <option value="active">active</option>
                              <option value="inactive">inactive</option>
                              <option value="exited">exited</option>
                            </select>
                          </div>
                          <div className="rounded border border-slate-200 p-3">
                            <p className="text-xs text-[#0A1A2F]/60">Entreprise</p>
                            <input
                              type="text"
                              value={activeDraft?.company_name ?? ""}
                              onChange={(event) => selectedEmployee && setEmployeeDrafts((prev) => ({ ...prev, [selectedEmployee.id]: { ...(activeDraft ?? { full_name: "", phone: "", company_name: "", esn_partenaire: "", employment_status: "active" }), company_name: event.target.value } }))}
                              className="mt-1 h-9 w-full border border-slate-300 px-2 text-sm"
                            />
                          </div>
                          <div className="rounded border border-slate-200 p-3">
                            <p className="text-xs text-[#0A1A2F]/60">ESN partenaire</p>
                            <input
                              type="text"
                              value={activeDraft?.esn_partenaire ?? ""}
                              onChange={(event) => selectedEmployee && setEmployeeDrafts((prev) => ({ ...prev, [selectedEmployee.id]: { ...(activeDraft ?? { full_name: "", phone: "", company_name: "", esn_partenaire: "", employment_status: "active" }), esn_partenaire: event.target.value } }))}
                              className="mt-1 h-9 w-full border border-slate-300 px-2 text-sm"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button type="button" onClick={() => void handleSaveEmployee()} disabled={savingEmployee}>
                            {savingEmployee ? "Enregistrement..." : "Enregistrer"}
                          </Button>
                          {saveMessage && <p className="text-sm text-[#0A1A2F]/70">{saveMessage}</p>}
                        </div>

                        <div className="rounded border border-slate-200 p-3">
                          <p className="text-xs text-[#0A1A2F]/60">CV</p>
                          <p className="font-medium">{selectedEmployeeCv?.file_name ?? "Aucun CV"}</p>
                        </div>

                        <div className="rounded border border-slate-200 p-3">
                          <p className="mb-2 font-medium">Documents ({selectedEmployeeDocuments.length})</p>
                          {selectedEmployeeDocuments.length ? (
                            <ul className="space-y-1">
                              {selectedEmployeeDocuments.slice(0, 8).map((doc) => (
                                <li key={doc.id} className="text-[#0A1A2F]/80">
                                  {doc.typeLabel} - {doc.fileName} ({doc.status})
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-[#0A1A2F]/70">Aucun document.</p>
                          )}
                        </div>

                        <div className="rounded border border-slate-200 p-3">
                          <p className="mb-2 font-medium">Candidatures ({selectedEmployeeApplications.length})</p>
                          {selectedEmployeeApplications.length ? (
                            <ul className="space-y-1">
                              {selectedEmployeeApplications.map((application) => (
                                <li key={application.id} className="text-[#0A1A2F]/80">
                                  {application.jobTitle} - {application.status}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-[#0A1A2F]/70">Aucune candidature.</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="mb-3 text-sm text-[#0A1A2F]/70">{collaborateursRows.length} profil(s)</p>
                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                          <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-[#0A1A2F]/70"><tr><th className="px-3 py-2">Nom</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Statut</th></tr></thead>
                            <tbody className="divide-y divide-slate-200 bg-white">{collaborateursRows.map((e) => <tr key={e.id}><td className="px-3 py-2"><Link href={`/dashboard/rh/collaborateurs/${e.id}`} className="hover:underline">{e.full_name ?? "-"}</Link></td><td className="px-3 py-2">{e.email}</td><td className="px-3 py-2">{e.employment_status === "active" ? "Actif" : e.employment_status === "inactive" ? "Inactif" : e.employment_status === "exited" ? "Sorti" : "-"}</td></tr>)}</tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {currentSection === "documents" && (
                <Card>
                  <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-[#0A1A2F]/70"><tr><th className="px-3 py-2">Type</th><th className="px-3 py-2">Fichier</th><th className="px-3 py-2">Salarie</th><th className="px-3 py-2">Statut</th></tr></thead>
                        <tbody className="divide-y divide-slate-200 bg-white">{documents.map((d) => <tr key={d.id}><td className="px-3 py-2">{d.typeLabel}</td><td className="px-3 py-2">{d.fileName}</td><td className="px-3 py-2">{d.employeeName}</td><td className="px-3 py-2">{d.status}</td></tr>)}</tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {currentSection === "offres" && (
                <Card>
                  <CardHeader><CardTitle>Offres d&apos;emploi</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {currentSubSection === "offres_candidatures" ? (
                      <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-[#0A1A2F]/70"><tr><th className="px-3 py-2">Offre</th><th className="px-3 py-2">Candidat</th><th className="px-3 py-2">Statut</th></tr></thead><tbody className="divide-y divide-slate-200 bg-white">{applications.map((a) => <tr key={a.id}><td className="px-3 py-2">{a.jobTitle}</td><td className="px-3 py-2">{a.candidateName}</td><td className="px-3 py-2">{a.status}</td></tr>)}</tbody></table></div>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-[#0A1A2F]/70"><tr><th className="px-3 py-2">Titre</th><th className="px-3 py-2">Statut</th><th className="px-3 py-2">Lieu</th></tr></thead><tbody className="divide-y divide-slate-200 bg-white">{(currentSubSection === "offres_archives" ? offersArchives : offersActives).map((o) => <tr key={o.id}><td className="px-3 py-2">{o.title}</td><td className="px-3 py-2">{o.status}</td><td className="px-3 py-2">{o.location ?? "-"}</td></tr>)}</tbody></table></div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </main>

        {loading && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm text-[#0A1A2F] shadow"><Loader2 className="h-4 w-4 animate-spin text-[#0A1A2F]" />Chargement des donnees...</div>
          </div>
        )}
      </div>
    </div>
  );
}
