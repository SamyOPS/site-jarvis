"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";

import type { BillingProfileFormState } from "@/components/dashboard/billing-profile-card";
import type { SalarieInvoiceSettings } from "@/components/dashboard/salarie/cra-invoice-editor";
import type { LeaveRequestPayload } from "@/components/dashboard/salarie/leave-request-editor";
import { DashboardLoadingOverlay } from "@/components/dashboard/loading-overlay";
import { WorkspaceShell } from "@/components/dashboard/workspace-shell";
import { SALARIE_SIDEBAR } from "@/features/dashboard/shell/sidebar-config";
import { SalarieDocumentsSection } from "@/components/dashboard/salarie-documents-section";
import { SalarieOffersSection } from "@/components/dashboard/salarie-offers-section";
import { SalarieOverviewSection } from "@/components/dashboard/salarie-overview-section";
import { SalarieSettingsSection } from "@/components/dashboard/salarie-settings-section";
import type { MissionFormState, MissionItem } from "@/components/dashboard/missions-card";
import type { CalendarMission } from "@/components/dashboard/salarie/cra/work-days-calendar";
import type { InvoiceLineInput } from "@/features/dashboard/salarie/invoice-totals";
import { StatusNotice } from "@/components/dashboard/status-notice";
import { Button } from "@/components/ui/button";
import { useDocumentFolders } from "@/features/dashboard/documents/use-document-folders";
import { useDocumentPreview } from "@/features/dashboard/documents/use-document-preview";
import { usePasswordUpdate } from "@/features/dashboard/use-password-update";
import { createAuthorizedFetch } from "@/lib/dashboard-api";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  buildCalendarCells,
  buildWorkingDatesForMonth,
  craEntryHours,
  currentMonthInputValue,
  formatCraEntryDateLabel,
  formatCraPeriodLabel,
  shiftMonthInputValue,
  sortCraEntries,
  WEEKDAY_LABELS,
} from "@/domain/cra";
import { matchesSalarieDocumentFilters } from "@/features/dashboard/salarie/document-filters";
import type { SalarieWorkspaceRouteProps } from "@/features/dashboard/salarie/navigation";
import type { CraEntryDraft } from "@/domain/cra";
import type {
  CraSummaryRow,
  SalarieDocumentRow as DocumentRow,
  SalarieRequestRow as RequestRow,
} from "@/features/dashboard/salarie/types";
import type { TimeUnit } from "@/domain/common";
import { isPayslipDocumentLabel, normalizeDocumentLabel } from "@/domain/documents";
import type {
  DocumentRequestStatus,
  DocumentStatus,
  DocumentTypeRow,
} from "@/domain/documents";
import type { ProfileRow } from "@/domain/profiles";
import { formatDate, formatMonth, normalizeJoinOne } from "@/lib/dashboard-formatters";
import { browserSupabase as supabase } from "@/lib/supabase-browser";
import { forceClientSignOut, safeGetClientSession } from "@/lib/client-auth";

const emptyInvoiceSettings = (): SalarieInvoiceSettings => ({
  discountGranted: false,
  vatEnabled: false,
  amountAlreadyPaid: "",
  fraisKm: "",
  fraisRepas: "",
  fraisNuitee: "",
});

function toInvoiceAmount(value: string) {
  return value.trim() === "" ? 0 : Number(value);
}

const emptyBillingProfileForm = (): BillingProfileFormState => ({
  firstName: "",
  lastName: "",
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
  timeUnit: "day",
});

const weekdayLabels = WEEKDAY_LABELS;

const defaultRouteProps: SalarieWorkspaceRouteProps = {
  currentSection: "overview",
  currentSubSection: "offres_toutes",
};

type SalarieDashboardCache = {
  profileId: string;
  timestamp: number;
  documentTypes: DocumentTypeRow[];
  requests: RequestRow[];
  documents: DocumentRow[];
  applicationsCount: number;
  offersCount: number;
  hasCv: boolean;
};

const SALARIE_DASHBOARD_CACHE_TTL_MS = 2 * 60 * 1000;
let salarieDashboardCache: SalarieDashboardCache | null = null;

export default function SalarieWorkspace({
  currentSection = defaultRouteProps.currentSection,
  currentSubSection = defaultRouteProps.currentSubSection,
  craFactureTab,
}: SalarieWorkspaceRouteProps) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
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
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadDialogMode, setUploadDialogMode] = useState<"default" | "cra_facture">("default");
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [uploadDocumentTypeId, setUploadDocumentTypeId] = useState("");
  const [uploadPeriodMonth, setUploadPeriodMonth] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedCommentDocument, setSelectedCommentDocument] = useState<{ fileName: string; comment: string } | null>(null);
  const [savingDocumentId, setSavingDocumentId] = useState<string | null>(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const callSalarieApi = useMemo(() => createAuthorizedFetch("salarie"), []);
  const {
    folders,
    trashedFolders,
    currentFolderId,
    setCurrentFolderId,
    folderPath,

    createFolder,
    renameFolder,
    deleteFolder,
    restoreFolder,
    purgeFolder,
    moveDocumentToFolder,
    moveDocumentToRoot,
  } = useDocumentFolders<DocumentRow>({
    ownerUserId: profile?.id,
    callApi: callSalarieApi,
    onMessage: setActionMessage,
    onDocumentMoved: (document, folderId) =>
      setDocuments((current) =>
        current.map((row) => (row.id === document.id ? { ...row, folderId } : row)),
      ),
    showTrash: currentSubSection === "docs_corbeille",
  });
  const {
    viewingDocumentId,
    downloadingDocumentId,
    handleViewDocument,
    handleDownloadDocument,
  } = useDocumentPreview<DocumentRow>(setActionMessage);
  const {
    passwordForm,
    setPasswordForm,
    passwordMessage,
    passwordSaving,
    handlePasswordUpdate,
  } = usePasswordUpdate();
  const [billingProfileForm, setBillingProfileForm] = useState<BillingProfileFormState>(emptyBillingProfileForm);
  const [billingProfileReady, setBillingProfileReady] = useState(false);
  const [billingProfileLoading, setBillingProfileLoading] = useState(false);
  const [billingProfileSaving, setBillingProfileSaving] = useState(false);
  const [missions, setMissions] = useState<MissionItem[]>([]);
  const [missionsLoading, setMissionsLoading] = useState(false);
  const [missionsSaving, setMissionsSaving] = useState(false);
  const [missionsMessage, setMissionsMessage] = useState<string | null>(null);
  const [craItems, setCraItems] = useState<CraSummaryRow[]>([]);
  const [selectedCraId, setSelectedCraId] = useState<string | null>(null);
  // Mois affiche par le calendrier. La periode du document, elle, est deduite des
  // jours coches (voir craPeriodMonth plus bas) : il n'y a plus de champ periode.
  const [craCalendarMonth, setCraCalendarMonth] = useState(currentMonthInputValue);
  const [craNotes, setCraNotes] = useState("");
  const [craEntries, setCraEntries] = useState<CraEntryDraft[]>([]);
  const [invoiceSettings, setInvoiceSettings] = useState<SalarieInvoiceSettings>(
    emptyInvoiceSettings,
  );
  const [craGenerating, setCraGenerating] = useState(false);
  const [invoiceGenerating, setInvoiceGenerating] = useState(false);
  const [leaveGenerating, setLeaveGenerating] = useState(false);

  const applyDashboardCache = useCallback((cache: SalarieDashboardCache) => {
    setDocumentTypes(cache.documentTypes);
    setRequests(cache.requests);
    setDocuments(cache.documents);
    setApplicationsCount(cache.applicationsCount);
    setOffersCount(cache.offersCount);
    setHasCv(cache.hasCv);
  }, []);

  const loadDashboardData = useCallback(async (profileId: string, accessToken?: string) => {
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
        .select("id,status,file_name,created_at,updated_at,size_bytes,period_month,review_comment,storage_bucket,storage_path,folder_id,deleted_at,uploader_role,document_type:document_types(id,label),uploader:profiles!employee_documents_uploaded_by_fkey(full_name,email),folder:document_folders(id,deleted_at)")
        .eq("employee_id", profileId)
        .order("created_at", { ascending: false }),
      supabase.from("applications").select("id", { count: "exact", head: true }).eq("candidate_id", profileId),
      supabase.from("job_offers").select("id", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("profile_cvs").select("user_id").eq("user_id", profileId).maybeSingle(),
    ]);

    if (documentTypesRes.error || requestsRes.error || documentsRes.error || applicationsRes.error || offersRes.error || cvRes.error) {
      throw new Error(documentTypesRes.error?.message ?? requestsRes.error?.message ?? documentsRes.error?.message ?? applicationsRes.error?.message ?? offersRes.error?.message ?? cvRes.error?.message ?? "Erreur de chargement");
    }

    const effectiveAccessToken = accessToken ?? session?.access_token ?? null;
    const documentUploaderNamesByDocumentId = new Map<string, string>();
    const documentIds = (documentsRes.data ?? [])
      .map((row) => (row as { id: string }).id)
      .filter(Boolean);
    if (effectiveAccessToken && documentIds.length) {
      const uploadersResponse = await fetch("/api/salarie/documents/uploaders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${effectiveAccessToken}`,
        },
        body: JSON.stringify({ documentIds }),
      });
      if (uploadersResponse.ok) {
        const uploadersPayload = (await uploadersResponse.json().catch(() => null)) as
          | { items?: { documentId: string; uploaderName: string }[] }
          | null;
        for (const item of uploadersPayload?.items ?? []) {
          documentUploaderNamesByDocumentId.set(item.documentId, item.uploaderName);
        }
      }
    }

    const mappedDocumentTypes = ((documentTypesRes.data ?? []) as {
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
      .filter((row) => row.allowedUploaderRoles.length === 0 || row.allowedUploaderRoles.includes("salarie"));

    const mappedRequests = (requestsRes.data ?? []).map((row: {
      id: string;
      status: DocumentRequestStatus;
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
    });

    const mappedDocuments = (documentsRes.data ?? []).map((row: {
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
      folder_id: string | null;
      deleted_at: string | null;
      uploader_role: string | null;
      folder: { id: string; deleted_at: string | null } | { id: string; deleted_at: string | null }[] | null;
      document_type: { id: string; label: string } | { id: string; label: string }[] | null;
      uploader: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null;
    }) => {
      const documentType = normalizeJoinOne(row.document_type);
      const uploader = normalizeJoinOne(row.uploader);
      const folder = normalizeJoinOne(row.folder);
      return {
        id: row.id,
        documentTypeId: documentType?.id ?? "",
        folderId: row.folder_id,
        folderDeletedAt: folder?.deleted_at ?? null,
        deletedAt: row.deleted_at,
        uploaderRole: row.uploader_role,
        status: row.status,
        uploadedByName:
          uploader?.full_name ??
          uploader?.email ??
          documentUploaderNamesByDocumentId.get(row.id) ??
          "Utilisateur",
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
    });

    const nextCache: SalarieDashboardCache = {
      profileId,
      timestamp: Date.now(),
      documentTypes: mappedDocumentTypes,
      requests: mappedRequests,
      documents: mappedDocuments,
      applicationsCount: applicationsRes.count ?? 0,
      offersCount: offersRes.count ?? 0,
      hasCv: Boolean((cvRes.data as { user_id?: string } | null)?.user_id),
    };

    applyDashboardCache(nextCache);
    salarieDashboardCache = nextCache;
  }, [applyDashboardCache, session?.access_token]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const load = async () => {
      setError(null);
      const { session, error: sessionError } = await safeGetClientSession(client);
      if (sessionError) {
        setError(sessionError.message);
        return;
      }
      if (!session) {
        router.push("/auth");
        return;
      }
      setSession(session);
      setUser(session.user);
      const { data: profileData, error: profileError } = await client.from("profiles").select("id,email,full_name,role,professional_status").eq("id", session.user.id).single();
      if (profileError || !profileData || profileData.role !== "salarie" || profileData.professional_status !== "verified") {
        router.push("/auth");
        return;
      }
      setProfile(profileData);

      const now = Date.now();
      const canUseCache =
        salarieDashboardCache?.profileId === profileData.id &&
        now - (salarieDashboardCache?.timestamp ?? 0) < SALARIE_DASHBOARD_CACHE_TTL_MS;
      if (canUseCache && salarieDashboardCache) {
        applyDashboardCache(salarieDashboardCache);
        void loadDashboardData(profileData.id, session.access_token).catch(() => {});
        return;
      }
      setLoading(true);
      try {
        await loadDashboardData(profileData.id, session.access_token);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [applyDashboardCache, loadDashboardData, router]);

  const loadBillingProfile = useCallback(async () => {
    setBillingProfileLoading(true);
    try {
      // Toutes ces colonnes sont nullables en base : daily_rate / iban / bic / siret
      // ne concernent que les auto-entrepreneurs (migration optional_billing_fields),
      // et les autres peuvent etre vides sur un profil incomplet. On les traite donc
      // toutes comme nullables, et le formulaire ne manipule que des chaines.
      const payload = (await callSalarieApi("/api/salarie/billing-profile")) as {
        profile?: Partial<{
          first_name: string | null;
          last_name: string | null;
          company_name: string | null;
          esn_partenaire: string | null;
          address_line_1: string | null;
          address_line_2: string | null;
          postal_code: string | null;
          city: string | null;
          country: string | null;
          phone: string | null;
          email: string | null;
          siret: string | null;
          iban: string | null;
          bic: string | null;
          daily_rate: number | null;
          time_unit: string | null;
        }> | null;
      };

      if (!payload.profile) {
        setBillingProfileReady(false);
        setBillingProfileForm((prev) => ({
          ...prev,
          firstName: prev.firstName || "",
          lastName: prev.lastName || "",
          phone: prev.phone || "",
          email: prev.email || profile?.email || "",
        }));
        return;
      }

      setBillingProfileForm({
        firstName: payload.profile.first_name ?? "",
        lastName: payload.profile.last_name ?? "",
        addressLine1: payload.profile.address_line_1 ?? "",
        addressLine2: payload.profile.address_line_2 ?? "",
        postalCode: payload.profile.postal_code ?? "",
        city: payload.profile.city ?? "",
        country: payload.profile.country ?? "",
        phone: payload.profile.phone ?? "",
        email: payload.profile.email ?? "",
        siret: payload.profile.siret ?? "",
        iban: payload.profile.iban ?? "",
        bic: payload.profile.bic ?? "",
        timeUnit: payload.profile.time_unit === "hour" ? "hour" : "day",
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
      cra?: {
        id: string;
        period_month: string;
        notes: string | null;
        paid_leave_days?: number | null;
        sick_leave_days?: number | null;
        exceptional_leave_days?: number | null;
        unpaid_leave_days?: number | null;
      };
      entries?: {
        work_date: string;
        mission_id: string | null;
        absence_type: string | null;
        day_quantity: number | null;
        hours: number | null;
        label: string | null;
      }[];
    };
    if (!payload.cra) {
      throw new Error("CRA introuvable.");
    }

    setSelectedCraId(payload.cra.id);
    setCraCalendarMonth(payload.cra.period_month.slice(0, 7));
    setCraNotes(payload.cra.notes ?? "");
    // Les compteurs d'absence de `cra_records` ne sont plus rechargés : ils se déduisent
    // des lignes d'absence du calendrier, qui arrivent avec les entrées.
    setCraEntries(
      sortCraEntries(
        (payload.entries ?? []).map((entry) => ({
          workDate: entry.work_date,
          // Vide pour un CRA anterieur au multi-entreprises : la ligne retombe alors sur
          // l'unite du profil de facturation.
          missionId: entry.mission_id ?? "",
          absenceType: entry.absence_type ?? "",
          dayQuantity: entry.day_quantity === null || entry.day_quantity === undefined
            ? ""
            : String(entry.day_quantity),
          // Vide pour un CRA saisi en journees : craEntryHours retombe alors sur
          // l'equivalent de la quantite de jours.
          hours: entry.hours === null || entry.hours === undefined ? "" : String(entry.hours),
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
    if (!profile) return;

    const formData = new FormData();
    formData.append("file", args.file);
    formData.append("documentTypeId", args.documentTypeId);
    if (args.periodMonth) formData.append("periodMonth", args.periodMonth);
    if (currentFolderId) formData.append("folderId", currentFolderId);
    if (args.linkedRequestId) formData.append("linkedRequestId", args.linkedRequestId);

    try {
      await callSalarieApi("/api/salarie/documents/upload", {
        method: "POST",
        body: formData,
      });
      setActionMessage("Document depose avec succes.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Depot impossible.");
    }
    await loadDashboardData(profile.id);
  }, [callSalarieApi, currentFolderId, loadDashboardData, profile]);

  const resetUploadDialog = useCallback(() => {
    setUploadDialogMode("default");
    setSelectedRequestId("");
    setUploadDocumentTypeId("");
    setUploadPeriodMonth("");
    setUploadFile(null);
  }, []);

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

  const renameDocument = useCallback(async (document: DocumentRow) => {
    if (!supabase) return;
    if (document.status === "validated") {
      setActionMessage("Ce document est valide par le RH et ne peut plus etre modifie.");
      return;
    }

    const nextName = window.prompt("Nouveau nom du fichier", document.fileName);
    if (!nextName?.trim() || nextName.trim() === document.fileName.trim()) return;

    setSavingDocumentId(document.id);
    setActionMessage(null);

    const { error: updateError } = await supabase
      .from("employee_documents")
      .update({
        file_name: nextName.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", document.id);

    if (updateError) {
      setActionMessage(updateError.message);
      setSavingDocumentId(null);
      return;
    }

    setDocuments((current) =>
      current.map((row) =>
        row.id === document.id
          ? {
            ...row,
            fileName: nextName.trim(),
            updatedAt: new Date().toISOString(),
          }
          : row,
      ),
    );
    setSavingDocumentId(null);
    setActionMessage("Document renomme.");
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

  const handleDeleteDocument = useCallback(async (document: DocumentRow) => {
    if (!profile) return;
    if (document.status === "validated") {
      setActionMessage("Ce document est valide par le RH et ne peut plus etre supprime.");
      return;
    }
    if (!window.confirm(`Deplacer le document "${document.fileName}" dans la corbeille ?`)) {
      return;
    }

    setDeletingDocumentId(document.id);
    setActionMessage(null);

    try {
      await callSalarieApi(`/api/salarie/documents/${encodeURIComponent(document.id)}/trash`, {
        method: "POST",
      });
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Suppression du document impossible.");
      setDeletingDocumentId(null);
      return;
    }

    setActionMessage("Document deplace dans la corbeille.");
    setDeletingDocumentId(null);
    await loadDashboardData(profile.id);
  }, [callSalarieApi, loadDashboardData, profile]);

  const handleRestoreDocument = useCallback(async (document: DocumentRow) => {
    if (!supabase || !profile) return;

    setDeletingDocumentId(document.id);
    setActionMessage(null);

    const { error } = await supabase
      .from("employee_documents")
      .update({ deleted_at: null, updated_at: new Date().toISOString() })
      .eq("id", document.id);

    if (error) {
      setActionMessage(error.message);
      setDeletingDocumentId(null);
      return;
    }

    setActionMessage("Document restaure.");
    setDeletingDocumentId(null);
    await loadDashboardData(profile.id);
  }, [loadDashboardData, profile]);

  const handlePurgeDocument = useCallback(async (document: DocumentRow) => {
    if (!supabase || !profile) return;
    if (!window.confirm(`Supprimer definitivement le document "${document.fileName}" ?`)) {
      return;
    }

    setDeletingDocumentId(document.id);
    setActionMessage(null);

    // La suppression passe par l'API : elle seule verifie que le document n'a pas ete valide
    // par le RH et qu'il est bien dans la corbeille. En supprimant la ligne et le fichier
    // directement ici, ces deux regles etaient contournees.
    try {
      await callSalarieApi(`/api/salarie/documents/${document.id}`, { method: "DELETE" });
    } catch (deleteError) {
      setActionMessage(
        deleteError instanceof Error ? deleteError.message : "Suppression definitive impossible.",
      );
      setDeletingDocumentId(null);
      return;
    }

    setActionMessage("Document supprime definitivement.");
    setDeletingDocumentId(null);
    await loadDashboardData(profile.id);
  }, [callSalarieApi, loadDashboardData, profile]);

  // Un CRA couvre un seul mois : la periode est celle des jours coches, et a defaut
  // de selection celle du mois affiche. Declaree avant les callbacks de generation,
  // qui la referencent dans leurs dependances.
  const craPeriodMonth = useMemo(
    () => craEntries[0]?.workDate.slice(0, 7) ?? craCalendarMonth,
    [craCalendarMonth, craEntries],
  );

  // Unite de repli, issue du profil de facturation : elle ne sert plus qu'aux CRA
  // anterieurs au multi-entreprises, dont les lignes n'ont pas de mission.
  const fallbackTimeUnit: TimeUnit =
    billingProfileForm.timeUnit === "hour" ? "hour" : "day";

  /** Mission sur laquelle porte le prochain clic dans le calendrier. */
  const [activeMissionId, setActiveMissionId] = useState<string>("");
  /**
   * Type d'absence actif. Non vide, les clics pointent une absence au lieu d'une journee
   * travaillee — c'est le meme calendrier, on change seulement ce qu'on pose dessus.
   */
  const [activeAbsenceType, setActiveAbsenceType] = useState<string>("");

  /**
   * Travail et absence sont deux modes exclusifs : choisir une entreprise quitte
   * forcement le mode absence. Sans cela, la puce de l'entreprise s'allumait mais les
   * clics continuaient de poser des conges.
   */
  const selectMission = useCallback((missionId: string) => {
    setActiveAbsenceType("");
    setActiveMissionId(missionId);
  }, []);

  const selectAbsence = useCallback((absenceType: string) => {
    setActiveAbsenceType(absenceType);
  }, []);

  // La mission active suit la liste : premiere mission par defaut, et on ne reste jamais
  // sur une mission qui vient d'etre archivee.
  useEffect(() => {
    if (missions.length === 0) {
      if (activeMissionId) setActiveMissionId("");
      return;
    }
    if (!missions.some((mission) => mission.id === activeMissionId)) {
      setActiveMissionId(missions[0].id);
    }
  }, [activeMissionId, missions]);

  /** Unite d'une mission donnee, avec repli sur le profil. */
  const missionUnitOf = useCallback(
    (missionId: string): TimeUnit => {
      const mission = missions.find((item) => item.id === missionId);
      if (!mission) return fallbackTimeUnit;
      return mission.rate_unit === "hour" ? "hour" : "day";
    },
    [fallbackTimeUnit, missions],
  );

  const craTimeUnit = useMemo(
    () => missionUnitOf(activeMissionId),
    [activeMissionId, missionUnitOf],
  );

  /**
   * Une entree porte une seule quantite, celle de l'unite de sa mission : des heures, ou
   * des journees. L'autre champ reste vide — il n'y a plus de conversion entre les deux.
   */
  const buildCraEntry = useCallback(
    (workDate: string, quantity: number, missionId: string, label = ""): CraEntryDraft => {
      const isHourly = missionUnitOf(missionId) === "hour";
      return {
        workDate,
        missionId,
        absenceType: "",
        hours: isHourly ? String(quantity) : "",
        dayQuantity: isHourly ? "" : String(quantity),
        label,
      };
    },
    [missionUnitOf],
  );

  /** Une absence se compte toujours en journees, jamais en heures. */
  const buildAbsenceEntry = useCallback(
    (workDate: string, dayQuantity: number, absenceType: string, label = ""): CraEntryDraft => ({
      workDate,
      missionId: "",
      absenceType,
      hours: "",
      dayQuantity: String(dayQuantity),
      label,
    }),
    [],
  );

  /**
   * Quantite proposee au premier clic sur un jour.
   *
   * Au jour, c'est une journee pleine. A l'heure, il n'existe plus de base contractuelle :
   * on reprend la derniere valeur deja saisie pour cette mission dans le mois, ce qui rend
   * la saisie en serie naturelle sans reintroduire de reglage cache. A defaut, 1 h.
   */
  const defaultQuantityFor = useCallback(
    (missionId: string) => {
      if (missionUnitOf(missionId) !== "hour") return 1;
      const lastHours = [...craEntries]
        .reverse()
        .find((entry) => entry.missionId === missionId && Number(entry.hours) > 0);
      return lastHours ? Number(lastHours.hours) : 1;
    },
    [craEntries, missionUnitOf],
  );

  const resetCraEditor = useCallback(() => {
    setSelectedCraId(null);
    setCraCalendarMonth(currentMonthInputValue());
    setCraNotes("");
    setCraEntries([]);
    setInvoiceSettings(emptyInvoiceSettings());
  }, []);

  // La navigation du calendrier ne touche plus aux jours coches : les selections
  // d'un autre mois sont conservees au lieu d'etre silencieusement supprimees.
  const handleCraCalendarMonthChange = useCallback((nextCalendarMonth: string) => {
    setCraCalendarMonth(nextCalendarMonth);
  }, []);

  /**
   * Un CRA couvre un seul mois. Avant d'ajouter un jour hors du mois deja saisi,
   * on demande confirmation puis on remplace la selection. Renvoie false si le
   * salarie refuse.
   */
  const confirmCraMonthSwitch = useCallback(
    (targetMonth: string) => {
      const currentMonth = craEntries[0]?.workDate.slice(0, 7);
      if (!currentMonth || currentMonth === targetMonth) {
        return true;
      }

      return window.confirm(
        `Un CRA couvre un seul mois. Remplacer la selection de ${formatCraPeriodLabel(currentMonth)} par ${formatCraPeriodLabel(targetMonth)} ?`,
      );
    },
    [craEntries],
  );

  /**
   * Mode journee : un clic fait defiler la quantite, non coche -> 1 jour -> 1/2 journee
   * -> retire.
   * Mode horaire : un clic coche a la base contractuelle. Le second clic n'enchaine pas
   * sur la demi-journee, c'est le calendrier qui ouvre son editeur d'heures.
   */
  const cycleCraWorkDate = useCallback(
    (workDate: string, missionId: string = activeMissionId) => {
      // Mode absence : le cycle est plus simple — non pointe -> 1 j -> 1/2 j -> retire.
      if (activeAbsenceType) {
        const existingAbsence = craEntries.find(
          (entry) => entry.workDate === workDate && entry.absenceType,
        );

        if (!existingAbsence) {
          if (!confirmCraMonthSwitch(workDate.slice(0, 7))) return;
          setCraEntries((previousEntries) =>
            sortCraEntries([
              ...previousEntries.filter((entry) =>
                entry.workDate.startsWith(`${workDate.slice(0, 7)}-`),
              ),
              buildAbsenceEntry(workDate, 1, activeAbsenceType),
            ]),
          );
          return;
        }

        // Un autre type d'absence sur ce jour : on remplace, une seule absence par jour.
        if (existingAbsence.absenceType !== activeAbsenceType) {
          setCraEntries((previousEntries) =>
            sortCraEntries(
              previousEntries.map((entry) =>
                entry.workDate === workDate && entry.absenceType
                  ? { ...entry, absenceType: activeAbsenceType }
                  : entry,
              ),
            ),
          );
          return;
        }

        if (Number(existingAbsence.dayQuantity) === 1) {
          setCraEntries((previousEntries) =>
            sortCraEntries(
              previousEntries.map((entry) =>
                entry.workDate === workDate && entry.absenceType
                  ? { ...entry, dayQuantity: "0.5" }
                  : entry,
              ),
            ),
          );
          return;
        }

        setCraEntries((previousEntries) =>
          previousEntries.filter((entry) => !(entry.workDate === workDate && entry.absenceType)),
        );
        return;
      }

      const timeUnit = missionUnitOf(missionId);
      const existingEntry = craEntries.find(
        (entry) => entry.workDate === workDate && entry.missionId === missionId,
      );

      if (!existingEntry) {
        if (!confirmCraMonthSwitch(workDate.slice(0, 7))) return;
        const quantity = defaultQuantityFor(missionId);
        setCraEntries((previousEntries) => {
          const keptEntries = previousEntries.filter((entry) =>
            entry.workDate.startsWith(`${workDate.slice(0, 7)}-`),
          );
          return sortCraEntries([
            ...keptEntries,
            buildCraEntry(workDate, quantity, missionId),
          ]);
        });
        return;
      }

      if (timeUnit === "hour") return;

      if (Number(existingEntry.dayQuantity) === 1) {
        setCraEntries((previousEntries) =>
          sortCraEntries(
            previousEntries.map((entry) =>
              entry.workDate === workDate && entry.missionId === missionId
                ? { ...entry, dayQuantity: "0.5" }
                : entry,
            ),
          ),
        );
        return;
      }

      setCraEntries((previousEntries) =>
        previousEntries.filter(
          (entry) => !(entry.workDate === workDate && entry.missionId === missionId),
        ),
      );
    },
    [
      activeAbsenceType,
      activeMissionId,
      buildAbsenceEntry,
      buildCraEntry,
      confirmCraMonthSwitch,
      craEntries,
      defaultQuantityFor,
      missionUnitOf,
    ],
  );

  /** Saisie horaire d'un jour deja coche. La quantite de jours suit automatiquement. */
  const setCraEntryHours = useCallback(
    (workDate: string, hours: number, missionId: string = activeMissionId) => {
      if (!Number.isFinite(hours) || hours <= 0) return;
      const cappedHours = Math.min(24, hours);
      setCraEntries((previousEntries) => {
        const exists = previousEntries.some(
          (entry) => entry.workDate === workDate && entry.missionId === missionId,
        );
        // Saisir des heures sur une journee non cochee pour cette entreprise l'ajoute :
        // c'est ainsi qu'on repartit une journee entre plusieurs entreprises.
        if (!exists) {
          return sortCraEntries([
            ...previousEntries,
            buildCraEntry(workDate, cappedHours, missionId),
          ]);
        }
        return sortCraEntries(
          previousEntries.map((entry) =>
            entry.workDate === workDate && entry.missionId === missionId
              ? { ...entry, hours: String(cappedHours), dayQuantity: "" }
              : entry,
          ),
        );
      });
    },
    [activeMissionId, buildCraEntry],
  );

  /** Saisie en jours d'une entreprise sur une date, meme si elle n'y figure pas encore. */
  const setCraEntryDayQuantity = useCallback(
    (workDate: string, dayQuantity: number, missionId: string = activeMissionId) => {
      if (!Number.isFinite(dayQuantity) || dayQuantity <= 0) {
        setCraEntries((previousEntries) =>
          previousEntries.filter(
            (entry) => !(entry.workDate === workDate && entry.missionId === missionId),
          ),
        );
        return;
      }
      const capped = Math.min(1, dayQuantity);
      setCraEntries((previousEntries) => {
        const exists = previousEntries.some(
          (entry) => entry.workDate === workDate && entry.missionId === missionId,
        );
        if (!exists) {
          return sortCraEntries([...previousEntries, buildCraEntry(workDate, capped, missionId)]);
        }
        return sortCraEntries(
          previousEntries.map((entry) =>
            entry.workDate === workDate && entry.missionId === missionId
              ? { ...entry, dayQuantity: String(capped), hours: "" }
              : entry,
          ),
        );
      });
    },
    [activeMissionId, buildCraEntry],
  );

  /** Retire une entreprise d'une journee, ou la journee entiere si aucune n'est precisee. */
  const removeCraWorkDate = useCallback((workDate: string, missionId?: string) => {
    setCraEntries((previousEntries) =>
      previousEntries.filter((entry) =>
        entry.workDate !== workDate
          ? true
          : missionId === undefined
            ? false
            : entry.missionId !== missionId,
      ),
    );
  }, []);

  /** Applique le meme volume horaire a tous les jours coches de la mission active. */
  const applyCraHoursToAllEntries = useCallback(
    (hours: number) => {
      if (!Number.isFinite(hours) || hours <= 0) return;
      const cappedHours = Math.min(24, hours);
      setCraEntries((previousEntries) =>
        previousEntries.map((entry) =>
          entry.missionId === activeMissionId
            ? { ...entry, hours: String(cappedHours), dayQuantity: "" }
            : entry,
        ),
      );
    },
    [activeMissionId],
  );

  const fillCraWorkingDays = useCallback(() => {
    if (!confirmCraMonthSwitch(craCalendarMonth)) return;

    const workingDates = buildWorkingDatesForMonth(craCalendarMonth);
    const quantity = defaultQuantityFor(activeMissionId);
    setCraEntries((previousEntries) => {
      // Ne concerne que la mission active : les jours des autres entreprises restent.
      const missionDates = new Set(
        previousEntries
          .filter((entry) => entry.missionId === activeMissionId)
          .map((entry) => entry.workDate),
      );
      const added = workingDates
        .filter((workDate) => !missionDates.has(workDate))
        .map((workDate) => buildCraEntry(workDate, quantity, activeMissionId));
      return sortCraEntries([...previousEntries, ...added]);
    });
  }, [
    activeMissionId,
    buildCraEntry,
    confirmCraMonthSwitch,
    craCalendarMonth,
    defaultQuantityFor,
  ]);

  const clearCraEntries = useCallback(() => {
    setCraEntries([]);
  }, []);

  const handleSelectCra = useCallback(
    async (craId: string) => {
      try {
        setActionMessage(null);
        await loadCraDetail(craId);
      } catch (error) {
        setActionMessage(error instanceof Error ? error.message : "Chargement du CRA impossible.");
      }
    },
    [loadCraDetail],
  );

  const updateCraEntry = useCallback(
    (workDate: string, patch: Partial<CraEntryDraft>, missionId?: string) => {
      setCraEntries((previousEntries) =>
        sortCraEntries(
          previousEntries.map((entry) =>
            entry.workDate === workDate &&
            (missionId === undefined || entry.missionId === missionId)
              ? { ...entry, ...patch }
              : entry,
          ),
        ),
      );
    },
    [],
  );

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

  const loadMissions = useCallback(async () => {
    try {
      setMissionsLoading(true);
      const payload = (await callSalarieApi("/api/salarie/missions")) as {
        items?: MissionItem[];
      } | null;
      setMissions(payload?.items ?? []);
    } catch (error) {
      setMissionsMessage(
        error instanceof Error ? error.message : "Chargement des entreprises impossible.",
      );
    } finally {
      setMissionsLoading(false);
    }
  }, [callSalarieApi]);

  const handleMissionSave = useCallback(
    async (form: MissionFormState) => {
      try {
        setMissionsSaving(true);
        setMissionsMessage(null);
        const body = JSON.stringify({
          companyName: form.companyName,
          esnPartenaire: form.esnPartenaire,
          rate: form.rate,
          rateUnit: form.rateUnit,
        });
        await callSalarieApi(
          form.id ? `/api/salarie/missions/${form.id}` : "/api/salarie/missions",
          {
            method: form.id ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body,
          },
        );
        setMissionsMessage(form.id ? "Entreprise mise a jour." : "Entreprise ajoutee.");
        await loadMissions();
      } catch (error) {
        setMissionsMessage(
          error instanceof Error ? error.message : "Enregistrement de l'entreprise impossible.",
        );
      } finally {
        setMissionsSaving(false);
      }
    },
    [callSalarieApi, loadMissions],
  );

  const handleMissionDelete = useCallback(
    async (missionId: string) => {
      const mission = missions.find((item) => item.id === missionId);
      if (
        !window.confirm(
          `Retirer l'entreprise "${mission?.company_name ?? ""}" ? Les CRA deja saisis la conservent.`,
        )
      ) {
        return;
      }

      try {
        setMissionsSaving(true);
        setMissionsMessage(null);
        const payload = (await callSalarieApi(`/api/salarie/missions/${missionId}`, {
          method: "DELETE",
        })) as { archived?: boolean } | null;
        setMissionsMessage(
          payload?.archived
            ? "Entreprise archivee : elle reste visible sur les CRA passes."
            : "Entreprise supprimee.",
        );
        await loadMissions();
      } catch (error) {
        setMissionsMessage(
          error instanceof Error ? error.message : "Suppression de l'entreprise impossible.",
        );
      } finally {
        setMissionsSaving(false);
      }
    },
    [callSalarieApi, loadMissions, missions],
  );

  const upsertCraRecord = useCallback(async () => {
    if (!billingProfileReady) {
      throw new Error("Renseigne d'abord ton profil de facturation.");
    }

    // Les compteurs d'absence ne sont plus envoyes : le serveur les deduit des jours
    // pointes sur le calendrier, ils ne peuvent donc pas diverger du detail.
    const payload = {
      periodMonth: craPeriodMonth,
      notes: craNotes,
      entries: craEntries.filter((entry) => entry.workDate.trim()).map((entry) => {
        if (entry.absenceType) {
          return {
            workDate: entry.workDate,
            absenceType: entry.absenceType,
            dayQuantity: Number(entry.dayQuantity || 0),
            label: entry.label,
          };
        }
        const isHourly = missionUnitOf(entry.missionId) === "hour";
        return {
          workDate: entry.workDate,
          missionId: entry.missionId || null,
          // Une seule des deux quantites part : celle de l'unite de la mission. Une ligne
          // saisie en journees garde `hours` a NULL en base, et inversement.
          dayQuantity: isHourly ? null : Number(entry.dayQuantity || 0),
          hours: isHourly ? craEntryHours(entry) : null,
          label: entry.label,
        };
      }),
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
  }, [billingProfileReady, callSalarieApi, craEntries, craNotes, craPeriodMonth, loadCraDetail, loadCraItems, missionUnitOf, selectedCraId]);

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
      // `hours` et `missionId` sont indispensables : sans eux, la generation echouait pour
      // toute mission facturee a l'heure, parseCraEntries exigeant les heures.
      // Les absences sont ecartees : elles ne se facturent pas.
      entries: craEntries.filter((entry) => entry.workDate.trim() && !entry.absenceType).map((entry) => {
        const isHourly = missionUnitOf(entry.missionId) === "hour";
        return {
          workDate: entry.workDate,
          missionId: entry.missionId || null,
          // Une seule des deux quantites part : celle de l'unite de la mission.
          dayQuantity: isHourly ? null : Number(entry.dayQuantity || 0),
          hours: isHourly ? craEntryHours(entry) : null,
          label: entry.label,
        };
      }),
      discountGranted: invoiceSettings.discountGranted,
      vatEnabled: invoiceSettings.vatEnabled,
      amountAlreadyPaid: toInvoiceAmount(invoiceSettings.amountAlreadyPaid),
      fraisKm: toInvoiceAmount(invoiceSettings.fraisKm),
      fraisRepas: toInvoiceAmount(invoiceSettings.fraisRepas),
      fraisNuitee: toInvoiceAmount(invoiceSettings.fraisNuitee),
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
  }, [callSalarieApi, craEntries, craPeriodMonth, invoiceSettings, loadDashboardData, missionUnitOf, profile]);

  const handleGenerateLeavePdf = useCallback(
    async (payload: LeaveRequestPayload) => {
      try {
        setLeaveGenerating(true);
        setActionMessage(null);
        await callSalarieApi("/api/salarie/conge/generate-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        await (profile ? loadDashboardData(profile.id) : Promise.resolve());
        setActionMessage("Demande de congé generee et ajoutee aux documents.");
      } catch (error) {
        setActionMessage(error instanceof Error ? error.message : "Generation de la demande de congé impossible.");
      } finally {
        setLeaveGenerating(false);
      }
    },
    [callSalarieApi, loadDashboardData, profile],
  );

  const pendingRequests = useMemo(() => requests.filter((request) => ["pending", "rejected", "expired"].includes(request.status)), [requests]);
  const selectedUploadType = useMemo(
    () => documentTypes.find((documentType) => documentType.id === uploadDocumentTypeId) ?? null,
    [documentTypes, uploadDocumentTypeId],
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
  const folderList = useMemo(
    () => [...folders].sort((left, right) => left.name.localeCompare(right.name, "fr")),
    [folders],
  );
  const activeDocuments = useMemo(
    () => documents.filter((document) => !document.deletedAt && !document.folderDeletedAt),
    [documents],
  );
  const trashedDocuments = useMemo(
    () => documents.filter((document) => Boolean(document.deletedAt)),
    [documents],
  );
  const filteredDocuments = useMemo(() => {
    if (currentSubSection === "docs_cra_facture") {
      return activeDocuments.filter((document) => {
        const normalizedLabel = normalizeDocumentLabel(document.typeLabel);
        return normalizedLabel.includes("cra") || normalizedLabel.includes("facture");
      });
    }
    if (currentSubSection === "docs_fiches_paie") {
      return activeDocuments.filter((document) => isPayslipDocumentLabel(document.typeLabel));
    }
    if (currentSubSection === "docs_tous") {
      if (!currentFolderId) {
        return activeDocuments.filter(
          (document) => (document.folderId ?? null) === null || document.uploaderRole === "rh",
        );
      }
      return activeDocuments.filter(
        (document) => (document.folderId ?? null) === currentFolderId && document.uploaderRole !== "rh",
      );
    }
    return activeDocuments;
  }, [activeDocuments, currentFolderId, currentSubSection]);
  const documentTypeOptions = useMemo(
    () => {
      const options = new Set(filteredDocuments.map((document) => document.typeLabel));
      if (currentSubSection === "docs_tous" || currentSubSection === "docs_corbeille") {
        options.add("Dossier");
      }
      return Array.from(options).sort((left, right) => left.localeCompare(right, "fr"));
    },
    [currentSubSection, filteredDocuments],
  );
  const documentPeriodOptions = useMemo(
    () => Array.from(new Set(filteredDocuments.map((document) => document.periodMonth ?? "__none__"))).sort((left, right) => left.localeCompare(right)),
    [filteredDocuments],
  );
  const visibleDocuments = useMemo(
    () =>
      filteredDocuments.filter((document) =>
        matchesSalarieDocumentFilters(document, {
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
      : currentSubSection === "docs_fiches_paie"
        ? "Mes fiches de paie"
        : currentSubSection === "docs_cra_facture"
          ? "CRA & Facture"
          : currentSubSection === "docs_conge"
            ? "Demande de congé"
            : currentSubSection === "docs_corbeille"
              ? "Corbeille"
              : "Mes documents";
  const showFolderTrash = currentSubSection === "docs_corbeille";
  const selectedCraSummary = useMemo(
    () => craItems.find((item) => item.id === selectedCraId) ?? null,
    [craItems, selectedCraId],
  );
  /** Une date peut desormais porter plusieurs entreprises. */
  const craEntriesByDate = useMemo(() => {
    const byDate = new Map<string, CraEntryDraft[]>();
    for (const entry of craEntries) {
      byDate.set(entry.workDate, [...(byDate.get(entry.workDate) ?? []), entry]);
    }
    return byDate;
  }, [craEntries]);

  /**
   * Totaux par entreprise, dans l'unite de chacune. C'est ce decoupage qui permet de
   * melanger une mission au jour et une mission a l'heure sur un meme mois : chaque
   * ligne de facture est ensuite valorisee avec son propre tarif.
   */
  const craTotalsByMission = useMemo(() => {
    const totals = new Map<string, { quantity: number; unit: TimeUnit }>();
    for (const entry of craEntries) {
      // Les absences ne sont pas facturees : elles n'entrent dans aucune ligne.
      if (entry.absenceType) continue;
      const unit = missionUnitOf(entry.missionId);
      const current = totals.get(entry.missionId) ?? { quantity: 0, unit };
      totals.set(entry.missionId, {
        unit,
        quantity:
          current.quantity +
          (unit === "hour" ? craEntryHours(entry) : Number(entry.dayQuantity) || 0),
      });
    }
    return totals;
  }, [craEntries, missionUnitOf]);

  /** Total des heures, missions horaires seulement. */
  const craDraftTotalHours = useMemo(
    () => craEntries.reduce((total, entry) => total + craEntryHours(entry), 0),
    [craEntries],
  );
  /** Total des journees travaillees, missions au jour seulement. Absences exclues. */
  const craDraftTotalDays = useMemo(
    () =>
      craEntries.reduce(
        (total, entry) =>
          entry.absenceType || missionUnitOf(entry.missionId) === "hour"
            ? total
            : total + (Number(entry.dayQuantity) || 0),
        0,
      ),
    [craEntries, missionUnitOf],
  );

  /** Totaux d'absence par type, deduits du calendrier. */
  const craAbsenceTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const entry of craEntries) {
      if (!entry.absenceType) continue;
      totals.set(
        entry.absenceType,
        (totals.get(entry.absenceType) ?? 0) + (Number(entry.dayQuantity) || 0),
      );
    }
    return totals;
  }, [craEntries]);
  /** Missions dans la forme attendue par le calendrier. */
  const craMissions = useMemo<CalendarMission[]>(
    () =>
      missions.map((mission) => ({
        id: mission.id,
        companyName: mission.company_name,
        timeUnit: missionUnitOf(mission.id),
      })),
    [missionUnitOf, missions],
  );

  /**
   * Lignes de la facture : une par entreprise saisie, avec sa quantite dans son unite et
   * son propre tarif. C'est ce decoupage qui permet de facturer une entreprise a l'heure
   * et une autre au jour sur la meme facture.
   */
  const craInvoiceLines = useMemo<InvoiceLineInput[]>(
    () =>
      Array.from(craTotalsByMission.entries())
        .map(([missionId, total]) => {
          const mission = missions.find((item) => item.id === missionId);
          return {
            missionId,
            label: mission?.company_name ?? "Sans entreprise",
            quantity: total.quantity,
            rate: Number(mission?.rate ?? 0),
            unit: total.unit,
          };
        })
        .filter((line) => line.quantity > 0),
    [craTotalsByMission, missions],
  );

  const craCalendarCells = useMemo(() => buildCalendarCells(craCalendarMonth), [craCalendarMonth]);
  const displayName = useMemo(() => {
    const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string; display_name?: string };
    return meta.full_name ?? meta.name ?? meta.display_name ?? profile?.full_name ?? profile?.email ?? "utilisateur";
  }, [profile?.email, profile?.full_name, user?.user_metadata]);

  const handleSignOut = useCallback(async () => {
    if (!supabase) return;
    setSession(null);
    setUser(null);
    setProfile(null);
    await forceClientSignOut(supabase);
    router.push("/auth?logged_out=1");
  }, [router]);

  useEffect(() => {
    if (!profile) return;

    if (currentSubSection === "docs_cra_facture" || currentSection === "parametres") {
      void loadBillingProfile().catch((error) => {
        setActionMessage(error instanceof Error ? error.message : "Chargement du profil de facturation impossible.");
      });
      // Les missions portent l'entreprise, le tarif et l'unite : la page CRA en a besoin
      // autant que les parametres.
      void loadMissions();
    }

    if (currentSubSection === "docs_cra_facture") {
      void loadCraItems().catch((error) => {
        setActionMessage(error instanceof Error ? error.message : "Chargement des CRA impossible.");
      });
    }
  }, [currentSection, currentSubSection, loadBillingProfile, loadCraItems, loadMissions, profile]);

  return (
    <WorkspaceShell
      nav={SALARIE_SIDEBAR}
      currentSection={currentSection}
      currentSubSection={currentSubSection}
      roleLabel="Espace salarie"
      settingsHref="/dashboard/salarie/parametres"
      searchPlaceholder="Rechercher dans l'espace salarie"
      email={profile?.email ?? user?.email ?? "-"}
      displayName={displayName}
      onSignOut={handleSignOut}
    >
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
              documentsCount={activeDocuments.length}
              validatedDocumentsCount={activeDocuments.filter((document) => document.status === "validated").length}
              pendingRequests={pendingRequests}
              action={
                <Button type="button" variant="outline" size="sm" onClick={() => openUploadDialog()}>
                  Deposer un document
                </Button>
              }
            />
          )}          {currentSection === "documents" && (
            <SalarieDocumentsSection
              storageScope={user?.id ?? profile?.id ?? null}
              preferencesAuthToken={session?.access_token ?? null}
              currentSubSection={currentSubSection}
              documentsCardTitle={documentsCardTitle}
              craFactureTab={craFactureTab}
              billingProfileReady={billingProfileReady}
              selectedCraId={selectedCraId}
              selectedCraSummary={selectedCraSummary}
              craItems={craItems}
              onSelectCra={handleSelectCra}
              resetCraEditor={resetCraEditor}
              onGenerateCraPdf={handleGenerateCraPdf}
              onGenerateInvoicePdf={handleGenerateInvoicePdf}
              craGenerating={craGenerating}
              invoiceGenerating={invoiceGenerating}
              leaveGenerating={leaveGenerating}
              onGenerateLeavePdf={handleGenerateLeavePdf}
              craCalendarMonth={craCalendarMonth}
              craPeriodMonth={craPeriodMonth}
              onCraCalendarMonthChange={handleCraCalendarMonthChange}
              shiftMonthInputValue={shiftMonthInputValue}
              craDraftTotalDays={craDraftTotalDays}
              craNotes={craNotes}
              onCraNotesChange={setCraNotes}
              invoice={invoiceSettings}
              onInvoiceChange={setInvoiceSettings}
              weekdayLabels={weekdayLabels}
              craCalendarCells={craCalendarCells}
              craEntriesByDate={craEntriesByDate}
              craEntries={craEntries}
              onCycleCraWorkDate={cycleCraWorkDate}
              onFillCraWorkingDays={fillCraWorkingDays}
              onClearCraEntries={clearCraEntries}
              craTimeUnit={craTimeUnit}
              craDraftTotalHours={craDraftTotalHours}
              onSetCraEntryHours={setCraEntryHours}
              onSetCraEntryDayQuantity={setCraEntryDayQuantity}
              onRemoveCraWorkDate={removeCraWorkDate}
              craMissions={craMissions}
              activeMissionId={activeMissionId}
              onSelectMission={selectMission}
              craInvoiceLines={craInvoiceLines}
              activeAbsenceType={activeAbsenceType}
              onSelectAbsence={selectAbsence}
              craAbsenceTotals={craAbsenceTotals}
              onApplyCraHoursToAllEntries={applyCraHoursToAllEntries}
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
              onRenameDocument={renameDocument}
              onOpenCommentDialog={openCommentDialog}
              viewingDocumentId={viewingDocumentId}
              downloadingDocumentId={downloadingDocumentId}
              deletingDocumentId={deletingDocumentId}
              savingDocumentId={savingDocumentId}
              pendingRequests={pendingRequests}
              openUploadDialog={openUploadDialog}
              currentFolderId={currentFolderId}
              folders={folderList}
              trashedFolders={trashedFolders}
              trashedDocuments={trashedDocuments}
              folderPath={folderPath}
              showFolderTrash={showFolderTrash}
              onNavigateFolder={setCurrentFolderId}
              onCreateFolder={createFolder}
              onMoveDocumentToFolder={moveDocumentToFolder}
              onMoveDocumentToRoot={moveDocumentToRoot}
              onRenameFolder={renameFolder}
              onDeleteFolder={deleteFolder}
              onRestoreFolder={restoreFolder}
              onPurgeFolder={purgeFolder}
              onRestoreDocument={handleRestoreDocument}
              onPurgeDocument={handlePurgeDocument}
            />
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
              missions={missions}
              onMissionSave={handleMissionSave}
              onMissionDelete={handleMissionDelete}
              missionsSaving={missionsSaving}
              missionsLoading={missionsLoading}
              missionsMessage={missionsMessage}
            />
          )}
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
    </WorkspaceShell>
  );
}

