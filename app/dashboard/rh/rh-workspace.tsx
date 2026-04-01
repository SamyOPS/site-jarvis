"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient, type Session, type User } from "@supabase/supabase-js";
import { AlertCircle, Loader2, LogOut, Search, Settings, SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

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
type RequestStatus = "pending" | "uploaded" | "validated" | "rejected" | "expired" | "cancelled";
type DocumentTypeRow = {
  id: string;
  label: string;
  requiresPeriod: boolean;
  allowedUploaderRoles: string[];
};

type RHDocumentRow = {
  id: string;
  employeeId: string;
  employeeRole: string | null;
  documentTypeId: string;
  documentTypeCode: string;
  uploaderRole: string;
  employeeName: string;
  fileName: string;
  status: DocumentStatus;
  periodMonth: string | null;
  createdAt: string | null;
  reviewComment: string | null;
  typeLabel: string;
  storageBucket: string;
  storagePath: string;
  sourceKind: string;
};

type RequestRow = {
  id: string;
  employeeId: string;
  documentTypeId: string;
  employeeName: string;
  status: RequestStatus;
  dueAt: string | null;
  periodMonth: string | null;
  note: string | null;
  typeLabel: string;
};

type EventRow = {
  id: string;
  employeeId: string;
  createdAt: string;
  eventType: string;
  actorName: string;
  documentLabel: string;
};

type JobOfferRow = { id: string; title: string; status: "draft" | "published" | "archived"; location: string | null };
type ApplicationRow = { id: string; candidateId: string; status: "submitted" | "reviewed" | "rejected" | "accepted"; jobTitle: string; candidateName: string };
type ProfileCvRow = { user_id: string; file_name: string | null };

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleDateString("fr-FR");
};

const formatMonth = (value: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
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
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeRow[]>([]);
  const [documents, setDocuments] = useState<RHDocumentRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [jobOffers, setJobOffers] = useState<JobOfferRow[]>([]);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [cvsByUser, setCvsByUser] = useState<Record<string, ProfileCvRow>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: "", confirmPassword: "" });
  const [employeeDrafts, setEmployeeDrafts] = useState<Record<string, { full_name: string; phone: string; company_name: string; esn_partenaire: string; employment_status: string }>>({});
  const [downloadingDocumentId, setDownloadingDocumentId] = useState<string | null>(null);
  const [viewingDocumentId, setViewingDocumentId] = useState<string | null>(null);
  const [reviewingDocumentId, setReviewingDocumentId] = useState<string | null>(null);
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, string>>({});
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestEmployeeId, setRequestEmployeeId] = useState("");
  const [requestDocumentTypeId, setRequestDocumentTypeId] = useState("");
  const [requestDueAt, setRequestDueAt] = useState("");
  const [requestPeriodMonth, setRequestPeriodMonth] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [creatingRequest, setCreatingRequest] = useState(false);
  const [cancellingRequestId, setCancellingRequestId] = useState<string | null>(null);
  const [rhUploadDialogOpen, setRhUploadDialogOpen] = useState(false);
  const [rhUploadEmployeeId, setRhUploadEmployeeId] = useState("");
  const [rhUploadDocumentTypeId, setRhUploadDocumentTypeId] = useState("");
  const [rhUploadPeriodMonth, setRhUploadPeriodMonth] = useState("");
  const [rhUploadFile, setRhUploadFile] = useState<File | null>(null);
  const [uploadingRhDocument, setUploadingRhDocument] = useState(false);
  const [deletingRhDocumentId, setDeletingRhDocumentId] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    if (!supabase) return;

    const [employeesRes, documentTypesRes, docsRes, requestsRes, offersRes, appsRes, cvsRes] = await Promise.all([
      supabase.from("profiles").select("id,email,full_name,phone,role,professional_status,employment_status,company_name,esn_partenaire").eq("role", "salarie").order("email", { ascending: true }),
      supabase.from("document_types").select("id,label,requires_period,allowed_uploader_roles").eq("active", true).order("label", { ascending: true }),
      supabase.from("employee_documents").select("id,status,file_name,period_month,created_at,review_comment,uploader_role,storage_bucket,storage_path,source_kind,document_type:document_types(id,label,code),employee:profiles!employee_documents_employee_id_fkey(id,full_name,email,role)").order("created_at", { ascending: false }),
      supabase.from("document_requests").select("id,status,due_at,period_month,note,document_type:document_types(id,label),employee:profiles!document_requests_employee_id_fkey(id,full_name,email)").order("created_at", { ascending: false }),
      supabase.from("job_offers").select("id,title,status,location").order("created_at", { ascending: false }),
      supabase.from("applications").select("id,candidate_id,status,job:job_offers(title),candidate:profiles!applications_candidate_id_fkey(full_name,email)").order("created_at", { ascending: false }),
      supabase.from("profile_cvs").select("user_id,file_name"),
    ]);

    if (employeesRes.error || documentTypesRes.error || docsRes.error || requestsRes.error || offersRes.error || appsRes.error || cvsRes.error) {
      setError(employeesRes.error?.message ?? documentTypesRes.error?.message ?? docsRes.error?.message ?? requestsRes.error?.message ?? offersRes.error?.message ?? appsRes.error?.message ?? cvsRes.error?.message ?? "Erreur RH");
      return;
    }

    setEmployees((employeesRes.data as ProfileRow[]) ?? []);
    setDocumentTypes(
      ((documentTypesRes.data ?? []) as {
        id: string;
        label: string;
        requires_period: boolean | null;
        allowed_uploader_roles: string[] | null;
      }[]).map((row) => ({
        id: row.id,
        label: row.label,
        requiresPeriod: Boolean(row.requires_period),
        allowedUploaderRoles: row.allowed_uploader_roles ?? [],
      })),
    );

    const mappedDocuments = (docsRes.data ?? []).map((row: { id: string; status: DocumentStatus; file_name: string; period_month: string | null; created_at: string | null; review_comment: string | null; uploader_role: string | null; storage_bucket: string | null; storage_path: string | null; source_kind: string | null; document_type: { id: string; label: string; code: string | null } | { id: string; label: string; code: string | null }[] | null; employee: { id: string; full_name: string | null; email: string; role: string | null } | { id: string; full_name: string | null; email: string; role: string | null }[] | null }) => {
      const employee = normalizeJoinOne(row.employee);
      const type = normalizeJoinOne(row.document_type);
      const employeeName =
        row.uploader_role === "rh" && employee?.role !== "salarie"
          ? "Aucun collaborateur"
          : employee?.full_name ?? employee?.email ?? "Utilisateur";
      return {
        id: row.id,
        employeeId: employee?.id ?? "",
        employeeRole: employee?.role ?? null,
        documentTypeId: type?.id ?? "",
        documentTypeCode: type?.code ?? "",
        uploaderRole: row.uploader_role ?? "",
        employeeName,
        fileName: row.file_name,
        status: row.status,
        periodMonth: row.period_month,
        createdAt: row.created_at,
        reviewComment: row.review_comment,
        typeLabel: type?.label ?? "Document",
        storageBucket: row.storage_bucket ?? "employee-documents",
        storagePath: row.storage_path ?? "",
        sourceKind: row.source_kind ?? "uploaded",
      } satisfies RHDocumentRow;
    });
    setDocuments(mappedDocuments);

    const mappedRequests = (requestsRes.data ?? []).map((row: { id: string; status: RequestStatus; due_at: string | null; period_month: string | null; note: string | null; document_type: { id: string; label: string } | { id: string; label: string }[] | null; employee: { id: string; full_name: string | null; email: string } | { id: string; full_name: string | null; email: string }[] | null }) => {
      const employee = normalizeJoinOne(row.employee);
      const type = normalizeJoinOne(row.document_type);
      return {
        id: row.id,
        employeeId: employee?.id ?? "",
        documentTypeId: type?.id ?? "",
        employeeName: employee?.full_name ?? employee?.email ?? "Utilisateur",
        status: row.status,
        dueAt: row.due_at,
        periodMonth: row.period_month,
        note: row.note,
        typeLabel: type?.label ?? "Document",
      } satisfies RequestRow;
    });
    setRequests(mappedRequests);

    setJobOffers((offersRes.data ?? []) as JobOfferRow[]);
    setApplications((appsRes.data ?? []).map((row: { id: string; candidate_id: string; status: ApplicationRow["status"]; job: { title: string | null } | { title: string | null }[] | null; candidate: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null }) => {
      const job = normalizeJoinOne(row.job);
      const candidate = normalizeJoinOne(row.candidate);
      return { id: row.id, candidateId: row.candidate_id, status: row.status, jobTitle: job?.title ?? "Offre", candidateName: candidate?.full_name ?? candidate?.email ?? "Candidat" } satisfies ApplicationRow;
    }));
    setCvsByUser(Object.fromEntries(((cvsRes.data ?? []) as ProfileCvRow[]).map((row) => [row.user_id, row])));

    const documentIds = mappedDocuments.map((document) => document.id);
    if (!documentIds.length) {
      setEvents([]);
      return;
    }

    const { data: eventsData, error: eventsError } = await supabase.from("document_events").select("id,created_at,event_type,actor:profiles(full_name,email),document:employee_documents(id,file_name,document_type:document_types(label))").in("document_id", documentIds).order("created_at", { ascending: false }).limit(40);
    if (eventsError) {
      setError(eventsError.message);
      return;
    }
    const documentsById = Object.fromEntries(mappedDocuments.map((document) => [document.id, document]));
    setEvents((eventsData ?? []).map((row: { id: string; created_at: string; event_type: string; actor: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null; document: { id: string; file_name: string | null; document_type: { label: string } | { label: string }[] | null } | { id: string; file_name: string | null; document_type: { label: string } | { label: string }[] | null }[] | null }) => {
      const actor = normalizeJoinOne(row.actor);
      const document = normalizeJoinOne(row.document);
      const type = normalizeJoinOne(document?.document_type);
      const source = document?.id ? documentsById[document.id] : null;
      return {
        id: row.id,
        employeeId: source?.employeeId ?? "",
        createdAt: row.created_at,
        eventType: row.event_type,
        actorName: actor?.full_name ?? actor?.email ?? "Systeme",
        documentLabel: type?.label ?? document?.file_name ?? "Document",
      } satisfies EventRow;
    }).filter((row) => row.employeeId));
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
      setSession(sessionData.session);
      setUser(sessionData.session.user);
      const { data: profileData, error: profileError } = await supabase.from("profiles").select("id,email,full_name,phone,role,professional_status,employment_status,company_name,esn_partenaire").eq("id", sessionData.session.user.id).single();
      if (profileError || !profileData || profileData.role !== "rh" || profileData.professional_status !== "verified") {
        setLoading(false);
        router.push("/auth");
        return;
      }
      setProfile(profileData);
      await loadDashboardData();
      setLoading(false);
    };
    void load();
  }, [loadDashboardData, router]);

  const displayName = useMemo(() => {
    const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string; display_name?: string };
    return meta.full_name ?? meta.name ?? meta.display_name ?? profile?.full_name ?? profile?.email ?? "utilisateur";
  }, [profile?.email, profile?.full_name, user?.user_metadata]);

  const currentSection = pathname.startsWith("/dashboard/rh/collaborateurs") ? "collaborateurs" : pathname.startsWith("/dashboard/rh/documents") ? "documents" : pathname.startsWith("/dashboard/rh/offres") ? "offres" : pathname.startsWith("/dashboard/rh/parametres") ? "parametres" : "overview";
  const currentSubSection = /^\/dashboard\/rh\/collaborateurs\/[a-f0-9-]+$/i.test(pathname) ? "collab_detail" : pathname.startsWith("/dashboard/rh/collaborateurs/actifs") ? "collab_actifs" : pathname.startsWith("/dashboard/rh/collaborateurs/inactifs") ? "collab_inactifs" : pathname.startsWith("/dashboard/rh/documents/a-valider") ? "docs_a_valider" : pathname.startsWith("/dashboard/rh/documents/mes-demandes") ? "docs_mes_demandes" : pathname.startsWith("/dashboard/rh/documents/salaries") ? "docs_salaries" : pathname.startsWith("/dashboard/rh/offres/candidatures") ? "offres_candidatures" : pathname.startsWith("/dashboard/rh/offres/archives") ? "offres_archives" : pathname.startsWith("/dashboard/rh/offres/creer") ? "offres_creer" : pathname.startsWith("/dashboard/rh/offres") ? "offres_actives" : pathname.startsWith("/dashboard/rh/documents") ? "docs_tous" : pathname.startsWith("/dashboard/rh/collaborateurs") ? "collab_tous" : "overview";

  const selectedEmployeeId = useMemo(() => pathname.match(/^\/dashboard\/rh\/collaborateurs\/([a-f0-9-]+)$/i)?.[1] ?? null, [pathname]);
  const selectedEmployee = useMemo(() => employees.find((employee) => employee.id === selectedEmployeeId) ?? null, [employees, selectedEmployeeId]);
  const activeDraft = useMemo(() => {
    if (!selectedEmployee) return null;
    return employeeDrafts[selectedEmployee.id] ?? { full_name: selectedEmployee.full_name ?? "", phone: selectedEmployee.phone ?? "", company_name: selectedEmployee.company_name ?? "", esn_partenaire: selectedEmployee.esn_partenaire ?? "", employment_status: selectedEmployee.employment_status ?? "active" };
  }, [employeeDrafts, selectedEmployee]);
  const selectedEmployeeDocuments = useMemo(() => documents.filter((document) => document.employeeId === selectedEmployeeId), [documents, selectedEmployeeId]);
  const selectedEmployeeRequests = useMemo(() => requests.filter((request) => request.employeeId === selectedEmployeeId), [requests, selectedEmployeeId]);
  const selectedEmployeeEvents = useMemo(() => events.filter((event) => event.employeeId === selectedEmployeeId), [events, selectedEmployeeId]);
  const selectedEmployeeApplications = useMemo(() => applications.filter((application) => application.candidateId === selectedEmployeeId), [applications, selectedEmployeeId]);
  const salarieDocuments = useMemo(() => documents.filter((document) => document.uploaderRole === "salarie"), [documents]);
  const rhDocuments = useMemo(() => documents.filter((document) => document.uploaderRole === "rh"), [documents]);
  const pendingDocuments = useMemo(() => salarieDocuments.filter((document) => document.status === "pending"), [salarieDocuments]);
  const openRequests = useMemo(() => requests.filter((request) => ["pending", "uploaded", "rejected", "expired"].includes(request.status)), [requests]);
  const currentMonthDocuments = useMemo(() => {
    const now = new Date();
    return documents.filter((document) => {
      if (!document.createdAt) return false;
      const createdAt = new Date(document.createdAt);
      return !Number.isNaN(createdAt.getTime()) && createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
    });
  }, [documents]);
  const collaborateursRows = useMemo(() => currentSubSection === "collab_actifs" ? employees.filter((employee) => employee.employment_status === "active") : currentSubSection === "collab_inactifs" ? employees.filter((employee) => ["inactive", "exited"].includes(employee.employment_status ?? "")) : employees, [currentSubSection, employees]);
  const salarieUploadableTypes = useMemo(() => documentTypes.filter((documentType) => documentType.allowedUploaderRoles.length === 0 || documentType.allowedUploaderRoles.includes("salarie")), [documentTypes]);
  const rhUploadableTypes = useMemo(() => documentTypes.filter((documentType) => documentType.allowedUploaderRoles.length === 0 || documentType.allowedUploaderRoles.includes("rh")), [documentTypes]);
  const selectedRequestType = useMemo(() => salarieUploadableTypes.find((documentType) => documentType.id === requestDocumentTypeId) ?? null, [requestDocumentTypeId, salarieUploadableTypes]);
  const selectedRhUploadType = useMemo(() => rhUploadableTypes.find((documentType) => documentType.id === rhUploadDocumentTypeId) ?? null, [rhUploadDocumentTypeId, rhUploadableTypes]);

  const resetRequestDialog = useCallback(() => {
    setRequestEmployeeId("");
    setRequestDocumentTypeId("");
    setRequestDueAt("");
    setRequestPeriodMonth("");
    setRequestNote("");
  }, []);

  const openRequestDialog = useCallback((employeeId?: string) => {
    setRequestEmployeeId(employeeId ?? "");
    setRequestDocumentTypeId("");
    setRequestDueAt("");
    setRequestPeriodMonth("");
    setRequestNote("");
    setSaveMessage(null);
    setRequestDialogOpen(true);
  }, []);

  const resetRhUploadDialog = useCallback(() => {
    setRhUploadEmployeeId("");
    setRhUploadDocumentTypeId("");
    setRhUploadPeriodMonth("");
    setRhUploadFile(null);
  }, []);

  const handleSaveEmployee = async () => {
    if (!supabase || !selectedEmployee || !activeDraft) return;
    setSavingEmployee(true);
    setSaveMessage(null);
    const { error: updateError } = await supabase.from("profiles").update({ full_name: activeDraft.full_name || null, phone: activeDraft.phone || null, company_name: activeDraft.company_name || null, esn_partenaire: activeDraft.esn_partenaire || null, employment_status: activeDraft.employment_status }).eq("id", selectedEmployee.id);
    if (updateError) {
      setSaveMessage(updateError.message);
      setSavingEmployee(false);
      return;
    }
    await loadDashboardData();
    setSaveMessage("Informations mises a jour.");
    setSavingEmployee(false);
  };

  const findMatchingRequest = useCallback((employeeId: string, documentTypeId: string, periodMonth: string | null) => {
    return (
      requests.find((request) =>
        request.employeeId === employeeId &&
        request.documentTypeId === documentTypeId &&
        (request.periodMonth ?? "") === (periodMonth ?? "") &&
        ["pending", "uploaded", "rejected", "expired"].includes(request.status),
      ) ??
      requests.find((request) =>
        request.employeeId === employeeId &&
        request.documentTypeId === documentTypeId &&
        ["pending", "uploaded", "rejected", "expired"].includes(request.status),
      ) ??
      null
    );
  }, [requests]);

  const handleCreateRequest = useCallback(async () => {
    if (!supabase || !user) return;
    if (!requestEmployeeId || !requestDocumentTypeId) {
      setSaveMessage("Choisis un collaborateur et un type de document.");
      return;
    }
    if (selectedRequestType?.requiresPeriod && !requestPeriodMonth) {
      setSaveMessage("Ce type de document demande une periode.");
      return;
    }

    setCreatingRequest(true);
    setSaveMessage(null);
    const now = new Date().toISOString();
    const { error: insertError } = await supabase.from("document_requests").insert({
      employee_id: requestEmployeeId,
      document_type_id: requestDocumentTypeId,
      requested_by: user.id,
      status: "pending",
      due_at: requestDueAt ? new Date(requestDueAt).toISOString() : null,
      period_month: requestPeriodMonth ? `${requestPeriodMonth}-01` : null,
      note: requestNote.trim() || null,
      updated_at: now,
    });

    if (insertError) {
      setSaveMessage(insertError.message);
      setCreatingRequest(false);
      return;
    }

    setCreatingRequest(false);
    setRequestDialogOpen(false);
    resetRequestDialog();
    setSaveMessage("Demande documentaire creee.");
    await loadDashboardData();
  }, [loadDashboardData, requestDocumentTypeId, requestDueAt, requestEmployeeId, requestNote, requestPeriodMonth, resetRequestDialog, selectedRequestType?.requiresPeriod, user]);

  const handleCancelRequest = useCallback(async (request: RequestRow) => {
    if (!supabase) return;
    if (!["pending", "uploaded", "rejected", "expired"].includes(request.status)) {
      setSaveMessage("Cette demande ne peut plus etre annulee.");
      return;
    }

    setCancellingRequestId(request.id);
    setSaveMessage(null);

    const { error: updateError } = await supabase
      .from("document_requests")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", request.id);

    if (updateError) {
      setSaveMessage(updateError.message);
      setCancellingRequestId(null);
      return;
    }

    setCancellingRequestId(null);
    setSaveMessage("Demande documentaire annulee.");
    await loadDashboardData();
  }, [loadDashboardData]);

  const handleRhUpload = useCallback(async () => {
    if (!session?.access_token) {
      setSaveMessage("Session RH manquante.");
      return;
    }
    if (!rhUploadDocumentTypeId || !rhUploadFile) {
      setSaveMessage("Choisis un type de document et un fichier.");
      return;
    }
    if (selectedRhUploadType?.requiresPeriod && !rhUploadPeriodMonth) {
      setSaveMessage("Ce type de document demande une periode.");
      return;
    }

    setUploadingRhDocument(true);
    setSaveMessage(null);

    const formData = new FormData();
    if (rhUploadEmployeeId) {
      formData.set("employeeId", rhUploadEmployeeId);
    }
    formData.set("documentTypeId", rhUploadDocumentTypeId);
    if (rhUploadPeriodMonth) {
      formData.set("periodMonth", rhUploadPeriodMonth);
    }
    formData.set("file", rhUploadFile);

    const response = await fetch("/api/rh/documents/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: formData,
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setSaveMessage(payload?.error ?? "Depot RH impossible.");
      setUploadingRhDocument(false);
      return;
    }

    setUploadingRhDocument(false);
    setRhUploadDialogOpen(false);
    resetRhUploadDialog();
    setSaveMessage("Document RH depose.");
    await loadDashboardData();
  }, [loadDashboardData, resetRhUploadDialog, rhUploadDocumentTypeId, rhUploadEmployeeId, rhUploadFile, rhUploadPeriodMonth, selectedRhUploadType?.requiresPeriod, session]);

  const handleDeleteRhDocument = useCallback(async (document: RHDocumentRow) => {
    if (!session?.access_token) {
      setSaveMessage("Session RH manquante.");
      return;
    }
    if (!window.confirm(`Supprimer le document RH "${document.fileName}" ?`)) {
      return;
    }

    setDeletingRhDocumentId(document.id);
    setSaveMessage(null);

    const response = await fetch("/api/rh/documents/upload", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ documentId: document.id }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setSaveMessage(payload?.error ?? "Suppression RH impossible.");
      setDeletingRhDocumentId(null);
      return;
    }

    setDeletingRhDocumentId(null);
    setSaveMessage("Document RH supprime.");
    await loadDashboardData();
  }, [loadDashboardData, session]);

  const getSignedDocumentUrl = useCallback(async (document: RHDocumentRow) => {
    if (!supabase || !document.storagePath) return;
    const { data, error: downloadError } = await supabase.storage.from(document.storageBucket).createSignedUrl(document.storagePath, 60);
    if (downloadError || !data?.signedUrl) {
      throw new Error(downloadError?.message ?? "Impossible de generer le lien de telechargement.");
    }

    return data.signedUrl;
  }, []);

  const handleViewDocument = useCallback(async (document: RHDocumentRow) => {
    if (!document.storagePath) return;

    try {
      setViewingDocumentId(document.id);
      setSaveMessage(null);
      const signedUrl = await getSignedDocumentUrl(document);
      if (!signedUrl) {
        return;
      }

      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Impossible d'ouvrir le document.");
    } finally {
      setViewingDocumentId(null);
    }
  }, [getSignedDocumentUrl]);

  const handleDownloadDocument = useCallback(async (document: RHDocumentRow) => {
    if (!document.storagePath) return;

    try {
      setDownloadingDocumentId(document.id);
      setSaveMessage(null);
      const signedUrl = await getSignedDocumentUrl(document);
      if (!signedUrl) {
        return;
      }

      const link = window.document.createElement("a");
      link.href = signedUrl;
      link.download = document.fileName;
      link.rel = "noopener noreferrer";
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Impossible de telecharger le document.");
    } finally {
      setDownloadingDocumentId(null);
    }
  }, [getSignedDocumentUrl]);

  const handleReviewDocument = useCallback(async (document: RHDocumentRow, nextStatus: "pending" | "validated" | "rejected") => {
    if (!supabase || !user) return;

    const reviewComment = (reviewDrafts[document.id] ?? "").trim();
    if (nextStatus === "rejected" && !reviewComment) {
      setSaveMessage("Un commentaire est obligatoire pour refuser un document.");
      return;
    }

    setReviewingDocumentId(document.id);
    setSaveMessage(null);

    const reviewedAt = new Date().toISOString();
    const nextReviewFields =
      nextStatus === "pending"
        ? {
            reviewed_by: null,
            reviewed_at: null,
            review_comment: null,
          }
        : {
            reviewed_by: user.id,
            reviewed_at: reviewedAt,
            review_comment: reviewComment || null,
          };
    const { error: documentError } = await supabase
      .from("employee_documents")
      .update({
        status: nextStatus,
        ...nextReviewFields,
        updated_at: reviewedAt,
      })
      .eq("id", document.id);

    if (documentError) {
      setSaveMessage(documentError.message);
      setReviewingDocumentId(null);
      return;
    }

    const matchingRequest = findMatchingRequest(document.employeeId, document.documentTypeId, document.periodMonth);
    const generatedRecordStatus = nextStatus === "pending" ? "submitted" : nextStatus;

    const requestPromise = matchingRequest
      ? supabase.from("document_requests").update({ status: nextStatus, updated_at: reviewedAt }).eq("id", matchingRequest.id)
      : Promise.resolve({ error: null });

    const generatedRecordPromise =
      document.sourceKind === "generated" && document.documentTypeCode === "cra"
        ? supabase
            .from("cra_records")
            .update({
              status: generatedRecordStatus,
              updated_at: reviewedAt,
              submitted_at: nextStatus === "pending" ? reviewedAt : undefined,
              validated_at: nextStatus === "validated" ? reviewedAt : null,
              rejected_at: nextStatus === "rejected" ? reviewedAt : null,
            })
            .eq("employee_document_id", document.id)
        : document.sourceKind === "generated" && document.documentTypeCode === "facture"
          ? supabase
              .from("invoice_records")
              .update({
                status: generatedRecordStatus,
                updated_at: reviewedAt,
                submitted_at: nextStatus === "pending" ? reviewedAt : undefined,
                validated_at: nextStatus === "validated" ? reviewedAt : null,
                rejected_at: nextStatus === "rejected" ? reviewedAt : null,
              })
              .eq("employee_document_id", document.id)
          : Promise.resolve({ error: null });

    const eventPromise = supabase.from("document_events").insert({
      document_id: document.id,
      actor_id: user.id,
      event_type: nextStatus,
      payload: {
        review_comment: reviewComment || null,
        employee_id: document.employeeId,
        document_type_id: document.documentTypeId,
      },
    });

    const [{ error: requestError }, { error: generatedRecordError }, { error: eventError }] = await Promise.all([requestPromise, generatedRecordPromise, eventPromise]);

    if (requestError || generatedRecordError || eventError) {
      setSaveMessage(requestError?.message ?? generatedRecordError?.message ?? eventError?.message ?? "Le statut du document a ete mis a jour, mais le suivi n'est pas complet.");
      setReviewingDocumentId(null);
      await loadDashboardData();
      return;
    }

    setReviewDrafts((prev) => ({ ...prev, [document.id]: "" }));
    setSaveMessage(nextStatus === "validated" ? "Document valide." : nextStatus === "rejected" ? "Document refuse." : "Document remis en attente.");
    setReviewingDocumentId(null);
    await loadDashboardData();
  }, [findMatchingRequest, loadDashboardData, reviewDrafts, user]);

  const handlePasswordUpdate = useCallback(async () => {
    if (!supabase) return;

    if (passwordForm.newPassword.length < 8) {
      setPasswordMessage("Le nouveau mot de passe doit contenir au moins 8 caracteres.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage("La confirmation du mot de passe ne correspond pas.");
      return;
    }

    setPasswordSaving(true);
    setPasswordMessage(null);

    const { error: passwordError } = await supabase.auth.updateUser({
      password: passwordForm.newPassword,
    });

    if (passwordError) {
      setPasswordMessage(passwordError.message);
      setPasswordSaving(false);
      return;
    }

    setPasswordForm({ newPassword: "", confirmPassword: "" });
    setPasswordMessage("Mot de passe mis a jour.");
    setPasswordSaving(false);
  }, [passwordForm]);

  return (
    <div className="h-screen overflow-hidden bg-[#eaf0fb] text-[#0A1A2F]">
      <div className="relative h-full">
        <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:block lg:w-[232px]">
          <div className="flex h-full flex-col gap-4 px-4 py-5">
            <Link href="/" className="block rounded-2xl px-2 py-1 transition hover:bg-white/60">
              <p className="text-lg font-semibold tracking-tight text-[#0A1A2F]">Jarvis Connect</p>
            </Link>
            <nav className="mt-5 space-y-1 text-sm">
              <Link href="/dashboard/rh" className={`block px-1 py-2 hover:underline ${currentSection === "overview" ? "font-semibold" : ""}`}>Vue d&apos;ensemble</Link>
              <Link href="/dashboard/rh/collaborateurs" className={`block px-1 py-2 hover:underline ${currentSection === "collaborateurs" ? "font-semibold" : ""}`}>Collaborateurs</Link>
              {currentSection === "collaborateurs" && (
                <div className="ml-3 space-y-1 border-l border-slate-200 pl-3 text-xs">
                  <Link href="/dashboard/rh/collaborateurs" className={`block py-1 ${currentSubSection === "collab_tous" ? "font-semibold" : ""}`}>Tous les collaborateurs</Link>
                  <Link href="/dashboard/rh/collaborateurs/actifs" className={`block py-1 ${currentSubSection === "collab_actifs" ? "font-semibold" : ""}`}>Actifs</Link>
                  <Link href="/dashboard/rh/collaborateurs/inactifs" className={`block py-1 ${currentSubSection === "collab_inactifs" ? "font-semibold" : ""}`}>Inactifs / Sortants</Link>
                  {currentSubSection === "collab_detail" && <span className="block py-1 font-semibold">Fiche collaborateur</span>}
                </div>
              )}
              <Link href="/dashboard/rh/documents" className={`block px-1 py-2 hover:underline ${currentSection === "documents" ? "font-semibold" : ""}`}>Documents</Link>
              {currentSection === "documents" && (
                <div className="ml-3 space-y-1 border-l border-slate-200 pl-3 text-xs">
                  <Link href="/dashboard/rh/documents/a-valider" className={`block py-1 ${currentSubSection === "docs_a_valider" ? "font-semibold" : ""}`}>A valider</Link>
                  <Link href="/dashboard/rh/documents" className={`block py-1 ${currentSubSection === "docs_tous" ? "font-semibold" : ""}`}>Tous les documents</Link>
                  <Link href="/dashboard/rh/documents/salaries" className={`block py-1 ${currentSubSection === "docs_salaries" ? "font-semibold" : ""}`}>Documents salaries</Link>
                  <Link href="/dashboard/rh/documents/mes-demandes" className={`block py-1 ${currentSubSection === "docs_mes_demandes" ? "font-semibold" : ""}`}>Mes demandes</Link>
                </div>
              )}
              <Link href="/dashboard/rh/offres" className={`block px-1 py-2 hover:underline ${currentSection === "offres" ? "font-semibold" : ""}`}>Offres</Link>
              {currentSection === "offres" && (
                <div className="ml-3 space-y-1 border-l border-slate-200 pl-3 text-xs">
                  <Link href="/dashboard/rh/offres" className={`block py-1 ${currentSubSection === "offres_actives" ? "font-semibold" : ""}`}>Offres actives</Link>
                  <Link href="/dashboard/rh/offres/candidatures" className={`block py-1 ${currentSubSection === "offres_candidatures" ? "font-semibold" : ""}`}>Candidatures</Link>
                  <Link href="/dashboard/rh/offres/archives" className={`block py-1 ${currentSubSection === "offres_archives" ? "font-semibold" : ""}`}>Archives</Link>
                  <Link href="/dashboard/rh/offres/creer" className={`block py-1 ${currentSubSection === "offres_creer" ? "font-semibold" : ""}`}>Creer une offre</Link>
                </div>
              )}
            </nav>
            <div className="mt-auto space-y-1">
              <button type="button" className="flex items-center px-1 py-2 text-sm hover:underline" onClick={async () => { if (!supabase) return; await supabase.auth.signOut(); router.push("/auth"); }}>
                <LogOut className="mr-2 h-4 w-4" />
                Deconnexion
              </button>
            </div>
          </div>
        </aside>

        <aside className="hidden lg:fixed lg:inset-y-0 lg:right-0 lg:block lg:w-[86px]">
          <div className="flex h-full items-stretch justify-center px-2 py-5" />
        </aside>

        <main className="flex h-full flex-col overflow-hidden px-2 py-2 lg:ml-[232px] lg:mr-[86px] lg:px-3 lg:py-3">
          <div className="hidden lg:flex items-center rounded-[30px] px-2 py-1.5">
            <div className="flex min-w-0 flex-1 items-center">
              <div className="flex w-full max-w-lg items-center gap-3 rounded-full border border-white/70 bg-white/70 px-5 py-3 shadow-[0_8px_24px_rgba(148,163,184,0.14)] backdrop-blur">
                  <Search className="h-4 w-4 text-[#0A1A2F]/55" />
                  <span className="text-sm text-[#0A1A2F]/55">Rechercher dans l&apos;espace RH</span>
                  <SlidersHorizontal className="ml-auto h-4 w-4 text-[#0A1A2F]/45" />
              </div>
            </div>
          </div>
          <div className="hidden lg:fixed lg:right-4 lg:top-[18px] lg:flex lg:items-center lg:gap-2">
            <Link
              href="/dashboard/rh/parametres"
              aria-label="Parametres"
              className={`flex h-9 w-9 items-center justify-center text-[#0A1A2F]/75 transition hover:text-[#0A1A2F] ${currentSection === "parametres" ? "text-[#0A1A2F]" : ""}`}
            >
              <Settings className="h-4 w-4" />
            </Link>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0A1A2F] text-sm font-semibold text-white shadow-sm">
              {displayName.charAt(0).toUpperCase()}
            </div>
          </div>

          <div className="mt-2 min-h-0 flex-1 overflow-y-auto rounded-[30px] border border-white/70 bg-white px-4 py-6 overscroll-contain lg:px-8 lg:py-8">
          <div className="space-y-4">
          {(!supabase || error) && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div><p className="font-semibold">Erreur</p><p>{error ?? "Configuration Supabase manquante."}</p></div>
            </div>
          )}

          {saveMessage && !error && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-[#0A1A2F]">
              {saveMessage}
            </div>
          )}

          {currentSection === "overview" && (
            <>
              <section className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <Card><CardContent className="pt-6"><p className="text-sm text-[#0A1A2F]/70">Docs en attente</p><p className="mt-1 text-2xl font-semibold">{pendingDocuments.length}</p></CardContent></Card>
                <Card><CardContent className="pt-6"><p className="text-sm text-[#0A1A2F]/70">Demandes ouvertes</p><p className="mt-1 text-2xl font-semibold">{openRequests.length}</p></CardContent></Card>
                <Card><CardContent className="pt-6"><p className="text-sm text-[#0A1A2F]/70">Salaries suivis</p><p className="mt-1 text-2xl font-semibold">{employees.length}</p></CardContent></Card>
                <Card><CardContent className="pt-6"><p className="text-sm text-[#0A1A2F]/70">Docs ce mois</p><p className="mt-1 text-2xl font-semibold">{currentMonthDocuments.length}</p></CardContent></Card>
              </section>

              <Card>
                <CardHeader><CardTitle>Priorites</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {openRequests.slice(0, 8).map((request) => (
                    <div key={request.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">{request.employeeName} - {request.typeLabel}</p>
                          <p className="text-sm text-[#0A1A2F]/70">Echeance: {formatDate(request.dueAt)} | Periode: {formatMonth(request.periodMonth)}</p>
                        </div>
                        <Badge variant="outline">{request.status}</Badge>
                      </div>
                    </div>
                  ))}
                  {!openRequests.length && <p className="text-sm text-[#0A1A2F]/70">Aucune priorite documentaire.</p>}
                </CardContent>
              </Card>
            </>
          )}

          {currentSection === "collaborateurs" && (
            <Card>
              <CardHeader><CardTitle>Collaborateurs</CardTitle></CardHeader>
              <CardContent>
                {currentSubSection === "collab_detail" && selectedEmployee && activeDraft ? (
                  <div className="space-y-4 text-sm">
                    <Button asChild variant="outline" size="sm"><Link href="/dashboard/rh/collaborateurs">Retour</Link></Button>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <div className="rounded border border-slate-200 p-3"><p className="text-xs text-[#0A1A2F]/60">Nom</p><input value={activeDraft.full_name} onChange={(event) => setEmployeeDrafts((prev) => ({ ...prev, [selectedEmployee.id]: { ...activeDraft, full_name: event.target.value } }))} className="mt-1 h-9 w-full border border-slate-300 px-2 text-sm" /></div>
                      <div className="rounded border border-slate-200 p-3"><p className="text-xs text-[#0A1A2F]/60">Email</p><p className="font-medium">{selectedEmployee.email}</p></div>
                      <div className="rounded border border-slate-200 p-3"><p className="text-xs text-[#0A1A2F]/60">Telephone</p><input value={activeDraft.phone} onChange={(event) => setEmployeeDrafts((prev) => ({ ...prev, [selectedEmployee.id]: { ...activeDraft, phone: event.target.value } }))} className="mt-1 h-9 w-full border border-slate-300 px-2 text-sm" /></div>
                      <div className="rounded border border-slate-200 p-3"><p className="text-xs text-[#0A1A2F]/60">Entreprise</p><input value={activeDraft.company_name} onChange={(event) => setEmployeeDrafts((prev) => ({ ...prev, [selectedEmployee.id]: { ...activeDraft, company_name: event.target.value } }))} className="mt-1 h-9 w-full border border-slate-300 px-2 text-sm" placeholder="Nom de l'entreprise" /></div>
                      <div className="rounded border border-slate-200 p-3"><p className="text-xs text-[#0A1A2F]/60">ESN partenaire</p><input value={activeDraft.esn_partenaire} onChange={(event) => setEmployeeDrafts((prev) => ({ ...prev, [selectedEmployee.id]: { ...activeDraft, esn_partenaire: event.target.value } }))} className="mt-1 h-9 w-full border border-slate-300 px-2 text-sm" placeholder="Nom de l'ESN partenaire" /></div>
                      <div className="rounded border border-slate-200 p-3"><p className="text-xs text-[#0A1A2F]/60">Statut</p><select value={activeDraft.employment_status} onChange={(event) => setEmployeeDrafts((prev) => ({ ...prev, [selectedEmployee.id]: { ...activeDraft, employment_status: event.target.value } }))} className="mt-1 h-9 w-full border border-slate-300 px-2 text-sm"><option value="active">active</option><option value="inactive">inactive</option><option value="exited">exited</option></select></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button onClick={() => void handleSaveEmployee()} disabled={savingEmployee}>{savingEmployee ? "Enregistrement..." : "Enregistrer"}</Button>
                      <Button type="button" variant="outline" onClick={() => openRequestDialog(selectedEmployee.id)}>
                        Demander un document
                      </Button>
                      {saveMessage && <p className="text-sm text-[#0A1A2F]/70">{saveMessage}</p>}
                    </div>
                    <div className="grid gap-4 xl:grid-cols-2">
                      <div className="rounded border border-slate-200 p-3"><p className="mb-2 font-medium">Demandes ({selectedEmployeeRequests.length})</p>{selectedEmployeeRequests.length ? selectedEmployeeRequests.map((request) => <p key={request.id} className="text-[#0A1A2F]/80">{request.typeLabel} - {request.status}</p>) : <p className="text-[#0A1A2F]/70">Aucune demande.</p>}</div>
                      <div className="rounded border border-slate-200 p-3"><p className="mb-2 font-medium">CV</p><p className="text-[#0A1A2F]/80">{cvsByUser[selectedEmployee.id]?.file_name ?? "Aucun CV"}</p></div>
                    </div>
                    <div className="rounded border border-slate-200 p-3">
                      <p className="mb-2 font-medium">Documents ({selectedEmployeeDocuments.length})</p>
                      {selectedEmployeeDocuments.length ? selectedEmployeeDocuments.map((document) => (
                        <div key={document.id} className="mb-2 flex items-center justify-between gap-2 text-[#0A1A2F]/80 last:mb-0">
                          <p>{document.typeLabel} - {document.fileName} ({document.status})</p>
                          <div className="flex items-center gap-2">
                            {document.fileName.toLowerCase().endsWith(".pdf") && (
                              <Button type="button" variant="outline" size="sm" onClick={() => void handleViewDocument(document)} disabled={!document.storagePath || viewingDocumentId === document.id || downloadingDocumentId === document.id}>
                                {viewingDocumentId === document.id ? "Ouverture..." : "Visualiser"}
                              </Button>
                            )}
                            <Button type="button" variant="outline" size="sm" onClick={() => void handleDownloadDocument(document)} disabled={!document.storagePath || downloadingDocumentId === document.id || viewingDocumentId === document.id}>
                              {downloadingDocumentId === document.id ? "Telechargement..." : "Telecharger"}
                            </Button>
                          </div>
                        </div>
                      )) : <p className="text-[#0A1A2F]/70">Aucun document.</p>}
                    </div>
                    <div className="rounded border border-slate-200 p-3"><p className="mb-2 font-medium">Historique ({selectedEmployeeEvents.length})</p>{selectedEmployeeEvents.length ? selectedEmployeeEvents.map((event) => <p key={event.id} className="text-[#0A1A2F]/80">{event.documentLabel} - {event.eventType}</p>) : <p className="text-[#0A1A2F]/70">Aucun evenement.</p>}</div>
                    <div className="rounded border border-slate-200 p-3"><p className="mb-2 font-medium">Candidatures ({selectedEmployeeApplications.length})</p>{selectedEmployeeApplications.length ? selectedEmployeeApplications.map((application) => <p key={application.id} className="text-[#0A1A2F]/80">{application.jobTitle} - {application.status}</p>) : <p className="text-[#0A1A2F]/70">Aucune candidature.</p>}</div>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-[#0A1A2F]/70"><tr><th className="px-3 py-2">Nom</th><th className="px-3 py-2">Entreprise</th><th className="px-3 py-2">ESN partenaire</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Statut</th><th className="px-3 py-2">Demandes ouvertes</th></tr></thead>
                      <tbody className="divide-y divide-slate-200 bg-white">{collaborateursRows.map((employee) => <tr key={employee.id}><td className="px-3 py-2"><Link href={`/dashboard/rh/collaborateurs/${employee.id}`} className="hover:underline">{employee.full_name ?? "-"}</Link></td><td className="px-3 py-2">{employee.company_name ?? "-"}</td><td className="px-3 py-2">{employee.esn_partenaire ?? "-"}</td><td className="px-3 py-2">{employee.email}</td><td className="px-3 py-2">{employee.employment_status ?? "-"}</td><td className="px-3 py-2">{requests.filter((request) => request.employeeId === employee.id && ["pending", "uploaded", "rejected", "expired"].includes(request.status)).length}</td></tr>)}</tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {currentSection === "documents" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle>Documents</CardTitle>
                <div className="flex items-center gap-2">
                  {["docs_salaries", "docs_mes_demandes"].includes(currentSubSection) && (
                    <Button type="button" variant="outline" size="sm" onClick={() => openRequestDialog()}>
                      Nouvelle demande
                    </Button>
                  )}
                  {currentSubSection === "docs_tous" && (
                    <Button type="button" variant="outline" size="sm" onClick={() => { setSaveMessage(null); setRhUploadDialogOpen(true); }}>
                      Deposer un document RH
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {currentSubSection === "docs_mes_demandes" ? (
                  requests.length ? (
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-[#0A1A2F]/70"><tr><th className="px-3 py-2">Salarie</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Periode</th><th className="px-3 py-2">Echeance</th><th className="px-3 py-2">Statut</th><th className="px-3 py-2">Note</th><th className="px-3 py-2">Action</th></tr></thead>
                        <tbody className="divide-y divide-slate-200 bg-white">{requests.map((request) => <tr key={request.id}><td className="px-3 py-2">{request.employeeName}</td><td className="px-3 py-2">{request.typeLabel}</td><td className="px-3 py-2">{formatMonth(request.periodMonth)}</td><td className="px-3 py-2">{formatDate(request.dueAt)}</td><td className="px-3 py-2"><Badge variant="outline">{request.status}</Badge></td><td className="px-3 py-2 text-[#0A1A2F]/70">{request.note ?? "-"}</td><td className="px-3 py-2">{["pending", "uploaded", "rejected", "expired"].includes(request.status) ? <Button type="button" variant="outline" size="sm" onClick={() => void handleCancelRequest(request)} disabled={cancellingRequestId === request.id}>{cancellingRequestId === request.id ? "Annulation..." : "Annuler"}</Button> : <span className="text-xs text-[#0A1A2F]/50">-</span>}</td></tr>)}</tbody>
                      </table>
                    </div>
                  ) : <p className="text-sm text-[#0A1A2F]/70">Aucune demande documentaire pour le moment.</p>
                ) : currentSubSection === "docs_salaries" ? (
                  salarieDocuments.length ? (
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-[#0A1A2F]/70"><tr><th className="px-3 py-2">Salarie</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Fichier</th><th className="px-3 py-2">Periode</th><th className="px-3 py-2">Statut</th><th className="px-3 py-2">Commentaire RH</th><th className="px-3 py-2">Action</th></tr></thead>
                        <tbody className="divide-y divide-slate-200 bg-white">{salarieDocuments.map((document) => <tr key={document.id}><td className="px-3 py-2">{document.employeeName}</td><td className="px-3 py-2">{document.typeLabel}</td><td className="px-3 py-2">{document.fileName}</td><td className="px-3 py-2">{formatMonth(document.periodMonth)}</td><td className="px-3 py-2"><Badge variant="outline">{document.status}</Badge></td><td className="px-3 py-2 text-[#0A1A2F]/70">{document.reviewComment ?? "-"}</td><td className="px-3 py-2"><div className="flex items-center gap-2">{document.fileName.toLowerCase().endsWith(".pdf") && <Button type="button" variant="outline" size="sm" onClick={() => void handleViewDocument(document)} disabled={!document.storagePath || viewingDocumentId === document.id || downloadingDocumentId === document.id}>{viewingDocumentId === document.id ? "Ouverture..." : "Visualiser"}</Button>}<Button type="button" variant="outline" size="sm" onClick={() => void handleDownloadDocument(document)} disabled={!document.storagePath || downloadingDocumentId === document.id || viewingDocumentId === document.id}>{downloadingDocumentId === document.id ? "Telechargement..." : "Telecharger"}</Button>{document.status === "validated" && <Button type="button" variant="outline" size="sm" onClick={() => void handleReviewDocument(document, "pending")} disabled={reviewingDocumentId === document.id}>{reviewingDocumentId === document.id ? "Traitement..." : "Remettre en attente"}</Button>}</div></td></tr>)}</tbody>
                      </table>
                    </div>
                  ) : <p className="text-sm text-[#0A1A2F]/70">Aucun document salarie pour le moment.</p>
                ) : currentSubSection === "docs_a_valider" ? (
                  pendingDocuments.length ? (
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-[#0A1A2F]/70"><tr><th className="px-3 py-2">Type</th><th className="px-3 py-2">Fichier</th><th className="px-3 py-2">Salarie</th><th className="px-3 py-2">Periode</th><th className="px-3 py-2">Commentaire RH</th><th className="px-3 py-2">Action</th></tr></thead>
                        <tbody className="divide-y divide-slate-200 bg-white">{pendingDocuments.map((document) => <tr key={document.id}><td className="px-3 py-2">{document.typeLabel}</td><td className="px-3 py-2">{document.fileName}</td><td className="px-3 py-2">{document.employeeName}</td><td className="px-3 py-2">{formatMonth(document.periodMonth)}</td><td className="px-3 py-2"><input value={reviewDrafts[document.id] ?? document.reviewComment ?? ""} onChange={(event) => setReviewDrafts((prev) => ({ ...prev, [document.id]: event.target.value }))} placeholder="Commentaire de validation ou de refus" className="h-9 w-full min-w-[240px] rounded-md border border-slate-300 px-3 text-sm" /></td><td className="px-3 py-2"><div className="flex items-center gap-2">{document.fileName.toLowerCase().endsWith(".pdf") && <Button type="button" variant="outline" size="sm" onClick={() => void handleViewDocument(document)} disabled={!document.storagePath || viewingDocumentId === document.id || downloadingDocumentId === document.id}>{viewingDocumentId === document.id ? "Ouverture..." : "Visualiser"}</Button>}<Button type="button" variant="outline" size="sm" onClick={() => void handleDownloadDocument(document)} disabled={!document.storagePath || downloadingDocumentId === document.id || viewingDocumentId === document.id}>{downloadingDocumentId === document.id ? "Telechargement..." : "Telecharger"}</Button><Button type="button" size="sm" onClick={() => void handleReviewDocument(document, "validated")} disabled={reviewingDocumentId === document.id}>{reviewingDocumentId === document.id ? "Traitement..." : "Valider"}</Button><Button type="button" variant="destructive" size="sm" onClick={() => void handleReviewDocument(document, "rejected")} disabled={reviewingDocumentId === document.id}>{reviewingDocumentId === document.id ? "Traitement..." : "Refuser"}</Button></div></td></tr>)}</tbody>
                      </table>
                    </div>
                  ) : <p className="text-sm text-[#0A1A2F]/70">Aucun document en attente de validation.</p>
                ) : (
                  rhDocuments.length ? (
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-[#0A1A2F]/70"><tr><th className="px-3 py-2">Type</th><th className="px-3 py-2">Fichier</th><th className="px-3 py-2">Collaborateur</th><th className="px-3 py-2">Periode</th><th className="px-3 py-2">Statut</th><th className="px-3 py-2">Commentaire RH</th><th className="px-3 py-2">Action</th></tr></thead>
                        <tbody className="divide-y divide-slate-200 bg-white">{rhDocuments.map((document) => <tr key={document.id}><td className="px-3 py-2">{document.typeLabel}</td><td className="px-3 py-2">{document.fileName}</td><td className="px-3 py-2">{document.employeeName}</td><td className="px-3 py-2">{formatMonth(document.periodMonth)}</td><td className="px-3 py-2"><Badge variant="outline">{document.status}</Badge></td><td className="px-3 py-2 text-[#0A1A2F]/70">{document.reviewComment ?? "-"}</td><td className="px-3 py-2"><div className="flex items-center gap-2">{document.fileName.toLowerCase().endsWith(".pdf") && <Button type="button" variant="outline" size="sm" onClick={() => void handleViewDocument(document)} disabled={!document.storagePath || viewingDocumentId === document.id || downloadingDocumentId === document.id}>{viewingDocumentId === document.id ? "Ouverture..." : "Visualiser"}</Button>}<Button type="button" variant="outline" size="sm" onClick={() => void handleDownloadDocument(document)} disabled={!document.storagePath || downloadingDocumentId === document.id || viewingDocumentId === document.id}>{downloadingDocumentId === document.id ? "Telechargement..." : "Telecharger"}</Button><Button type="button" variant="destructive" size="sm" onClick={() => void handleDeleteRhDocument(document)} disabled={deletingRhDocumentId === document.id}>{deletingRhDocumentId === document.id ? "Suppression..." : "Supprimer"}</Button></div></td></tr>)}</tbody>
                      </table>
                    </div>
                  ) : <p className="text-sm text-[#0A1A2F]/70">Aucun document RH pour le moment.</p>
                )}
              </CardContent>
            </Card>
          )}

          {currentSection === "offres" && (
            <Card>
              <CardHeader><CardTitle>Offres</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-[#0A1A2F]/70"><tr><th className="px-3 py-2">Titre</th><th className="px-3 py-2">Statut</th><th className="px-3 py-2">Lieu</th></tr></thead>
                    <tbody className="divide-y divide-slate-200 bg-white">{(currentSubSection === "offres_candidatures" ? [] : jobOffers).map((offer) => <tr key={offer.id}><td className="px-3 py-2">{offer.title}</td><td className="px-3 py-2">{offer.status}</td><td className="px-3 py-2">{offer.location ?? "-"}</td></tr>)}</tbody>
                  </table>
                </div>
                {currentSubSection === "offres_candidatures" && (
                  <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-[#0A1A2F]/70"><tr><th className="px-3 py-2">Offre</th><th className="px-3 py-2">Candidat</th><th className="px-3 py-2">Statut</th></tr></thead>
                      <tbody className="divide-y divide-slate-200 bg-white">{applications.map((application) => <tr key={application.id}><td className="px-3 py-2">{application.jobTitle}</td><td className="px-3 py-2">{application.candidateName}</td><td className="px-3 py-2">{application.status}</td></tr>)}</tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {currentSection === "parametres" && (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <Card>
                <CardHeader><CardTitle>Session</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between"><span>Email</span><span>{profile?.email ?? "-"}</span></div>
                  <div className="flex items-center justify-between"><span>Nom</span><span>{profile?.full_name ?? "-"}</span></div>
                  <div className="flex items-center justify-between"><span>User ID</span><span className="font-mono text-xs">{user?.id ?? "N/A"}</span></div>
                  <div className="flex items-center justify-between"><span>Expire</span><span>{session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : "-"}</span></div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <div>
                    <CardTitle>Mot de passe</CardTitle>
                    <p className="mt-1 text-sm text-[#0A1A2F]/70">
                      Modifie le mot de passe utilise pour te connecter.
                    </p>
                  </div>
                  <Button type="button" size="sm" onClick={() => void handlePasswordUpdate()} disabled={passwordSaving}>
                    {passwordSaving ? "Enregistrement..." : "Mettre a jour"}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Nouveau mot de passe</label>
                    <input type="password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))} className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" autoComplete="new-password" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Confirmer le mot de passe</label>
                    <input type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))} className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" autoComplete="new-password" />
                  </div>
                  {passwordMessage && (
                    <p className="text-sm text-[#0A1A2F]/70">{passwordMessage}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          </div>
          </div>
        </main>
      </div>

      <Dialog
        open={requestDialogOpen}
        onOpenChange={(open) => {
          setRequestDialogOpen(open);
          if (!open) resetRequestDialog();
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Nouvelle demande documentaire</DialogTitle>
            <DialogDescription>
              Cree une demande pour qu&apos;un collaborateur depose un document.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Collaborateur</label>
                <select value={requestEmployeeId} onChange={(event) => setRequestEmployeeId(event.target.value)} className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm">
                  <option value="">Choisir un collaborateur</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>{employee.full_name ?? employee.email}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Type de document</label>
                <select value={requestDocumentTypeId} onChange={(event) => setRequestDocumentTypeId(event.target.value)} className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm">
                  <option value="">Choisir un type</option>
                  {salarieUploadableTypes.map((documentType) => (
                    <option key={documentType.id} value={documentType.id}>{documentType.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Echeance</label>
                <input type="date" value={requestDueAt} onChange={(event) => setRequestDueAt(event.target.value)} className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Periode {selectedRequestType?.requiresPeriod ? "(obligatoire)" : "(optionnelle)"}
                </label>
                <input type="month" value={requestPeriodMonth} onChange={(event) => setRequestPeriodMonth(event.target.value)} className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Note</label>
              <textarea value={requestNote} onChange={(event) => setRequestNote(event.target.value)} rows={4} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Message ou precision pour le collaborateur" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setRequestDialogOpen(false); resetRequestDialog(); }}>
              Annuler
            </Button>
            <Button type="button" onClick={() => void handleCreateRequest()} disabled={creatingRequest}>
              {creatingRequest ? "Creation..." : "Creer la demande"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rhUploadDialogOpen}
        onOpenChange={(open) => {
          setRhUploadDialogOpen(open);
          if (!open) resetRhUploadDialog();
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Deposer un document RH</DialogTitle>
            <DialogDescription>
              Le document sera enregistre comme depose par le RH et le collaborateur est optionnel.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Collaborateur (optionnel)</label>
                <select value={rhUploadEmployeeId} onChange={(event) => setRhUploadEmployeeId(event.target.value)} className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm">
                  <option value="">Aucun collaborateur</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>{employee.full_name ?? employee.email}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Type de document</label>
                <select value={rhUploadDocumentTypeId} onChange={(event) => setRhUploadDocumentTypeId(event.target.value)} className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm">
                  <option value="">Choisir un type</option>
                  {rhUploadableTypes.map((documentType) => (
                    <option key={documentType.id} value={documentType.id}>{documentType.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Periode {selectedRhUploadType?.requiresPeriod ? "(obligatoire)" : "(optionnelle)"}
                </label>
                <input type="month" value={rhUploadPeriodMonth} onChange={(event) => setRhUploadPeriodMonth(event.target.value)} className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Fichier</label>
                <input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={(event) => setRhUploadFile(event.target.files?.[0] ?? null)} className="block w-full text-xs text-[#0A1A2F]/70 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-medium" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setRhUploadDialogOpen(false); resetRhUploadDialog(); }}>
              Annuler
            </Button>
            <Button type="button" onClick={() => void handleRhUpload()} disabled={uploadingRhDocument}>
              {uploadingRhDocument ? "Depot..." : "Deposer le document RH"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm text-[#0A1A2F] shadow">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement des donnees...
          </div>
        </div>
      )}
    </div>
  );
}
