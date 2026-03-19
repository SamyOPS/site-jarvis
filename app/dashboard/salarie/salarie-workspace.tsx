"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient, type User } from "@supabase/supabase-js";
import { AlertCircle, Loader2, LogOut } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { buildEmployeeDocumentPath } from "@/lib/document-storage";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

type ProfileRow = { id: string; email: string; full_name: string | null; role: string | null };
type RequestStatus = "pending" | "uploaded" | "validated" | "rejected" | "expired" | "cancelled";
type DocumentStatus = "pending" | "validated" | "rejected";
type DocumentTypeRow = {
  id: string;
  label: string;
  requiresPeriod: boolean;
  allowedUploaderRoles: string[];
};
type RequestRow = { id: string; documentTypeId: string; status: RequestStatus; dueAt: string | null; periodMonth: string | null; note: string | null; typeLabel: string };
type DocumentRow = {
  id: string;
  documentTypeId: string;
  status: DocumentStatus;
  fileName: string;
  createdAt: string | null;
  periodMonth: string | null;
  reviewComment: string | null;
  typeLabel: string;
  storageBucket: string;
  storagePath: string;
};

const normalizeJoinOne = <T,>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
};

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

export default function SalarieWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [applicationsCount, setApplicationsCount] = useState(0);
  const [offersCount, setOffersCount] = useState(0);
  const [hasCv, setHasCv] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingRequestId, setUploadingRequestId] = useState<string | null>(null);
  const [downloadingDocumentId, setDownloadingDocumentId] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [uploadDocumentTypeId, setUploadDocumentTypeId] = useState("");
  const [uploadPeriodMonth, setUploadPeriodMonth] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingDocumentId, setEditingDocumentId] = useState("");
  const [editDocumentTypeId, setEditDocumentTypeId] = useState("");
  const [editPeriodMonth, setEditPeriodMonth] = useState("");
  const [editFileName, setEditFileName] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [savingDocumentId, setSavingDocumentId] = useState<string | null>(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadDashboardData = useCallback(async (profileId: string) => {
    if (!supabase) return;

    const [documentTypesRes, requestsRes, documentsRes, applicationsRes, offersRes, cvRes] = await Promise.all([
      supabase
        .from("document_types")
        .select("id,label,requires_period,allowed_uploader_roles")
        .eq("active", true)
        .order("label", { ascending: true }),
      supabase
        .from("document_requests")
        .select("id,status,due_at,period_month,note,document_type:document_types(id,label)")
        .eq("employee_id", profileId)
        .order("created_at", { ascending: false }),
      supabase
        .from("employee_documents")
        .select("id,status,file_name,created_at,period_month,review_comment,storage_bucket,storage_path,document_type:document_types(id,label)")
        .eq("employee_id", profileId)
        .order("created_at", { ascending: false }),
      supabase.from("applications").select("id", { count: "exact", head: true }).eq("candidate_id", profileId),
      supabase.from("job_offers").select("id", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("profile_cvs").select("user_id").eq("user_id", profileId).maybeSingle(),
    ]);

    if (documentTypesRes.error || requestsRes.error || documentsRes.error || applicationsRes.error || offersRes.error || cvRes.error) {
      throw new Error(documentTypesRes.error?.message ?? requestsRes.error?.message ?? documentsRes.error?.message ?? applicationsRes.error?.message ?? offersRes.error?.message ?? cvRes.error?.message ?? "Erreur de chargement");
    }

    setDocumentTypes(
      ((documentTypesRes.data ?? []) as {
        id: string;
        label: string;
        requires_period: boolean | null;
        allowed_uploader_roles: string[] | null;
      }[])
        .map((row) => ({
          id: row.id,
          label: row.label,
          requiresPeriod: Boolean(row.requires_period),
          allowedUploaderRoles: row.allowed_uploader_roles ?? [],
        }))
        .filter((row) => row.allowedUploaderRoles.length === 0 || row.allowedUploaderRoles.includes("salarie")),
    );

    setRequests((requestsRes.data ?? []).map((row: {
      id: string;
      status: RequestStatus;
      due_at: string | null;
      period_month: string | null;
      note: string | null;
      document_type: { id: string; label: string } | { id: string; label: string }[] | null;
    }) => {
      const documentType = normalizeJoinOne(row.document_type);
      return {
        id: row.id,
        documentTypeId: documentType?.id ?? "",
        status: row.status,
        dueAt: row.due_at,
        periodMonth: row.period_month,
        note: row.note,
        typeLabel: documentType?.label ?? "Document",
      } satisfies RequestRow;
    }));

    setDocuments((documentsRes.data ?? []).map((row: {
      id: string;
      status: DocumentStatus;
      file_name: string;
      created_at: string | null;
      period_month: string | null;
      review_comment: string | null;
      storage_bucket: string | null;
      storage_path: string | null;
      document_type: { id: string; label: string } | { id: string; label: string }[] | null;
    }) => {
      const documentType = normalizeJoinOne(row.document_type);
      return {
        id: row.id,
        documentTypeId: documentType?.id ?? "",
        status: row.status,
        fileName: row.file_name,
        createdAt: row.created_at,
        periodMonth: row.period_month,
        reviewComment: row.review_comment,
        typeLabel: documentType?.label ?? "Document",
        storageBucket: row.storage_bucket ?? "employee-documents",
        storagePath: row.storage_path ?? "",
      } satisfies DocumentRow;
    }));

    setApplicationsCount(applicationsRes.count ?? 0);
    setOffersCount(offersRes.count ?? 0);
    setHasCv(Boolean((cvRes.data as { user_id?: string } | null)?.user_id));
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
      setUser(sessionData.session.user);
      const { data: profileData, error: profileError } = await supabase.from("profiles").select("id,email,full_name,role").eq("id", sessionData.session.user.id).single();
      if (profileError || !profileData || profileData.role !== "salarie") {
        setLoading(false);
        router.push("/dashboard");
        return;
      }
      setProfile(profileData);
      try {
        await loadDashboardData(profileData.id);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [loadDashboardData, router]);

  const uploadDocument = useCallback(async (args: {
    file: File;
    documentTypeId: string;
    periodMonth: string | null;
    linkedRequestId?: string;
  }) => {
    if (!supabase || !profile || !user) return;

    const storageBucket = "employee-documents";
    const storagePath = buildEmployeeDocumentPath({
      employeeId: profile.id,
      documentTypeId: args.documentTypeId,
      periodMonth: args.periodMonth,
      fileName: args.file.name,
    });

    const { error: uploadError } = await supabase.storage.from(storageBucket).upload(storagePath, args.file, { upsert: false });
    if (uploadError) {
      setActionMessage(uploadError.message);
      return;
    }

    const { data: insertedDocument, error: insertError } = await supabase
      .from("employee_documents")
      .insert({
        employee_id: profile.id,
        uploaded_by: user.id,
        uploader_role: "salarie",
        document_type_id: args.documentTypeId,
        period_month: args.periodMonth,
        document_date: new Date().toISOString().slice(0, 10),
        status: "pending",
        storage_bucket: storageBucket,
        storage_path: storagePath,
        file_name: args.file.name,
        mime_type: args.file.type || null,
        size_bytes: args.file.size,
      })
      .select("id")
      .single();

    if (insertError || !insertedDocument) {
      await supabase.storage.from(storageBucket).remove([storagePath]);
      setActionMessage(insertError?.message ?? "Insertion du document impossible.");
      return;
    }

    const reviewTimestamp = new Date().toISOString();
    const requestPromise = args.linkedRequestId
      ? supabase.from("document_requests").update({ status: "uploaded", updated_at: reviewTimestamp }).eq("id", args.linkedRequestId)
      : Promise.resolve({ error: null });

    const [{ error: requestError }, { error: eventError }] = await Promise.all([
      requestPromise,
      supabase.from("document_events").insert({
        actor_id: user.id,
        event_type: "uploaded",
        payload: {
          request_id: args.linkedRequestId ?? null,
          file_name: args.file.name,
          period_month: args.periodMonth,
          uploaded_from: args.linkedRequestId ? "request" : "manual",
        },
        document_id: insertedDocument.id,
      }),
    ]);

    if (requestError || eventError) {
      setActionMessage(requestError?.message ?? eventError?.message ?? "Depot effectue, mais le suivi n'a pas ete mis a jour completement.");
      await loadDashboardData(profile.id);
      return;
    }

    setActionMessage("Document depose avec succes.");
    await loadDashboardData(profile.id);
  }, [loadDashboardData, profile, user]);

  const resetUploadDialog = useCallback(() => {
    setSelectedRequestId("");
    setUploadDocumentTypeId("");
    setUploadPeriodMonth("");
    setUploadFile(null);
  }, []);

  const resetEditDialog = useCallback(() => {
    setEditingDocumentId("");
    setEditDocumentTypeId("");
    setEditPeriodMonth("");
    setEditFileName("");
    setEditFile(null);
  }, []);

  const findMatchingRequest = useCallback((documentTypeId: string, periodMonth: string | null) => {
    return (
      requests.find((request) => request.documentTypeId === documentTypeId && (request.periodMonth ?? "") === (periodMonth ?? "")) ??
      requests.find((request) => request.documentTypeId === documentTypeId)
    );
  }, [requests]);

  const openUploadDialog = useCallback((requestId?: string) => {
    const request = requestId ? requests.find((item) => item.id === requestId) ?? null : null;
    setSelectedRequestId(request?.id ?? "");
    setUploadDocumentTypeId(request?.documentTypeId ?? "");
    setUploadPeriodMonth(request?.periodMonth ? request.periodMonth.slice(0, 7) : "");
    setUploadFile(null);
    setActionMessage(null);
    setUploadDialogOpen(true);
  }, [requests]);

  const openEditDialog = useCallback((document: DocumentRow) => {
    if (document.status === "validated") {
      setActionMessage("Ce document est valide par le RH et ne peut plus etre modifie.");
      return;
    }
    setEditingDocumentId(document.id);
    setEditDocumentTypeId(document.documentTypeId);
    setEditPeriodMonth(document.periodMonth ? document.periodMonth.slice(0, 7) : "");
    setEditFileName(document.fileName);
    setEditFile(null);
    setActionMessage(null);
    setEditDialogOpen(true);
  }, []);

  const handleRequestSelection = useCallback((requestId: string) => {
    const request = requests.find((item) => item.id === requestId) ?? null;
    setSelectedRequestId(requestId);
    if (request) {
      setUploadDocumentTypeId(request.documentTypeId);
      setUploadPeriodMonth(request.periodMonth ? request.periodMonth.slice(0, 7) : "");
      return;
    }
    setUploadDocumentTypeId("");
    setUploadPeriodMonth("");
  }, [requests]);

  const handleUploadSubmit = useCallback(async () => {
    if (!uploadDocumentTypeId || !uploadFile) {
      setActionMessage("Choisis un type de document et un fichier avant de deposer.");
      return;
    }

    const linkedRequest = requests.find((request) => request.id === selectedRequestId) ?? null;
    const selectedType = documentTypes.find((type) => type.id === uploadDocumentTypeId) ?? null;
    if (selectedType?.requiresPeriod && !uploadPeriodMonth) {
      setActionMessage("Ce type de document demande une periode.");
      return;
    }

    const normalizedPeriodMonth = uploadPeriodMonth ? `${uploadPeriodMonth}-01` : null;
    setUploadingRequestId(linkedRequest?.id ?? "manual");
    setActionMessage(null);
    await uploadDocument({
      file: uploadFile,
      documentTypeId: uploadDocumentTypeId,
      periodMonth: normalizedPeriodMonth,
      linkedRequestId: linkedRequest?.id,
    });
    setUploadingRequestId(null);
    setUploadDialogOpen(false);
    resetUploadDialog();
  }, [documentTypes, requests, resetUploadDialog, selectedRequestId, uploadDocument, uploadDocumentTypeId, uploadFile, uploadPeriodMonth]);

  const handleUpdateDocument = useCallback(async () => {
    if (!supabase || !profile || !user || !editingDocumentId) return;

    const document = documents.find((item) => item.id === editingDocumentId) ?? null;
    if (!document) return;
    if (document.status === "validated") {
      setActionMessage("Ce document est valide par le RH et ne peut plus etre modifie.");
      return;
    }
    if (!editDocumentTypeId || !editFileName.trim()) {
      setActionMessage("Le type et le nom du document sont obligatoires.");
      return;
    }

    const selectedType = documentTypes.find((type) => type.id === editDocumentTypeId) ?? null;
    if (selectedType?.requiresPeriod && !editPeriodMonth) {
      setActionMessage("Ce type de document demande une periode.");
      return;
    }

    setSavingDocumentId(document.id);
    setActionMessage(null);

    const normalizedPeriodMonth = editPeriodMonth ? `${editPeriodMonth}-01` : null;
    const nextUpdatedAt = new Date().toISOString();
    let nextStoragePath = document.storagePath;
    let nextStorageBucket = document.storageBucket;
    const nextFileName = editFileName.trim();
    let uploadedReplacement = false;

    if (editFile) {
      nextStoragePath = buildEmployeeDocumentPath({
        employeeId: profile.id,
        documentTypeId: editDocumentTypeId,
        periodMonth: normalizedPeriodMonth,
        fileName: editFile.name,
      });
      const { error: uploadError } = await supabase.storage.from(document.storageBucket).upload(nextStoragePath, editFile, { upsert: false });
      if (uploadError) {
        setActionMessage(uploadError.message);
        setSavingDocumentId(null);
        return;
      }
      uploadedReplacement = true;
      nextStorageBucket = document.storageBucket;
    }

    const { error: updateError } = await supabase
      .from("employee_documents")
      .update({
        document_type_id: editDocumentTypeId,
        period_month: normalizedPeriodMonth,
        file_name: nextFileName,
        mime_type: editFile ? (editFile.type || null) : undefined,
        size_bytes: editFile ? editFile.size : undefined,
        storage_bucket: nextStorageBucket,
        storage_path: nextStoragePath,
        status: "pending",
        review_comment: null,
        reviewed_by: null,
        reviewed_at: null,
        updated_at: nextUpdatedAt,
      })
      .eq("id", document.id);

    if (updateError) {
      if (uploadedReplacement) {
        await supabase.storage.from(document.storageBucket).remove([nextStoragePath]);
      }
      setActionMessage(updateError.message);
      setSavingDocumentId(null);
      return;
    }

    const previousMatchingRequest = findMatchingRequest(document.documentTypeId, document.periodMonth);
    const nextMatchingRequest = findMatchingRequest(editDocumentTypeId, normalizedPeriodMonth);

    const requestUpdates: Promise<{ error: { message?: string } | null }>[] = [];
    if (
      previousMatchingRequest &&
      previousMatchingRequest.id !== nextMatchingRequest?.id &&
      ["uploaded", "rejected", "expired"].includes(previousMatchingRequest.status)
    ) {
      requestUpdates.push(
        Promise.resolve(
          supabase
            .from("document_requests")
            .update({ status: "pending", updated_at: nextUpdatedAt })
            .eq("id", previousMatchingRequest.id),
        ),
      );
    }
    if (nextMatchingRequest) {
      requestUpdates.push(
        Promise.resolve(
          supabase
            .from("document_requests")
            .update({ status: "uploaded", updated_at: nextUpdatedAt })
            .eq("id", nextMatchingRequest.id),
        ),
      );
    }

    const eventPromise = supabase.from("document_events").insert({
      actor_id: user.id,
      document_id: document.id,
      event_type: "updated",
      payload: {
        previous_type_label: document.typeLabel,
        next_document_type_id: editDocumentTypeId,
        previous_period_month: document.periodMonth,
        next_period_month: normalizedPeriodMonth,
        replaced_file: uploadedReplacement,
      },
    });

    const [requestResults, { error: eventError }] = await Promise.all([Promise.all(requestUpdates), eventPromise]);
    const requestError = requestResults.find((result) => result.error)?.error;

    if (requestError || eventError) {
      setActionMessage(requestError?.message ?? eventError?.message ?? "Le document a ete modifie, mais le suivi n'est pas complet.");
    } else {
      setActionMessage("Document mis a jour.");
    }

    if (uploadedReplacement && document.storagePath && document.storagePath !== nextStoragePath) {
      await supabase.storage.from(document.storageBucket).remove([document.storagePath]);
    }

    setSavingDocumentId(null);
    setEditDialogOpen(false);
    resetEditDialog();
    await loadDashboardData(profile.id);
  }, [documents, documentTypes, editDocumentTypeId, editFile, editFileName, editPeriodMonth, editingDocumentId, findMatchingRequest, loadDashboardData, profile, resetEditDialog, supabase, user]);

  const handleDeleteDocument = useCallback(async (document: DocumentRow) => {
    if (!supabase || !profile) return;
    if (document.status === "validated") {
      setActionMessage("Ce document est valide par le RH et ne peut plus etre supprime.");
      return;
    }
    if (!window.confirm(`Supprimer le document "${document.fileName}" ?`)) {
      return;
    }

    setDeletingDocumentId(document.id);
    setActionMessage(null);

    const matchingRequest = findMatchingRequest(document.documentTypeId, document.periodMonth);
    const { error: eventsDeleteError } = await supabase.from("document_events").delete().eq("document_id", document.id);
    if (eventsDeleteError) {
      setActionMessage(eventsDeleteError.message);
      setDeletingDocumentId(null);
      return;
    }

    const { error: documentDeleteError } = await supabase.from("employee_documents").delete().eq("id", document.id);
    if (documentDeleteError) {
      setActionMessage(documentDeleteError.message);
      setDeletingDocumentId(null);
      return;
    }

    if (matchingRequest && matchingRequest.status === "uploaded") {
      const { error: requestError } = await supabase
        .from("document_requests")
        .update({ status: "pending", updated_at: new Date().toISOString() })
        .eq("id", matchingRequest.id);

      if (requestError) {
        setActionMessage(requestError.message);
        setDeletingDocumentId(null);
        await loadDashboardData(profile.id);
        return;
      }
    }

    if (document.storagePath) {
      await supabase.storage.from(document.storageBucket).remove([document.storagePath]);
    }

    setActionMessage("Document supprime.");
    setDeletingDocumentId(null);
    await loadDashboardData(profile.id);
  }, [findMatchingRequest, loadDashboardData, profile, supabase]);

  const handleDownloadDocument = useCallback(async (document: DocumentRow) => {
    if (!supabase || !document.storagePath) return;
    setDownloadingDocumentId(document.id);
    setActionMessage(null);
    const { data, error: downloadError } = await supabase.storage.from(document.storageBucket).createSignedUrl(document.storagePath, 60);
    if (downloadError || !data?.signedUrl) {
      setActionMessage(downloadError?.message ?? "Impossible de generer le lien de telechargement.");
      setDownloadingDocumentId(null);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    setDownloadingDocumentId(null);
  }, []);

  const currentSection =
    pathname.startsWith("/dashboard/salarie/documents")
      ? "documents"
      : pathname.startsWith("/dashboard/salarie/parametres")
        ? "parametres"
        : pathname.startsWith("/dashboard/salarie/offres") ||
            pathname.startsWith("/dashboard/salarie/candidatures") ||
            pathname.startsWith("/dashboard/salarie/cv")
          ? "offres"
          : "overview";
  const currentSubSection =
    pathname.startsWith("/dashboard/salarie/documents/a-deposer")
      ? "docs_a_deposer"
      : pathname.startsWith("/dashboard/salarie/documents")
        ? "docs_tous"
        : pathname.startsWith("/dashboard/salarie/candidatures")
          ? "candidatures"
          : pathname.startsWith("/dashboard/salarie/cv")
            ? "cvs"
            : "offres_toutes";
  const pendingRequests = useMemo(() => requests.filter((request) => ["pending", "rejected", "expired"].includes(request.status)), [requests]);
  const selectedUploadType = useMemo(
    () => documentTypes.find((documentType) => documentType.id === uploadDocumentTypeId) ?? null,
    [documentTypes, uploadDocumentTypeId],
  );
  const selectedEditType = useMemo(
    () => documentTypes.find((documentType) => documentType.id === editDocumentTypeId) ?? null,
    [documentTypes, editDocumentTypeId],
  );
  const selectedUploadRequest = useMemo(
    () => requests.find((request) => request.id === selectedRequestId) ?? null,
    [requests, selectedRequestId],
  );
  const displayName = useMemo(() => {
    const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string; display_name?: string };
    return meta.full_name ?? meta.name ?? meta.display_name ?? profile?.full_name ?? profile?.email ?? "utilisateur";
  }, [profile?.email, profile?.full_name, user?.user_metadata]);

  return (
    <div className="min-h-screen bg-white text-[#0A1A2F]">
      <div className="relative">
        <aside className="hidden border-r border-slate-200 bg-slate-50 lg:fixed lg:inset-y-0 lg:left-0 lg:block lg:w-[300px]">
          <div className="flex h-full flex-col gap-4 p-4">
            <div><p className="text-sm font-medium">Bonjour, {displayName}</p><p className="text-xs text-[#0A1A2F]/60">Espace documentaire</p></div>
            <nav className="space-y-1 text-sm">
              <Link href="/dashboard/salarie" className={`block px-1 py-2 hover:underline ${currentSection === "overview" ? "font-semibold" : ""}`}>Vue d&apos;ensemble</Link>
              <Link href="/dashboard/salarie/documents" className={`block px-1 py-2 hover:underline ${currentSection === "documents" ? "font-semibold" : ""}`}>Mes documents</Link>
              {currentSection === "documents" && (
                <div className="ml-3 space-y-1 border-l border-slate-200 pl-3 text-xs">
                  <Link href="/dashboard/salarie/documents/a-deposer" className={`block py-1 ${currentSubSection === "docs_a_deposer" ? "font-semibold" : ""}`}>A deposer</Link>
                  <Link href="/dashboard/salarie/documents" className={`block py-1 ${currentSubSection === "docs_tous" ? "font-semibold" : ""}`}>Tous mes documents</Link>
                </div>
              )}
              <Link href="/dashboard/salarie/offres" className={`block px-1 py-2 hover:underline ${currentSection === "offres" ? "font-semibold" : ""}`}>Offres d&apos;emploi</Link>
              {currentSection === "offres" && (
                <div className="ml-3 space-y-1 border-l border-slate-200 pl-3 text-xs">
                  <Link href="/dashboard/salarie/offres" className={`block py-1 ${currentSubSection === "offres_toutes" ? "font-semibold" : ""}`}>Toutes les offres</Link>
                  <Link href="/dashboard/salarie/candidatures" className={`block py-1 ${currentSubSection === "candidatures" ? "font-semibold" : ""}`}>Mes candidatures</Link>
                  <Link href="/dashboard/salarie/cv" className={`block py-1 ${currentSubSection === "cvs" ? "font-semibold" : ""}`}>Mes CVs</Link>
                </div>
              )}
              <Link href="/dashboard/salarie/parametres" className={`block px-1 py-2 hover:underline ${currentSection === "parametres" ? "font-semibold" : ""}`}>Parametres</Link>
            </nav>
            <button type="button" className="mt-auto flex items-center px-1 py-2 text-sm hover:underline" onClick={async () => { if (!supabase) return; await supabase.auth.signOut(); router.push("/auth"); }}>
              <LogOut className="mr-2 h-4 w-4" />
              Deconnexion
            </button>
          </div>
        </aside>

        <main className="space-y-4 px-4 py-6 lg:ml-[300px] lg:px-8 lg:py-8">
          {(!supabase || error) && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div><p className="font-semibold">Erreur</p><p>{error ?? "Configuration Supabase manquante."}</p></div>
            </div>
          )}

          {actionMessage && !error && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-[#0A1A2F]">
              {actionMessage}
            </div>
          )}

          {currentSection === "overview" && (
            <>
              <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Card><CardContent className="pt-6"><p className="text-sm text-[#0A1A2F]/70">Demandes ouvertes</p><p className="mt-1 text-2xl font-semibold">{pendingRequests.length}</p></CardContent></Card>
                <Card><CardContent className="pt-6"><p className="text-sm text-[#0A1A2F]/70">Documents deposes</p><p className="mt-1 text-2xl font-semibold">{documents.length}</p></CardContent></Card>
                <Card><CardContent className="pt-6"><p className="text-sm text-[#0A1A2F]/70">Documents valides</p><p className="mt-1 text-2xl font-semibold">{documents.filter((document) => document.status === "validated").length}</p></CardContent></Card>
              </section>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <CardTitle>Documents a deposer</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={() => openUploadDialog()}>
                    Deposer un document
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingRequests.length ? pendingRequests.map((request) => (
                    <div key={request.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">{request.typeLabel}</p>
                          <p className="text-sm text-[#0A1A2F]/70">Echeance: {formatDate(request.dueAt)} | Periode: {formatMonth(request.periodMonth)}</p>
                        </div>
                        <Badge variant="outline">{request.status}</Badge>
                      </div>
                      {request.note && <p className="mt-2 text-sm text-[#0A1A2F]/75">{request.note}</p>}
                    </div>
                  )) : <p className="text-sm text-[#0A1A2F]/70">Aucune demande ouverte.</p>}
                </CardContent>
              </Card>
            </>
          )}

          {currentSection === "documents" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle>{currentSubSection === "docs_a_deposer" ? "Documents a deposer" : "Mes documents"}</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={() => openUploadDialog()}>
                  Deposer un document
                </Button>
              </CardHeader>
              <CardContent>
                {currentSubSection === "docs_a_deposer" ? (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">Demandes RH ouvertes</p>
                        <Badge variant="outline">{pendingRequests.length}</Badge>
                      </div>
                      {pendingRequests.length ? pendingRequests.map((request) => (
                        <div key={request.id} className="rounded-lg border border-slate-200 p-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-1">
                              <p className="font-medium">{request.typeLabel}</p>
                              <p className="text-sm text-[#0A1A2F]/70">Periode: {formatMonth(request.periodMonth)}</p>
                              <p className="text-sm text-[#0A1A2F]/70">Echeance: {formatDate(request.dueAt)}</p>
                              <p className="text-sm text-[#0A1A2F]/70">Note: {request.note ?? "-"}</p>
                            </div>
                            <Badge variant="outline">{request.status}</Badge>
                          </div>
                          <div className="mt-4">
                            <Button type="button" variant="outline" size="sm" onClick={() => openUploadDialog(request.id)}>
                              Utiliser cette demande
                            </Button>
                          </div>
                        </div>
                      )) : <p className="text-sm text-[#0A1A2F]/70">Aucune demande RH ouverte pour le moment.</p>}
                    </div>
                  </div>
                ) : documents.length ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-[#0A1A2F]/70">
                        <tr><th className="px-3 py-2">Type</th><th className="px-3 py-2">Fichier</th><th className="px-3 py-2">Periode</th><th className="px-3 py-2">Depose le</th><th className="px-3 py-2">Statut</th><th className="px-3 py-2">Commentaire RH</th><th className="px-3 py-2">Action</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {documents.map((document) => (
                          <tr key={document.id}>
                            <td className="px-3 py-2">{document.typeLabel}</td>
                            <td className="px-3 py-2">{document.fileName}</td>
                            <td className="px-3 py-2">{formatMonth(document.periodMonth)}</td>
                            <td className="px-3 py-2">{formatDate(document.createdAt)}</td>
                            <td className="px-3 py-2"><Badge variant="outline">{document.status}</Badge></td>
                            <td className="px-3 py-2 text-[#0A1A2F]/70">{document.reviewComment ?? "-"}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void handleDownloadDocument(document)}
                                  disabled={!document.storagePath || downloadingDocumentId === document.id}
                                >
                                  {downloadingDocumentId === document.id ? "Ouverture..." : "Telecharger"}
                                </Button>
                                {document.status !== "validated" ? (
                                  <>
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => void handleDeleteDocument(document)}
                                      disabled={deletingDocumentId === document.id || savingDocumentId === document.id}
                                    >
                                      {deletingDocumentId === document.id ? "Suppression..." : "Supprimer"}
                                    </Button>
                                  </>
                                ) : (
                                  <Badge variant="outline">Verrouille</Badge>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-sm text-[#0A1A2F]/70">Aucun document depose pour le moment.</p>}
              </CardContent>
            </Card>
          )}

          {currentSection === "offres" && (
            <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Card><CardHeader><CardTitle>Toutes les offres</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{offersCount}</p><p className="text-sm text-[#0A1A2F]/70">Offres actuellement publiees.</p></CardContent></Card>
              <Card><CardHeader><CardTitle>Mes candidatures</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{applicationsCount}</p><p className="text-sm text-[#0A1A2F]/70">Candidatures envoyees.</p></CardContent></Card>
              <Card><CardHeader><CardTitle>Mes CVs</CardTitle></CardHeader><CardContent><Badge variant="outline">{hasCv ? "CV disponible" : "Aucun CV"}</Badge></CardContent></Card>
            </section>
          )}

          {currentSection === "parametres" && (
            <Card>
              <CardHeader><CardTitle>Profil</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between"><span>Email</span><span>{profile?.email ?? "-"}</span></div>
                <div className="flex items-center justify-between"><span>Nom</span><span>{profile?.full_name ?? "-"}</span></div>
                <div className="flex items-center justify-between"><span>Role</span><Badge variant="outline">{profile?.role ?? "salarie"}</Badge></div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>

      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm text-[#0A1A2F] shadow">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement...
          </div>
        </div>
      )}

      <Dialog
        open={uploadDialogOpen}
        onOpenChange={(open) => {
          setUploadDialogOpen(open);
          if (!open) resetUploadDialog();
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Deposer un document</DialogTitle>
            <DialogDescription>
              Le depot peut etre libre ou rattache a une demande RH ouverte.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Demande RH</label>
              <select
                value={selectedRequestId}
                onChange={(event) => handleRequestSelection(event.target.value)}
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
              >
                <option value="">Aucune demande specifique</option>
                {pendingRequests.map((request) => (
                  <option key={request.id} value={request.id}>
                    {request.typeLabel} | {formatMonth(request.periodMonth)} | {request.status}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Type de document</label>
                <select
                  value={uploadDocumentTypeId}
                  onChange={(event) => setUploadDocumentTypeId(event.target.value)}
                  disabled={Boolean(selectedUploadRequest)}
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm disabled:bg-slate-100"
                >
                  <option value="">Choisir un type</option>
                  {documentTypes.map((documentType) => (
                    <option key={documentType.id} value={documentType.id}>{documentType.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Periode {selectedUploadType?.requiresPeriod ? "(obligatoire)" : "(optionnelle)"}
                </label>
                <input
                  type="month"
                  value={uploadPeriodMonth}
                  onChange={(event) => setUploadPeriodMonth(event.target.value)}
                  disabled={Boolean(selectedUploadRequest?.periodMonth)}
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm disabled:bg-slate-100"
                />
              </div>
            </div>

            {selectedUploadRequest && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-[#0A1A2F]/80">
                <p className="font-medium">{selectedUploadRequest.typeLabel}</p>
                <p>Echeance: {formatDate(selectedUploadRequest.dueAt)}</p>
                <p>Note: {selectedUploadRequest.note ?? "-"}</p>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium">Fichier</label>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                className="block w-full text-xs text-[#0A1A2F]/70 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-medium"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setUploadDialogOpen(false); resetUploadDialog(); }}>
              Annuler
            </Button>
            <Button
              type="button"
              onClick={() => void handleUploadSubmit()}
              disabled={!uploadDocumentTypeId || !uploadFile || uploadingRequestId !== null}
            >
              {uploadingRequestId ? "Depot..." : "Deposer le document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) resetEditDialog();
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Modifier le document</DialogTitle>
            <DialogDescription>
              Tant que le document n&apos;est pas valide par le RH, tu peux mettre a jour ses informations ou remplacer le fichier.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Type de document</label>
                <select
                  value={editDocumentTypeId}
                  onChange={(event) => setEditDocumentTypeId(event.target.value)}
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                >
                  <option value="">Choisir un type</option>
                  {documentTypes.map((documentType) => (
                    <option key={documentType.id} value={documentType.id}>{documentType.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Periode {selectedEditType?.requiresPeriod ? "(obligatoire)" : "(optionnelle)"}
                </label>
                <input
                  type="month"
                  value={editPeriodMonth}
                  onChange={(event) => setEditPeriodMonth(event.target.value)}
                  className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Nom du document</label>
              <input
                type="text"
                value={editFileName}
                onChange={(event) => setEditFileName(event.target.value)}
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Remplacer le fichier</label>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={(event) => setEditFile(event.target.files?.[0] ?? null)}
                className="block w-full text-xs text-[#0A1A2F]/70 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-medium"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setEditDialogOpen(false); resetEditDialog(); }}>
              Annuler
            </Button>
            <Button
              type="button"
              onClick={() => void handleUpdateDocument()}
              disabled={!editDocumentTypeId || !editFileName.trim() || savingDocumentId !== null}
            >
              {savingDocumentId ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
