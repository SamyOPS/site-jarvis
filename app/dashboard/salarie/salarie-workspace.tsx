"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Session, User } from "@supabase/supabase-js";
import { LogOut, Search, SlidersHorizontal } from "lucide-react";

import type { BillingProfileFormState } from "@/components/dashboard/billing-profile-card";
import { DashboardLoadingOverlay } from "@/components/dashboard/loading-overlay";
import { DashboardProfileMenu } from "@/components/dashboard/profile-menu";
import { SalarieDocumentsSection } from "@/components/dashboard/salarie-documents-section";
import { SalarieOffersSection } from "@/components/dashboard/salarie-offers-section";
import { SalarieOverviewSection } from "@/components/dashboard/salarie-overview-section";
import { SalarieSettingsSection } from "@/components/dashboard/salarie-settings-section";
import { StatusNotice } from "@/components/dashboard/status-notice";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  buildCalendarCells,
  currentMonthInputValue,
  formatCraEntryDateLabel,
  shiftMonthInputValue,
  sortCraEntries,
  WEEKDAY_LABELS,
} from "@/features/dashboard/salarie/cra";
import { matchesSalarieDocumentFilters, normalizeDocumentLabel } from "@/features/dashboard/salarie/document-filters";
import type { SalarieWorkspaceRouteProps } from "@/features/dashboard/salarie/navigation";
import type {
  CraEntryDraft,
  CraSummaryRow,
  DocumentFolderRow,
  SalarieDocumentRow as DocumentRow,
  SalarieDocumentTypeRow as DocumentTypeRow,
  SalarieProfileRow as ProfileRow,
  SalarieRequestRow as RequestRow,
  SalarieRequestStatus as RequestStatus,
} from "@/features/dashboard/salarie/types";
import { formatDate, formatDocumentStatus, formatMonth, normalizeJoinOne, type DocumentStatus } from "@/lib/dashboard-formatters";
import { buildEmployeeDocumentPath } from "@/lib/document-storage";
import { browserSupabase as supabase } from "@/lib/supabase-browser";
import { forceClientSignOut, safeGetClientSession } from "@/lib/client-auth";

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
}: SalarieWorkspaceRouteProps) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [folders, setFolders] = useState<DocumentFolderRow[]>([]);
  const [trashedFolders, setTrashedFolders] = useState<DocumentFolderRow[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
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
  const [invoiceDiscountGranted, setInvoiceDiscountGranted] = useState(false);
  const [invoiceAmountAlreadyPaid, setInvoiceAmountAlreadyPaid] = useState("");
  const [craGenerating, setCraGenerating] = useState(false);
  const [invoiceGenerating, setInvoiceGenerating] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

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

  const callSalarieApi = useCallback(async (path: string, init?: RequestInit) => {
    if (!supabase) {
      throw new Error("Configuration Supabase manquante.");
    }

    const { session, error } = await safeGetClientSession(supabase);
    const accessToken = session?.access_token;
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
    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? ((await response.json().catch(() => null)) as { error?: string } | null)
      : null;
    const rawMessage = !payload
      ? (await response.text().catch(() => "")).trim()
      : "";
    if (!response.ok) {
      const fallbackMessage = `Requete salarie impossible (${response.status}).`;
      throw new Error(
        payload?.error ??
          (rawMessage ? `${fallbackMessage} ${rawMessage}` : fallbackMessage),
      );
    }
    return payload;
  }, []);

  const loadFolders = useCallback(async (ownerUserId: string, trash = false) => {
    const payload = (await callSalarieApi(
      `/api/documents/folders?ownerUserId=${encodeURIComponent(ownerUserId)}&all=1${trash ? "&trash=1" : ""}`,
    )) as {
      items?: {
        id: string;
        owner_user_id: string;
        name: string;
        parent_id: string | null;
        deleted_at: string | null;
        created_at: string | null;
        updated_at: string | null;
      }[];
    };
    const mapped = (payload.items ?? []).map((row) => ({
      id: row.id,
      ownerUserId: row.owner_user_id,
      name: row.name,
      parentId: row.parent_id,
      deletedAt: row.deleted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
    if (trash) {
      setTrashedFolders(mapped);
      return;
    }
    setFolders(mapped);
  }, [callSalarieApi]);

  const createFolder = useCallback(async () => {
    if (!profile?.id) return;
    const folderName = window.prompt("Nom du dossier");
    if (!folderName?.trim()) return;
    await callSalarieApi("/api/documents/folders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ownerUserId: profile.id,
        name: folderName.trim(),
        parentId: null,
      }),
    });
    await Promise.all([loadFolders(profile.id), loadFolders(profile.id, true)]);
    setActionMessage("Dossier cree.");
  }, [callSalarieApi, loadFolders, profile?.id]);

  const moveDocumentToFolder = useCallback(
    async (document: DocumentRow, folderId: string) => {
      if (!profile?.id) return;

      await callSalarieApi(`/api/documents/items/${encodeURIComponent(document.id)}/move`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ownerUserId: profile.id,
          folderId,
        }),
      });

      setDocuments((current) =>
        current.map((row) =>
          row.id === document.id
            ? {
              ...row,
              folderId,
            }
            : row,
        ),
      );
      setActionMessage("Document deplace dans le dossier.");
    },
    [callSalarieApi, profile?.id],
  );
  const moveDocumentToRoot = useCallback(
    async (document: DocumentRow) => {
      if (!profile?.id) return;
      await callSalarieApi(`/api/documents/items/${encodeURIComponent(document.id)}/move`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ownerUserId: profile.id,
          folderId: null,
        }),
      });

      setDocuments((current) =>
        current.map((row) =>
          row.id === document.id
            ? {
              ...row,
              folderId: null,
            }
            : row,
        ),
      );
      setActionMessage("Document deplace a la racine.");
    },
    [callSalarieApi, profile?.id],
  );

  const renameFolder = useCallback(
    async (folderId: string, currentName: string) => {
      if (!profile?.id) return;
      const nextName = window.prompt("Nouveau nom du dossier", currentName);
      if (!nextName?.trim() || nextName.trim() === currentName.trim()) return;

      await callSalarieApi(`/api/documents/folders/${encodeURIComponent(folderId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: nextName.trim(),
        }),
      });

      await Promise.all([loadFolders(profile.id), loadFolders(profile.id, true)]);
      setActionMessage("Dossier renomme.");
    },
    [callSalarieApi, loadFolders, profile?.id],
  );

  const deleteFolder = useCallback(
    async (folderId: string) => {
      if (!profile?.id) return;
      const confirmed = window.confirm("Supprimer ce dossier ?");
      if (!confirmed) return;

      await callSalarieApi(`/api/documents/folders/${encodeURIComponent(folderId)}`, {
        method: "DELETE",
      });

      await Promise.all([loadFolders(profile.id), loadFolders(profile.id, true)]);
      if (currentFolderId === folderId) {
        setCurrentFolderId(null);
      }
      setActionMessage("Dossier supprime.");
    },
    [callSalarieApi, currentFolderId, loadFolders, profile?.id],
  );

  const restoreFolder = useCallback(
    async (folderId: string) => {
      if (!profile?.id) return;
      await callSalarieApi(`/api/documents/folders/${encodeURIComponent(folderId)}/restore`, {
        method: "POST",
      });
      await Promise.all([loadFolders(profile.id), loadFolders(profile.id, true)]);
      setActionMessage("Dossier restaure.");
    },
    [callSalarieApi, loadFolders, profile?.id],
  );

  const purgeFolder = useCallback(
    async (folderId: string) => {
      if (!profile?.id) return;
      const confirmed = window.confirm("Supprimer definitivement ce dossier et tout son contenu ?");
      if (!confirmed) return;
      await callSalarieApi(`/api/documents/folders/${encodeURIComponent(folderId)}/purge`, {
        method: "DELETE",
      });
      await Promise.all([loadFolders(profile.id), loadFolders(profile.id, true)]);
      setActionMessage("Dossier supprime definitivement.");
    },
    [callSalarieApi, loadFolders, profile?.id],
  );

  useEffect(() => {
    if (!profile?.id) return;
    void Promise.all([loadFolders(profile.id), loadFolders(profile.id, true)]).catch((loadError) => {
      setActionMessage(loadError instanceof Error ? loadError.message : "Chargement des dossiers impossible.");
    });
  }, [loadFolders, profile?.id]);

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
        folder_id: currentFolderId,
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
  }, [currentFolderId, loadDashboardData, profile, user]);

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
        folder_id: document.folderId,
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

    const { error: eventsDeleteError } = await supabase
      .from("document_events")
      .delete()
      .eq("document_id", document.id);
    if (eventsDeleteError) {
      setActionMessage(eventsDeleteError.message);
      setDeletingDocumentId(null);
      return;
    }

    const { error: documentDeleteError } = await supabase
      .from("employee_documents")
      .delete()
      .eq("id", document.id);
    if (documentDeleteError) {
      setActionMessage(documentDeleteError.message);
      setDeletingDocumentId(null);
      return;
    }

    if (document.storagePath) {
      await supabase.storage.from(document.storageBucket).remove([document.storagePath]);
    }

    setActionMessage("Document supprime definitivement.");
    setDeletingDocumentId(null);
    await loadDashboardData(profile.id);
  }, [loadDashboardData, profile]);

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
    setInvoiceDiscountGranted(false);
    setInvoiceAmountAlreadyPaid("");
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
      discountGranted: invoiceDiscountGranted,
      amountAlreadyPaid: invoiceAmountAlreadyPaid.trim() === "" ? 0 : Number(invoiceAmountAlreadyPaid),
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
  }, [callSalarieApi, craEntries, craPeriodMonth, invoiceAmountAlreadyPaid, invoiceDiscountGranted, loadDashboardData, profile]);

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
  const folderList = useMemo(
    () => [...folders].sort((left, right) => left.name.localeCompare(right.name, "fr")),
    [folders],
  );
  const folderPath = useMemo(() => {
    const byId = new Map(folders.map((folder) => [folder.id, folder]));
    const path: DocumentFolderRow[] = [];
    let cursor = currentFolderId;
    while (cursor) {
      const folder = byId.get(cursor);
      if (!folder) break;
      path.unshift(folder);
      cursor = folder.parentId ?? null;
    }
    return path;
  }, [currentFolderId, folders]);
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
      : currentSubSection === "docs_cra_facture"
        ? "CRA & Facture"
        : currentSubSection === "docs_corbeille"
          ? "Corbeille"
          : "Mes documents";
  const showFolderTrash = currentSubSection === "docs_corbeille";
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
  }, [currentSection, currentSubSection]);

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

  useEffect(() => {
    if (currentFolderId && !folders.some((folder) => folder.id === currentFolderId)) {
      setCurrentFolderId(null);
    }
  }, [currentFolderId, folders]);

  useEffect(() => {
    if (showFolderTrash && currentFolderId) {
      setCurrentFolderId(null);
    }
  }, [currentFolderId, showFolderTrash]);

  const handleSignOut = useCallback(async () => {
    if (!supabase) return;
    setProfileMenuOpen(false);
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
    }

    if (currentSubSection === "docs_cra_facture") {
      void loadCraItems().catch((error) => {
        setActionMessage(error instanceof Error ? error.message : "Chargement des CRA impossible.");
      });
    }
  }, [currentSection, currentSubSection, loadBillingProfile, loadCraItems, profile]);

  return (
    <div className="h-screen overflow-hidden bg-[#f3f6fc] text-[#0A1A2F]">
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
                  <Link href="/dashboard/salarie/documents/corbeille" className={`block py-1 ${currentSubSection === "docs_corbeille" ? "font-semibold" : ""}`}>Corbeille</Link>
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

        <aside className="hidden lg:fixed lg:inset-y-0 lg:right-0 lg:block lg:w-[48px]">
          <div className="flex h-full items-stretch justify-center px-2 py-5" />
        </aside>

        <main className="flex h-full flex-col overflow-hidden px-2 py-2 lg:ml-[232px] lg:mr-[48px] lg:px-3 lg:py-3">
          <div className="hidden lg:flex items-center rounded-[22px] px-2 py-1.5">
            <div className="flex min-w-0 flex-1 items-center">
              <div className="flex w-full max-w-lg items-center gap-3 rounded-full border border-white/70 bg-white/70 px-5 py-3 backdrop-blur">
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

          <div className="mt-2 min-h-0 flex-1 overflow-y-auto rounded-[22px] border border-white/70 bg-white px-4 py-6 overscroll-contain lg:px-8 lg:py-8">
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
              formatDate={formatDate}
              formatMonth={formatMonth}
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
              invoiceDiscountGranted={invoiceDiscountGranted}
              onInvoiceDiscountGrantedChange={setInvoiceDiscountGranted}
              invoiceAmountAlreadyPaid={invoiceAmountAlreadyPaid}
              onInvoiceAmountAlreadyPaidChange={setInvoiceAmountAlreadyPaid}
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
              formatDate={formatDate}
              formatMonth={formatMonth}
              formatDocumentStatus={formatDocumentStatus}
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





