"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient, type User } from "@supabase/supabase-js";
import { ChevronLeft, ChevronRight, Download, Eye, LogOut, MessageSquareText, Pencil, Search, SlidersHorizontal, Trash2 } from "lucide-react";

import { DashboardDocumentList } from "@/components/dashboard/document-list";
import type { BillingProfileFormState } from "@/components/dashboard/billing-profile-card";
import { DocumentFiltersBar } from "@/components/dashboard/document-filters-bar";
import { DashboardLoadingOverlay } from "@/components/dashboard/loading-overlay";
import { DashboardProfileMenu } from "@/components/dashboard/profile-menu";
import { SalarieDocumentsSection } from "@/components/dashboard/salarie-documents-section";
import { SalarieOffersSection } from "@/components/dashboard/salarie-offers-section";
import { SalarieOverviewSection } from "@/components/dashboard/salarie-overview-section";
import { SalarieSettingsSection } from "@/components/dashboard/salarie-settings-section";
import { StatusNotice } from "@/components/dashboard/status-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate, formatMonth, normalizeJoinOne } from "@/lib/dashboard-formatters";
import { cn } from "@/lib/utils";
import { buildEmployeeDocumentPath } from "@/lib/document-storage";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

type ProfileRow = { id: string; email: string; full_name: string | null; role: string | null; professional_status: string | null };
type RequestStatus = "pending" | "uploaded" | "validated" | "rejected" | "expired" | "cancelled";
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
  uploadedByName: string;
  fileName: string;
  createdAt: string | null;
  updatedAt: string | null;
  periodMonth: string | null;
  sizeBytes: number | null;
  reviewComment: string | null;
  typeLabel: string;
  storageBucket: string;
  storagePath: string;
};

type CraSummaryRow = {
  id: string;
  period_month: string;
  status: string;
  worked_days_count: number;
  pdf_version: number;
  employee_document_id: string | null;
  created_at: string;
  updated_at: string;
};

type CraEntryDraft = {
  workDate: string;
  dayQuantity: string;
  label: string;
};

const formatDocumentStatus = (value: DocumentStatus) => {
  if (value === "validated") return "Validé";
  if (value === "rejected") return "Refusé";
  return "En attente";
};

const normalizeDocumentLabel = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const matchesDocumentFilters = (
  document: Pick<DocumentRow, "typeLabel" | "periodMonth" | "status">,
  filters: { type: string; period: string; status: string },
) => {
  if (filters.type !== "all" && document.typeLabel !== filters.type) return false;
  if (filters.period !== "all" && (document.periodMonth ?? "__none__") !== filters.period) return false;
  if (filters.status !== "all" && document.status !== filters.status) return false;
  return true;
};

const emptyBillingProfileForm = (): BillingProfileFormState => ({
  firstName: "",
  lastName: "",
  companyName: "",
  esnPartenaire: "",
  addressLine1: "",
  addressLine2: "",
  postalCode: "",
  city: "",
  country: "France",
  phone: "",
  email: "",
  siret: "",
  iban: "",
  bic: "",
  dailyRate: "",
});

const currentMonthInputValue = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const weekdayLabels = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const sortCraEntries = (entries: CraEntryDraft[]) => [...entries].sort((left, right) => left.workDate.localeCompare(right.workDate));

const shiftMonthInputValue = (value: string, offset: number) => {
  const [yearString, monthString] = value.split("-");
  const year = Number(yearString);
  const month = Number(monthString);
  if (!year || !month) {
    return currentMonthInputValue();
  }

  const nextDate = new Date(year, month - 1 + offset, 1);
  const nextYear = nextDate.getFullYear();
  const nextMonth = String(nextDate.getMonth() + 1).padStart(2, "0");
  return `${nextYear}-${nextMonth}`;
};

const buildCalendarCells = (monthValue: string) => {
  const [yearString, monthString] = monthValue.split("-");
  const year = Number(yearString);
  const month = Number(monthString);
  if (!year || !month) {
    return [] as Array<{ isoDate: string | null; dayNumber: number | null }>;
  }

  const firstDay = new Date(year, month - 1, 1);
  const totalDays = new Date(year, month, 0).getDate();
  const leadingEmptyCells = (firstDay.getDay() + 6) % 7;
  const cells: Array<{ isoDate: string | null; dayNumber: number | null }> = [];

  for (let index = 0; index < leadingEmptyCells; index += 1) {
    cells.push({ isoDate: null, dayNumber: null });
  }

  for (let dayNumber = 1; dayNumber <= totalDays; dayNumber += 1) {
    cells.push({
      isoDate: `${monthValue}-${String(dayNumber).padStart(2, "0")}`,
      dayNumber,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ isoDate: null, dayNumber: null });
  }

  return cells;
};

const formatCraEntryDateLabel = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
};

export default function SalarieWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [documentTypeFilter, setDocumentTypeFilter] = useState("all");
  const [documentPeriodFilter, setDocumentPeriodFilter] = useState("all");
  const [documentStatusFilter, setDocumentStatusFilter] = useState("all");
  const [applicationsCount, setApplicationsCount] = useState(0);
  const [offersCount, setOffersCount] = useState(0);
  const [hasCv, setHasCv] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingRequestId, setUploadingRequestId] = useState<string | null>(null);
  const [downloadingDocumentId, setDownloadingDocumentId] = useState<string | null>(null);
  const [viewingDocumentId, setViewingDocumentId] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadDialogMode, setUploadDialogMode] = useState<"default" | "cra_facture">("default");
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
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedCommentDocument, setSelectedCommentDocument] = useState<{ fileName: string; comment: string } | null>(null);
  const [savingDocumentId, setSavingDocumentId] = useState<string | null>(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: "", confirmPassword: "" });
  const [billingProfileForm, setBillingProfileForm] = useState<BillingProfileFormState>(emptyBillingProfileForm);
  const [billingProfileReady, setBillingProfileReady] = useState(false);
  const [billingProfileLoading, setBillingProfileLoading] = useState(false);
  const [billingProfileSaving, setBillingProfileSaving] = useState(false);
  const [craItems, setCraItems] = useState<CraSummaryRow[]>([]);
  const [selectedCraId, setSelectedCraId] = useState<string | null>(null);
  const [craPeriodMonth, setCraPeriodMonth] = useState(currentMonthInputValue);
  const [craNotes, setCraNotes] = useState("");
  const [craEntries, setCraEntries] = useState<CraEntryDraft[]>([]);
  const [craGenerating, setCraGenerating] = useState(false);
  const [invoiceGenerating, setInvoiceGenerating] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

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
        .select("id,status,file_name,created_at,updated_at,size_bytes,period_month,review_comment,storage_bucket,storage_path,document_type:document_types(id,label),uploader:profiles!employee_documents_uploaded_by_fkey(full_name,email)")
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
      updated_at: string | null;
      size_bytes: number | null;
      period_month: string | null;
      review_comment: string | null;
      storage_bucket: string | null;
      storage_path: string | null;
      document_type: { id: string; label: string } | { id: string; label: string }[] | null;
      uploader: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null;
    }) => {
      const documentType = normalizeJoinOne(row.document_type);
      const uploader = normalizeJoinOne(row.uploader);
      return {
        id: row.id,
        documentTypeId: documentType?.id ?? "",
        status: row.status,
        uploadedByName: uploader?.full_name ?? uploader?.email ?? "Utilisateur",
        fileName: row.file_name,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        periodMonth: row.period_month,
        sizeBytes: row.size_bytes,
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
      const { data: profileData, error: profileError } = await supabase.from("profiles").select("id,email,full_name,role,professional_status").eq("id", sessionData.session.user.id).single();
      if (profileError || !profileData || profileData.role !== "salarie" || profileData.professional_status !== "verified") {
        setLoading(false);
        router.push("/auth");
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

  const callSalarieApi = useCallback(async (path: string, init?: RequestInit) => {
    if (!supabase) {
      throw new Error("Configuration Supabase manquante.");
    }

    const { data, error } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (error || !accessToken) {
      throw new Error(error?.message ?? "Session salarie manquante.");
    }

    const response = await fetch(path, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      throw new Error(payload?.error ?? "Requete salarie impossible.");
    }
    return payload;
  }, []);

  const loadBillingProfile = useCallback(async () => {
    setBillingProfileLoading(true);
    try {
      const payload = (await callSalarieApi("/api/salarie/billing-profile")) as {
        profile?: {
          first_name: string;
          last_name: string;
          company_name: string;
          esn_partenaire: string | null;
          address_line_1: string;
          address_line_2: string | null;
          postal_code: string;
          city: string;
          country: string;
          phone: string;
          email: string;
          siret: string;
          iban: string;
          bic: string;
          daily_rate: number;
        } | null;
      };

      if (!payload.profile) {
        setBillingProfileReady(false);
        setBillingProfileForm((prev) => ({
          ...prev,
          firstName: prev.firstName || "",
          lastName: prev.lastName || "",
          companyName: prev.companyName || "",
          esnPartenaire: prev.esnPartenaire || "",
          phone: prev.phone || "",
          email: prev.email || profile?.email || "",
        }));
        return;
      }

      setBillingProfileForm({
        firstName: payload.profile.first_name,
        lastName: payload.profile.last_name,
        companyName: payload.profile.company_name,
        esnPartenaire: payload.profile.esn_partenaire ?? "",
        addressLine1: payload.profile.address_line_1,
        addressLine2: payload.profile.address_line_2 ?? "",
        postalCode: payload.profile.postal_code,
        city: payload.profile.city,
        country: payload.profile.country,
        phone: payload.profile.phone,
        email: payload.profile.email,
        siret: payload.profile.siret,
        iban: payload.profile.iban,
        bic: payload.profile.bic,
        dailyRate: String(payload.profile.daily_rate ?? ""),
      });
      setBillingProfileReady(true);
    } finally {
      setBillingProfileLoading(false);
    }
  }, [callSalarieApi, profile?.email]);

  const loadCraItems = useCallback(async () => {
    const payload = (await callSalarieApi("/api/salarie/cra")) as { items?: CraSummaryRow[] };
    setCraItems(payload.items ?? []);
  }, [callSalarieApi]);

  const loadCraDetail = useCallback(async (craId: string) => {
    const payload = (await callSalarieApi(`/api/salarie/cra/${craId}`)) as {
      cra?: { id: string; period_month: string; notes: string | null };
      entries?: { work_date: string; day_quantity: number; label: string | null }[];
    };
    if (!payload.cra) {
      throw new Error("CRA introuvable.");
    }

    setSelectedCraId(payload.cra.id);
    setCraPeriodMonth(payload.cra.period_month.slice(0, 7));
    setCraNotes(payload.cra.notes ?? "");
    setCraEntries(
      sortCraEntries(
        (payload.entries ?? []).map((entry) => ({
          workDate: entry.work_date,
          dayQuantity: String(entry.day_quantity),
          label: entry.label ?? "",
        })),
      ),
    );
  }, [callSalarieApi]);

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
    setUploadDialogMode("default");
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
    setUploadDialogMode("default");
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

  const openCommentDialog = useCallback((document: Pick<DocumentRow, "fileName" | "reviewComment">) => {
    if (!document.reviewComment) return;
    setSelectedCommentDocument({ fileName: document.fileName, comment: document.reviewComment });
    setCommentDialogOpen(true);
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
  }, [documents, documentTypes, editDocumentTypeId, editFile, editFileName, editPeriodMonth, editingDocumentId, findMatchingRequest, loadDashboardData, profile, resetEditDialog, user]);

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
  }, [findMatchingRequest, loadDashboardData, profile]);

  const getSignedDocumentUrl = useCallback(async (document: DocumentRow) => {
    if (!supabase || !document.storagePath) return;
    const { data, error: downloadError } = await supabase.storage.from(document.storageBucket).createSignedUrl(document.storagePath, 60);
    if (downloadError || !data?.signedUrl) {
      throw new Error(downloadError?.message ?? "Impossible de generer le lien de telechargement.");
    }

    return data.signedUrl;
  }, []);

  const handleViewDocument = useCallback(async (document: DocumentRow) => {
    if (!document.storagePath) return;

    try {
      setViewingDocumentId(document.id);
      setActionMessage(null);
      const signedUrl = await getSignedDocumentUrl(document);
      if (!signedUrl) {
        return;
      }

      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Impossible d'ouvrir le document.");
    } finally {
      setViewingDocumentId(null);
    }
  }, [getSignedDocumentUrl]);

  const handleDownloadDocument = useCallback(async (document: DocumentRow) => {
    if (!document.storagePath) return;

    try {
      setDownloadingDocumentId(document.id);
      setActionMessage(null);
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
      link.remove();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Impossible de telecharger le document.");
    } finally {
      setDownloadingDocumentId(null);
    }
  }, [getSignedDocumentUrl]);

  const resetCraEditor = useCallback(() => {
    setSelectedCraId(null);
    setCraPeriodMonth(currentMonthInputValue());
    setCraNotes("");
    setCraEntries([]);
  }, []);

  const handleCraPeriodMonthChange = useCallback((nextPeriodMonth: string) => {
    setCraPeriodMonth(nextPeriodMonth);
    setCraEntries((previousEntries) =>
      sortCraEntries(previousEntries.filter((entry) => entry.workDate.startsWith(`${nextPeriodMonth}-`))),
    );
  }, []);

  const toggleCraWorkDate = useCallback((workDate: string) => {
    setCraEntries((previousEntries) => {
      const existingEntry = previousEntries.find((entry) => entry.workDate === workDate);
      if (existingEntry) {
        return previousEntries.filter((entry) => entry.workDate !== workDate);
      }

      return sortCraEntries([
        ...previousEntries,
        {
          workDate,
          dayQuantity: "1",
          label: "",
        },
      ]);
    });
  }, []);

  const updateCraEntry = useCallback((workDate: string, patch: Partial<CraEntryDraft>) => {
    setCraEntries((previousEntries) =>
      sortCraEntries(
        previousEntries.map((entry) => (entry.workDate === workDate ? { ...entry, ...patch } : entry)),
      ),
    );
  }, []);

  const handleBillingProfileSave = useCallback(async () => {
    try {
      setBillingProfileSaving(true);
      setActionMessage(null);
      await callSalarieApi("/api/salarie/billing-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(billingProfileForm),
      });
      setBillingProfileReady(true);
      setActionMessage("Profil de facturation enregistre.");
      await loadBillingProfile();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Enregistrement du profil impossible.");
    } finally {
      setBillingProfileSaving(false);
    }
  }, [billingProfileForm, callSalarieApi, loadBillingProfile]);

  const upsertCraRecord = useCallback(async () => {
    if (!billingProfileReady) {
      throw new Error("Renseigne d'abord ton profil de facturation.");
    }

    const payload = {
      periodMonth: craPeriodMonth,
      notes: craNotes,
      entries: craEntries.filter((entry) => entry.workDate.trim()).map((entry) => ({
        workDate: entry.workDate,
        dayQuantity: Number(entry.dayQuantity || 0),
        label: entry.label,
      })),
    };

    const response = (await callSalarieApi(
      selectedCraId ? `/api/salarie/cra/${selectedCraId}` : "/api/salarie/cra",
      {
        method: selectedCraId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    )) as { cra?: { id: string } };

    await loadCraItems();

    if (!response.cra?.id) {
      throw new Error("Enregistrement du CRA impossible.");
    }

    await loadCraDetail(response.cra.id);
    return response.cra.id;
  }, [billingProfileReady, callSalarieApi, craEntries, craNotes, craPeriodMonth, loadCraDetail, loadCraItems, selectedCraId]);

  const handleGenerateCraPdf = useCallback(async () => {
    try {
      setCraGenerating(true);
      setActionMessage(null);
      const craId = await upsertCraRecord();
      await callSalarieApi(`/api/salarie/cra/${craId}/generate-pdf`, {
        method: "POST",
      });
      await Promise.all([loadCraItems(), profile ? loadDashboardData(profile.id) : Promise.resolve()]);
      setActionMessage("PDF CRA genere et ajoute aux documents.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Generation du PDF CRA impossible.");
    } finally {
      setCraGenerating(false);
    }
  }, [callSalarieApi, loadCraItems, loadDashboardData, profile, upsertCraRecord]);

  const handleGenerateInvoicePdf = useCallback(() => {
    const payload = {
      periodMonth: craPeriodMonth,
      entries: craEntries.filter((entry) => entry.workDate.trim()).map((entry) => ({
        workDate: entry.workDate,
        dayQuantity: Number(entry.dayQuantity || 0),
        label: entry.label,
      })),
    };

    const run = async () => {
      try {
        setInvoiceGenerating(true);
        setActionMessage(null);
        await callSalarieApi("/api/salarie/factures/generate-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        await (profile ? loadDashboardData(profile.id) : Promise.resolve());
        setActionMessage("Facture PDF generee et ajoutee aux documents.");
      } catch (error) {
        setActionMessage(error instanceof Error ? error.message : "Generation de la facture impossible.");
      } finally {
        setInvoiceGenerating(false);
      }
    };

    void run();
  }, [callSalarieApi, craEntries, craPeriodMonth, loadDashboardData, profile]);

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
      : pathname.startsWith("/dashboard/salarie/documents/cra-facture")
        ? "docs_cra_facture"
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
  const craFactureDocumentTypes = useMemo(
    () =>
      documentTypes.filter((documentType) => {
        const normalizedLabel = normalizeDocumentLabel(documentType.label);
        return normalizedLabel.includes("cra") || normalizedLabel.includes("facture");
      }),
    [documentTypes],
  );
  const availableUploadDocumentTypes = uploadDialogMode === "cra_facture" ? craFactureDocumentTypes : documentTypes;
  const filteredDocuments = useMemo(() => {
    if (currentSubSection === "docs_cra_facture") {
      return documents.filter((document) => {
        const normalizedLabel = normalizeDocumentLabel(document.typeLabel);
        return normalizedLabel.includes("cra") || normalizedLabel.includes("facture");
      });
    }
    return documents;
  }, [currentSubSection, documents]);
  const documentTypeOptions = useMemo(
    () => Array.from(new Set(filteredDocuments.map((document) => document.typeLabel))).sort((left, right) => left.localeCompare(right, "fr")),
    [filteredDocuments],
  );
  const documentPeriodOptions = useMemo(
    () => Array.from(new Set(filteredDocuments.map((document) => document.periodMonth ?? "__none__"))).sort((left, right) => left.localeCompare(right)),
    [filteredDocuments],
  );
  const visibleDocuments = useMemo(
    () =>
      filteredDocuments.filter((document) =>
        matchesDocumentFilters(document, {
          type: documentTypeFilter,
          period: documentPeriodFilter,
          status: documentStatusFilter,
        }),
      ),
    [documentPeriodFilter, documentStatusFilter, documentTypeFilter, filteredDocuments],
  );
  const documentFilterOptions = useMemo(
    () => ({
      type: documentTypeOptions.map((value) => ({ value, label: value })),
      period: documentPeriodOptions.map((value) => ({
        value,
        label: value === "__none__" ? "Sans periode" : formatMonth(value),
      })),
      status: [
        { value: "pending", label: "En attente" },
        { value: "validated", label: "Valide" },
        { value: "rejected", label: "Refuse" },
      ],
      owner: [],
    }),
    [documentPeriodOptions, documentTypeOptions],
  );
  const documentsCardTitle =
    currentSubSection === "docs_a_deposer"
      ? "Documents a deposer"
      : currentSubSection === "docs_cra_facture"
        ? "CRA & Facture"
          : "Mes documents";
  const selectedCraSummary = useMemo(
    () => craItems.find((item) => item.id === selectedCraId) ?? null,
    [craItems, selectedCraId],
  );
  const craEntriesByDate = useMemo(
    () => new Map(craEntries.map((entry) => [entry.workDate, entry])),
    [craEntries],
  );
  const craDraftTotalDays = useMemo(
    () => craEntries.reduce((total, entry) => total + (Number(entry.dayQuantity) || 0), 0),
    [craEntries],
  );
  const craCalendarCells = useMemo(() => buildCalendarCells(craPeriodMonth), [craPeriodMonth]);
  const displayName = useMemo(() => {
    const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string; display_name?: string };
    return meta.full_name ?? meta.name ?? meta.display_name ?? profile?.full_name ?? profile?.email ?? "utilisateur";
  }, [profile?.email, profile?.full_name, user?.user_metadata]);

  useEffect(() => {
    setProfileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!profileMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [profileMenuOpen]);

  const handleSignOut = useCallback(async () => {
    if (!supabase) return;
    setProfileMenuOpen(false);
    await supabase.auth.signOut();
    router.push("/auth");
  }, [router]);

  useEffect(() => {
    if (!profile) return;

    if (currentSubSection === "docs_cra_facture" || currentSection === "parametres") {
      void loadBillingProfile().catch((error) => {
        setActionMessage(error instanceof Error ? error.message : "Chargement du profil de facturation impossible.");
      });
    }

    if (currentSubSection === "docs_cra_facture") {
      void loadCraItems().catch((error) => {
        setActionMessage(error instanceof Error ? error.message : "Chargement des CRA impossible.");
      });
    }
  }, [currentSection, currentSubSection, loadBillingProfile, loadCraItems, profile]);

  return (
    <div className="h-screen overflow-hidden bg-[#eaf0fb] text-[#0A1A2F]">
      <div className="relative h-full">
        <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:block lg:w-[232px]">
          <div className="flex h-full flex-col gap-4 px-4 py-5">
            <Link href="/" className="block rounded-2xl px-2 py-1 transition hover:bg-white/60">
              <p className="text-lg font-semibold tracking-tight text-[#0A1A2F]">Jarvis Connect</p>
            </Link>
            <nav className="mt-5 space-y-1 text-sm">
              <Link href="/dashboard/salarie" className={`block px-1 py-2 hover:underline ${currentSection === "overview" ? "font-semibold" : ""}`}>Vue d&apos;ensemble</Link>
              <Link href="/dashboard/salarie/documents" className={`block px-1 py-2 hover:underline ${currentSection === "documents" ? "font-semibold" : ""}`}>Mes documents</Link>
              {currentSection === "documents" && (
                <div className="ml-3 space-y-1 border-l border-slate-200 pl-3 text-xs">
                  <Link href="/dashboard/salarie/documents/a-deposer" className={`block py-1 ${currentSubSection === "docs_a_deposer" ? "font-semibold" : ""}`}>A deposer</Link>
                  <Link href="/dashboard/salarie/documents" className={`block py-1 ${currentSubSection === "docs_tous" ? "font-semibold" : ""}`}>Tous mes documents</Link>
                  <Link href="/dashboard/salarie/documents/cra-facture" className={`block py-1 ${currentSubSection === "docs_cra_facture" ? "font-semibold" : ""}`}>CRA & Facture</Link>
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
            </nav>
            <div className="mt-auto space-y-1">
              <button type="button" className="flex items-center px-1 py-2 text-sm hover:underline" onClick={() => void handleSignOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                Deconnexion
              </button>
            </div>
          </div>
        </aside>

        <aside className="hidden lg:fixed lg:inset-y-0 lg:right-0 lg:block lg:w-[64px]">
          <div className="flex h-full items-stretch justify-center px-2 py-5" />
        </aside>

        <main className="flex h-full flex-col overflow-hidden px-2 py-2 lg:ml-[232px] lg:mr-[64px] lg:px-3 lg:py-3">
          <div className="hidden lg:flex items-center rounded-[30px] px-2 py-1.5">
            <div className="flex min-w-0 flex-1 items-center">
              <div className="flex w-full max-w-lg items-center gap-3 rounded-full border border-white/70 bg-white/70 px-5 py-3 shadow-[0_8px_24px_rgba(148,163,184,0.14)] backdrop-blur">
                  <Search className="h-4 w-4 text-[#0A1A2F]/55" />
                  <span className="text-sm text-[#0A1A2F]/55">Rechercher dans l&apos;espace salarie</span>
                  <SlidersHorizontal className="ml-auto h-4 w-4 text-[#0A1A2F]/45" />
              </div>
            </div>
          </div>
          <DashboardProfileMenu
            menuRef={profileMenuRef}
            isOpen={profileMenuOpen}
            onToggle={() => setProfileMenuOpen((open) => !open)}
            onClose={() => setProfileMenuOpen(false)}
            onSignOut={handleSignOut}
            email={profile?.email ?? user?.email ?? "-"}
            displayName={displayName}
            roleLabel="Espace salarie"
            settingsHref="/dashboard/salarie/parametres"
            settingsActive={currentSection === "parametres"}
          />

          <div className="mt-2 min-h-0 flex-1 overflow-y-auto rounded-[30px] border border-white/70 bg-white px-4 py-6 overscroll-contain lg:px-8 lg:py-8">
          <div className="space-y-4">
          {(!supabase || error) && (
            <StatusNotice
              tone="error"
              title="Erreur"
              message={error ?? "Configuration Supabase manquante."}
            />
          )}

          {actionMessage && !error && <StatusNotice message={actionMessage} />}

          {currentSection === "overview" && (
            <SalarieOverviewSection
              pendingRequestsCount={pendingRequests.length}
              documentsCount={documents.length}
              validatedDocumentsCount={documents.filter((document) => document.status === "validated").length}
              pendingRequests={pendingRequests}
              formatDate={formatDate}
              formatMonth={formatMonth}
              action={
                <Button type="button" variant="outline" size="sm" onClick={() => openUploadDialog()}>
                  Deposer un document
                </Button>
              }
            />
          )}

          {currentSection === "documents" && (
            <>
              <SalarieDocumentsSection
                currentSubSection={currentSubSection}
                documentsCardTitle={documentsCardTitle}
                billingProfileReady={billingProfileReady}
                selectedCraId={selectedCraId}
                selectedCraSummary={selectedCraSummary}
                resetCraEditor={resetCraEditor}
                onGenerateCraPdf={handleGenerateCraPdf}
                onGenerateInvoicePdf={handleGenerateInvoicePdf}
                craGenerating={craGenerating}
                invoiceGenerating={invoiceGenerating}
                craPeriodMonth={craPeriodMonth}
                onCraPeriodMonthChange={handleCraPeriodMonthChange}
                shiftMonthInputValue={shiftMonthInputValue}
                craDraftTotalDays={craDraftTotalDays}
                craNotes={craNotes}
                onCraNotesChange={setCraNotes}
                weekdayLabels={weekdayLabels}
                craCalendarCells={craCalendarCells}
                craEntriesByDate={craEntriesByDate}
                craEntries={craEntries}
                toggleCraWorkDate={toggleCraWorkDate}
                formatCraEntryDateLabel={formatCraEntryDateLabel}
                updateCraEntry={updateCraEntry}
                visibleDocuments={visibleDocuments}
                documentTypeFilter={documentTypeFilter}
                documentPeriodFilter={documentPeriodFilter}
                documentStatusFilter={documentStatusFilter}
                documentFilterOptions={documentFilterOptions}
                onDocumentTypeFilterChange={setDocumentTypeFilter}
                onDocumentPeriodFilterChange={setDocumentPeriodFilter}
                onDocumentStatusFilterChange={setDocumentStatusFilter}
                onViewDocument={handleViewDocument}
                onDownloadDocument={handleDownloadDocument}
                onDeleteDocument={handleDeleteDocument}
                onOpenCommentDialog={openCommentDialog}
                onOpenEditDialog={openEditDialog}
                viewingDocumentId={viewingDocumentId}
                downloadingDocumentId={downloadingDocumentId}
                deletingDocumentId={deletingDocumentId}
                savingDocumentId={savingDocumentId}
                pendingRequests={pendingRequests}
                openUploadDialog={openUploadDialog}
                formatDate={formatDate}
                formatMonth={formatMonth}
                formatDocumentStatus={formatDocumentStatus}
              />
              {false && (
                <section className="space-y-4">
                  <div className="flex flex-row items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-[#0A1A2F]">{documentsCardTitle}</h2>
                  </div>
                  <div>
                {currentSubSection === "docs_cra_facture" ? (
                  <div className="space-y-6">
                    <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-[#0A1A2F]/80">
                      Cette page permet de generer un CRA et une facture PDF a partir de la meme periode de travail.
                    </div>

                    <div className="max-w-5xl">
                      <Card className="border-0 shadow-none">
                        <CardHeader className="flex flex-row items-center justify-between gap-3">
                          <div>
                            <CardTitle className="text-base">{selectedCraId ? "CRA en cours" : "Nouveau CRA"}</CardTitle>
                            <p className="mt-1 text-sm text-[#0A1A2F]/70">
                              {selectedCraSummary ? `Statut actuel: ${selectedCraSummary.status} | PDF v${selectedCraSummary.pdf_version}` : "Selectionne tes jours, puis genere directement le PDF depuis cette page."}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={resetCraEditor}>
                              Remettre a 0
                            </Button>
                            <Button type="button" size="sm" onClick={() => void handleGenerateCraPdf()} disabled={craGenerating || invoiceGenerating}>
                              {craGenerating ? "Generation..." : "Generer un CRA"}
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={handleGenerateInvoicePdf} disabled={invoiceGenerating || craGenerating}>
                              {invoiceGenerating ? "Generation..." : "Generer une facture"}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-5">
                          {!billingProfileReady && (
                            <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
                              Enregistre d&apos;abord ton profil de facturation pour pouvoir creer un CRA.
                            </div>
                          )}

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-1">
                              <label className="text-sm font-medium">Periode</label>
                              <div className="flex items-center gap-2">
                                <Button type="button" variant="outline" size="icon" onClick={() => handleCraPeriodMonthChange(shiftMonthInputValue(craPeriodMonth, -1))}>
                                  <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <input type="month" value={craPeriodMonth} onChange={(event) => handleCraPeriodMonthChange(event.target.value)} className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" />
                                <Button type="button" variant="outline" size="icon" onClick={() => handleCraPeriodMonthChange(shiftMonthInputValue(craPeriodMonth, 1))}>
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-sm font-medium">Total saisi</label>
                              <div className="flex h-10 items-center rounded-md bg-slate-50 px-3 text-sm">{craDraftTotalDays.toFixed(2)} jour(s)</div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-sm font-medium">Notes</label>
                            <textarea value={craNotes} onChange={(event) => setCraNotes(event.target.value)} rows={4} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Commentaire interne, precision de mission, etc." />
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-medium">Journees travaillees</p>
                                <p className="text-sm text-[#0A1A2F]/70">Clique sur les jours travailles dans le calendrier pour les ajouter ou les retirer.</p>
                              </div>
                              <Badge variant="outline">{craEntries.length} selection(s)</Badge>
                            </div>
                            <div className="rounded-xl bg-slate-50/70 p-4">
                              <div className="mb-3 grid grid-cols-7 gap-2">
                                {weekdayLabels.map((label) => (
                                  <div key={label} className="px-1 text-center text-xs font-medium uppercase tracking-wide text-[#0A1A2F]/50">
                                    {label}
                                  </div>
                                ))}
                              </div>
                              <div className="grid grid-cols-7 gap-2">
                                {craCalendarCells.map((cell, index) => {
                                  const isoDate = cell.isoDate;
                                  const dayNumber = cell.dayNumber;

                                  if (!isoDate || !dayNumber) {
                                    return <div key={`empty-${index}`} className="aspect-square rounded-lg bg-slate-50/60" />;
                                  }

                                  const parsedDate = new Date(`${isoDate}T00:00:00`);
                                  const isWeekend = [0, 6].includes(parsedDate.getDay());
                                  const isSelected = craEntriesByDate.has(isoDate);

                                  return (
                                    <button
                                      key={isoDate}
                                      type="button"
                                      onClick={() => toggleCraWorkDate(isoDate)}
                                      className={cn(
                                        "aspect-square rounded-lg border border-transparent text-sm transition-colors",
                                        isSelected
                                          ? "border-[#2aa0dd] bg-[#2aa0dd] text-white"
                                          : "bg-white text-[#0A1A2F] hover:bg-slate-100",
                                        isWeekend && !isSelected ? "text-[#0A1A2F]/55" : "",
                                      )}
                                      aria-pressed={isSelected}
                                    >
                                      {dayNumber}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="space-y-3">
                              <p className="text-sm font-medium">Jours selectionnes</p>
                              {craEntries.length ? (
                                craEntries.map((entry) => (
                                  <div key={entry.workDate} className="grid gap-3 rounded-lg bg-slate-50 p-3 md:grid-cols-[1.1fr_120px_1.3fr_auto]">
                                    <div className="space-y-1">
                                      <label className="text-xs font-medium text-[#0A1A2F]/70">Date</label>
                                      <div className="flex h-10 items-center rounded-md bg-white px-3 text-sm capitalize">
                                        {formatCraEntryDateLabel(entry.workDate)}
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-xs font-medium text-[#0A1A2F]/70">Jours</label>
                                      <input
                                        type="number"
                                        min="0.25"
                                        max="1"
                                        step="0.25"
                                        value={entry.dayQuantity}
                                        onChange={(event) => updateCraEntry(entry.workDate, { dayQuantity: event.target.value })}
                                        className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-xs font-medium text-[#0A1A2F]/70">Libelle</label>
                                      <input
                                        value={entry.label}
                                        onChange={(event) => updateCraEntry(entry.workDate, { label: event.target.value })}
                                        className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                                        placeholder="Mission client, support, intervention..."
                                      />
                                    </div>
                                    <div className="flex items-end">
                                      <Button type="button" variant="destructive" size="sm" onClick={() => toggleCraWorkDate(entry.workDate)}>
                                        Retirer
                                      </Button>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="rounded-lg bg-slate-50 px-4 py-6 text-sm text-[#0A1A2F]/65">
                                  Aucun jour selectionne pour cette periode.
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

	                    <div className="space-y-3">
	                      <div className="flex items-center justify-between gap-3">
	                        <p className="font-medium">Documents CRA & Facture generes ou deposes</p>
	                        <Badge variant="outline">{visibleDocuments.length}</Badge>
	                      </div>
	                      <DocumentFiltersBar
                      fields={["type", "period", "status"]}
                      values={{ type: documentTypeFilter, period: documentPeriodFilter, status: documentStatusFilter, owner: "all" }}
                      options={documentFilterOptions}
                      onChange={(field, value) => {
                        if (field === "type") setDocumentTypeFilter(value);
                        if (field === "period") setDocumentPeriodFilter(value);
                        if (field === "status") setDocumentStatusFilter(value);
                      }}
                    />
	                      {visibleDocuments.length ? (
	                        <DashboardDocumentList
	                          items={visibleDocuments.map((document) => ({
                            ...document,
                            ownerName: document.uploadedByName,
                            createdAt: document.createdAt,
                            statusLabel: formatDocumentStatus(document.status),
                            periodLabel: formatMonth(document.periodMonth),
                            details: document.reviewComment ? `Commentaire RH : ${document.reviewComment}` : null,
                          }))}
                          storageKey="salarie-documents-cra-facture-columns"
                          renderActions={(document, closeMenu) => (
                            <>
                              {document.fileName.toLowerCase().endsWith(".pdf") ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start"
                                  onClick={() => { closeMenu(); void handleViewDocument(document); }}
                                  disabled={!document.storagePath || viewingDocumentId === document.id || downloadingDocumentId === document.id}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  Visualiser
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => { closeMenu(); void handleDownloadDocument(document); }}
                                disabled={!document.storagePath || downloadingDocumentId === document.id || viewingDocumentId === document.id}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Télécharger
                              </Button>
	                              {document.reviewComment ? (
	                                <Button
	                                  type="button"
	                                  variant="ghost"
	                                  size="sm"
	                                  className="w-full justify-start"
	                                  onClick={() => { closeMenu(); openCommentDialog(document); }}
	                                >
	                                  <MessageSquareText className="mr-2 h-4 w-4" />
	                                  Voir commentaire RH
	                                </Button>
	                              ) : null}
	                              {document.status !== "validated" ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start text-red-600 hover:text-red-700"
                                  onClick={() => { closeMenu(); void handleDeleteDocument(document); }}
                                  disabled={deletingDocumentId === document.id || savingDocumentId === document.id}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Supprimer
                                </Button>
                              ) : (
                                <Badge variant="outline">Verrouillé</Badge>
                              )}
                            </>
                          )}
                        />
                      ) : (
                        <p className="text-sm text-[#0A1A2F]/70">Aucun CRA ou facture depose pour le moment.</p>
                      )}
                    </div>
                  </div>
                ) : currentSubSection === "docs_a_deposer" ? (
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
	                ) : (
	                  <div className="space-y-3">
	                    <DocumentFiltersBar
                      fields={["type", "period", "status"]}
                      values={{ type: documentTypeFilter, period: documentPeriodFilter, status: documentStatusFilter, owner: "all" }}
                      options={documentFilterOptions}
                      onChange={(field, value) => {
                        if (field === "type") setDocumentTypeFilter(value);
                        if (field === "period") setDocumentPeriodFilter(value);
                        if (field === "status") setDocumentStatusFilter(value);
                      }}
                    />
		                    {visibleDocuments.length ? (
	                  <DashboardDocumentList
	                    items={visibleDocuments.map((document) => ({
                      ...document,
                      ownerName: document.uploadedByName,
                      createdAt: document.createdAt,
                      statusLabel: formatDocumentStatus(document.status),
                      periodLabel: formatMonth(document.periodMonth),
                      details: document.reviewComment ? `Commentaire RH : ${document.reviewComment}` : null,
                    }))}
                    storageKey="salarie-documents-columns"
                    renderActions={(document, closeMenu) => (
                      <>
                        {document.fileName.toLowerCase().endsWith(".pdf") ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => { closeMenu(); void handleViewDocument(document); }}
                            disabled={!document.storagePath || viewingDocumentId === document.id || downloadingDocumentId === document.id}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Visualiser
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => { closeMenu(); void handleDownloadDocument(document); }}
                          disabled={!document.storagePath || downloadingDocumentId === document.id || viewingDocumentId === document.id}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Télécharger
                        </Button>
	                        {document.reviewComment ? (
	                          <Button
	                            type="button"
	                            variant="ghost"
	                            size="sm"
	                            className="w-full justify-start"
	                            onClick={() => { closeMenu(); openCommentDialog(document); }}
	                          >
	                            <MessageSquareText className="mr-2 h-4 w-4" />
	                            Voir commentaire RH
	                          </Button>
	                        ) : null}
	                        {document.status !== "validated" ? (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => { closeMenu(); openEditDialog(document); }}
                              disabled={deletingDocumentId === document.id || savingDocumentId === document.id}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Modifier
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-red-600 hover:text-red-700"
                              onClick={() => { closeMenu(); void handleDeleteDocument(document); }}
                              disabled={deletingDocumentId === document.id || savingDocumentId === document.id}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Supprimer
                            </Button>
                          </>
                        ) : (
                          <Badge variant="outline">Verrouillé</Badge>
                        )}
                      </>
                    )}
	                  />
	                ) : <p className="text-sm text-[#0A1A2F]/70">Aucun document depose pour le moment.</p>}
	                  </div>
	                )}
                  </div>
                </section>
              )}
            </>
          )}

          {currentSection === "offres" && (
            <SalarieOffersSection
              offersCount={offersCount}
              applicationsCount={applicationsCount}
              hasCv={hasCv}
            />
          )}

          {currentSection === "parametres" && (
            <SalarieSettingsSection
              email={profile?.email ?? "-"}
              fullName={profile?.full_name ?? "-"}
              role={profile?.role ?? "salarie"}
              billingProfileForm={billingProfileForm}
              onBillingProfileChange={setBillingProfileForm}
              onBillingProfileSubmit={handleBillingProfileSave}
              billingProfileSaving={billingProfileSaving}
              billingProfileLoading={billingProfileLoading}
              passwordSaving={passwordSaving}
              passwordMessage={passwordMessage}
              passwordForm={passwordForm}
              onPasswordFormChange={setPasswordForm}
              onPasswordSubmit={handlePasswordUpdate}
            />
          )}
          </div>
          </div>
        </main>
      </div>

      {loading && <DashboardLoadingOverlay message="Chargement..." />}

      <Dialog
        open={uploadDialogOpen}
        onOpenChange={(open) => {
          setUploadDialogOpen(open);
          if (!open) resetUploadDialog();
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{uploadDialogMode === "cra_facture" ? "Creer mon CRA/Facture" : "Deposer un document"}</DialogTitle>
            <DialogDescription>
              {uploadDialogMode === "cra_facture"
                ? "Choisis un type CRA ou Facture puis ajoute le fichier a deposer."
                : "Le depot peut etre libre ou rattache a une demande RH ouverte."}
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
                  {availableUploadDocumentTypes.map((documentType) => (
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
      <Dialog
        open={commentDialogOpen}
        onOpenChange={(open) => {
          setCommentDialogOpen(open);
          if (!open) setSelectedCommentDocument(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Commentaire RH</DialogTitle>
            <DialogDescription>
              {selectedCommentDocument ? `Document : ${selectedCommentDocument.fileName}` : "Commentaire lie au document"}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-[#0A1A2F]/85">
            {selectedCommentDocument?.comment ?? "Aucun commentaire RH."}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCommentDialogOpen(false);
                setSelectedCommentDocument(null);
              }}
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


