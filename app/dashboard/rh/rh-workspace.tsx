"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Session, User } from "@supabase/supabase-js";
import { ChevronDown, LogOut, Pencil, Search, SlidersHorizontal } from "lucide-react";

import { DashboardLoadingOverlay } from "@/components/dashboard/loading-overlay";
import { DashboardDocumentList } from "@/components/dashboard/document-list";
import { DocumentFiltersBar } from "@/components/dashboard/document-filters-bar";
import { RhOffersSection } from "@/components/dashboard/rh-offers-section";
import { RhDocumentsSection } from "@/components/dashboard/rh-documents-section";
import { DashboardProfileMenu } from "@/components/dashboard/profile-menu";
import { RhOverviewSection } from "@/components/dashboard/rh-overview-section";
import { RhSettingsSection } from "@/components/dashboard/rh-settings-section";
import { StatusNotice } from "@/components/dashboard/status-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  buildCalendarCells,
  currentMonthInputValue,
  sortCraEntries,
} from "@/features/dashboard/salarie/cra";
import { matchesRhDocumentFilters } from "@/features/dashboard/rh/document-filters";
import type { RhWorkspaceRouteProps } from "@/features/dashboard/rh/navigation";
import type { CraEntryDraft } from "@/features/dashboard/salarie/types";
import type {
  RhApplicationRow as ApplicationRow,
  RhDocumentRow as RHDocumentRow,
  RhDocumentFolderRow,
  RhDocumentTypeRow as DocumentTypeRow,
  RhEventRow as EventRow,
  RhJobOfferRow as JobOfferRow,
  RhProfileCvRow as ProfileCvRow,
  RhProfileRow as ProfileRow,
  RhRequestRow as RequestRow,
  RhRequestStatus as RequestStatus,
} from "@/features/dashboard/rh/types";
import { formatDate, formatDocumentStatus, formatMonth, normalizeJoinOne, type DocumentStatus } from "@/lib/dashboard-formatters";
import { forceClientSignOut, safeGetClientSession } from "@/lib/client-auth";
import { browserSupabase as supabase } from "@/lib/supabase-browser";

const defaultRouteProps: RhWorkspaceRouteProps = {
  currentSection: "overview",
  currentSubSection: "overview",
  selectedEmployeeId: null,
};

type RhDashboardCache = {
  profileId: string;
  timestamp: number;
  employees: ProfileRow[];
  documentTypes: DocumentTypeRow[];
  documents: RHDocumentRow[];
  requests: RequestRow[];
  jobOffers: JobOfferRow[];
  applications: ApplicationRow[];
  cvsByUser: Record<string, ProfileCvRow>;
  activityByEmployeeId: Record<
    string,
    {
      userId: string;
      lastSignInAt: string | null;
      createdAt: string | null;
      updatedAt: string | null;
      emailConfirmedAt: string | null;
    }
  >;
  events: EventRow[];
};

const RH_DASHBOARD_CACHE_TTL_MS = 2 * 60 * 1000;
let rhDashboardCache: RhDashboardCache | null = null;

export default function RhWorkspace({
  currentSection = defaultRouteProps.currentSection,
  currentSubSection = defaultRouteProps.currentSubSection,
  selectedEmployeeId = defaultRouteProps.selectedEmployeeId,
}: RhWorkspaceRouteProps) {
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [employees, setEmployees] = useState<ProfileRow[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeRow[]>([]);
  const [documents, setDocuments] = useState<RHDocumentRow[]>([]);
  const [rhFolders, setRhFolders] = useState<RhDocumentFolderRow[]>([]);
  const [trashedRhFolders, setTrashedRhFolders] = useState<RhDocumentFolderRow[]>([]);
  const [currentRhFolderId, setCurrentRhFolderId] = useState<string | null>(null);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [documentTypeFilter, setDocumentTypeFilter] = useState("all");
  const [documentPeriodFilter, setDocumentPeriodFilter] = useState("all");
  const [documentStatusFilter, setDocumentStatusFilter] = useState("all");
  const [documentCreatorFilter, setDocumentCreatorFilter] = useState("all");
  const [jobOffers, setJobOffers] = useState<JobOfferRow[]>([]);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [cvsByUser, setCvsByUser] = useState<Record<string, ProfileCvRow>>({});
  const [activityByEmployeeId, setActivityByEmployeeId] = useState<
    Record<
      string,
      {
        userId: string;
        lastSignInAt: string | null;
        createdAt: string | null;
        updatedAt: string | null;
        emailConfirmedAt: string | null;
      }
    >
  >({});
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
  const [collabDetailSection, setCollabDetailSection] = useState<"demandes" | "documents" | "candidatures">("documents");
  const [collabDocumentsMenuOpen, setCollabDocumentsMenuOpen] = useState(false);
  const [collabDocTypeFilter, setCollabDocTypeFilter] = useState("all");
  const [collabDocPeriodFilter, setCollabDocPeriodFilter] = useState("all");
  const [collabDocStatusFilter, setCollabDocStatusFilter] = useState("all");
  const [collabDocOwnerFilter, setCollabDocOwnerFilter] = useState("all");
  const [rhUploadDialogOpen, setRhUploadDialogOpen] = useState(false);
  const [rhUploadEmployeeId, setRhUploadEmployeeId] = useState("");
  const [rhUploadDocumentTypeId, setRhUploadDocumentTypeId] = useState("");
  const [rhUploadPeriodMonth, setRhUploadPeriodMonth] = useState("");
  const [rhUploadFile, setRhUploadFile] = useState<File | null>(null);
  const [uploadingRhDocument, setUploadingRhDocument] = useState(false);
  const [generateEmployeeId, setGenerateEmployeeId] = useState("");
  const [generateBillingProfileEmployeeId, setGenerateBillingProfileEmployeeId] = useState("");
  const [craPeriodMonth, setCraPeriodMonth] = useState(currentMonthInputValue());
  const [craNotes, setCraNotes] = useState("");
  const [craEntries, setCraEntries] = useState<CraEntryDraft[]>([]);
  const [craGenerating, setCraGenerating] = useState(false);
  const [invoiceGenerating, setInvoiceGenerating] = useState(false);
  const [billingProfiles, setBillingProfiles] = useState<
    { employeeId: string; profileLabel: string; employeeName: string; dailyRate: number; updatedAt: string | null }[]
  >([]);
  const [deletingRhDocumentId, setDeletingRhDocumentId] = useState<string | null>(null);
  const [isEmployeeEditMode, setIsEmployeeEditMode] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const collabDocumentsMenuRef = useRef<HTMLDivElement | null>(null);

  const applyDashboardCache = useCallback((cache: RhDashboardCache) => {
    setEmployees(cache.employees);
    setDocumentTypes(cache.documentTypes);
    setDocuments(cache.documents);
    setRequests(cache.requests);
    setJobOffers(cache.jobOffers);
    setApplications(cache.applications);
    setCvsByUser(cache.cvsByUser);
    setActivityByEmployeeId(cache.activityByEmployeeId);
    setEvents(cache.events);
  }, []);

  const loadDashboardData = useCallback(async (
    rhId: string,
    accessToken: string,
    rhIdentity?: { id: string; fullName: string | null; email: string },
  ) => {
    if (!supabase) return;

    const visibilityResponse = await fetch("/api/rh/collaborators/visibility", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const visibilityPayload = (await visibilityResponse.json().catch(() => null)) as
      | { error?: string; restricted?: boolean; employeeIds?: string[] }
      | null;
    if (!visibilityResponse.ok) {
      setError(visibilityPayload?.error ?? "Chargement des affectations RH impossible.");
      return;
    }

    const isRestricted = visibilityPayload?.restricted === true;
    const assignedSet = new Set(visibilityPayload?.employeeIds ?? []);
    const canAccessEmployee = (employeeId: string) =>
      !isRestricted || assignedSet.has(employeeId);

    const [employeesRes, documentTypesRes, docsRes, requestsRes, offersRes, appsRes, cvsRes, activityResponse] = await Promise.all([
      supabase.from("profiles").select("id,email,full_name,phone,role,professional_status,employment_status,company_name,esn_partenaire").eq("role", "salarie").order("email", { ascending: true }),
      supabase.from("document_types").select("id,label,requires_period,allowed_uploader_roles").eq("active", true).order("label", { ascending: true }),
      supabase.from("employee_documents").select("id,status,file_name,period_month,created_at,updated_at,size_bytes,review_comment,uploader_role,uploaded_by,storage_bucket,storage_path,source_kind,folder_id,deleted_at,document_type:document_types(id,label,code),employee:profiles!employee_documents_employee_id_fkey(id,full_name,email,role),uploader:profiles!employee_documents_uploaded_by_fkey(full_name,email)").order("created_at", { ascending: false }),
      supabase.from("document_requests").select("id,status,due_at,period_month,note,document_type:document_types(id,label),employee:profiles!document_requests_employee_id_fkey(id,full_name,email)").order("created_at", { ascending: false }),
      supabase.from("job_offers").select("id,title,status,location").order("created_at", { ascending: false }),
      supabase.from("applications").select("id,candidate_id,status,job:job_offers(title),candidate:profiles!applications_candidate_id_fkey(full_name,email)").order("created_at", { ascending: false }),
      supabase.from("profile_cvs").select("user_id,file_name"),
      fetch("/api/rh/collaborators/activity", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),
    ]);

    if (employeesRes.error || documentTypesRes.error || docsRes.error || requestsRes.error || offersRes.error || appsRes.error || cvsRes.error) {
      setError(employeesRes.error?.message ?? documentTypesRes.error?.message ?? docsRes.error?.message ?? requestsRes.error?.message ?? offersRes.error?.message ?? appsRes.error?.message ?? cvsRes.error?.message ?? "Erreur RH");
      return;
    }

    const rhUploaderIds = Array.from(
      new Set(
        (docsRes.data ?? [])
          .map((row) => {
            const item = row as { uploader_role?: string | null; uploaded_by?: string | null };
            if (item.uploader_role !== "rh") return null;
            return item.uploaded_by ?? null;
          })
          .filter((value): value is string => Boolean(value)),
      ),
    );
    const rhUploadersById = new Map<string, { fullName: string | null; email: string }>();
    if (rhUploaderIds.length) {
      const uploadersResponse = await fetch("/api/rh/documents/uploaders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ ids: rhUploaderIds }),
      });
      if (uploadersResponse.ok) {
        const uploadersPayload = (await uploadersResponse.json().catch(() => null)) as
          | { items?: { id: string; fullName: string | null; email: string }[] }
          | null;
        for (const uploader of uploadersPayload?.items ?? []) {
          rhUploadersById.set(uploader.id, {
            fullName: uploader.fullName,
            email: uploader.email,
          });
        }
      }
    }

    const mappedEmployees = ((employeesRes.data as ProfileRow[]) ?? []).filter((employee) => canAccessEmployee(employee.id));
    const mappedDocumentTypes = ((documentTypesRes.data ?? []) as {
      id: string;
      label: string;
      requires_period: boolean | null;
      allowed_uploader_roles: string[] | null;
    }[]).map((row) => ({
        id: row.id,
        label: row.label,
        requiresPeriod: Boolean(row.requires_period),
        allowedUploaderRoles: row.allowed_uploader_roles ?? [],
      }));

    const mappedAllDocuments = (docsRes.data ?? []).map((row: { id: string; status: DocumentStatus; file_name: string; period_month: string | null; created_at: string | null; updated_at: string | null; size_bytes: number | null; review_comment: string | null; uploader_role: string | null; uploaded_by: string | null; storage_bucket: string | null; storage_path: string | null; source_kind: string | null; folder_id: string | null; deleted_at: string | null; document_type: { id: string; label: string; code: string | null } | { id: string; label: string; code: string | null }[] | null; employee: { id: string; full_name: string | null; email: string; role: string | null } | { id: string; full_name: string | null; email: string; role: string | null }[] | null; uploader: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null }) => {
      const employee = normalizeJoinOne(row.employee);
      const type = normalizeJoinOne(row.document_type);
      const uploader = normalizeJoinOne(row.uploader);
      const uploaderProfile = row.uploaded_by
        ? rhUploadersById.get(row.uploaded_by)
        : null;
      const isCurrentRhUploader = row.uploader_role === "rh" && row.uploaded_by === rhIdentity?.id;
      const employeeName =
        row.uploader_role === "rh" && employee?.role !== "salarie"
          ? "Aucun collaborateur"
          : employee?.full_name ?? employee?.email ?? "Utilisateur";
      const uploadedByName =
        uploader?.full_name ??
        uploader?.email ??
        uploaderProfile?.fullName ??
        uploaderProfile?.email ??
        (isCurrentRhUploader
          ? (rhIdentity?.fullName ?? rhIdentity?.email ?? null)
          : null) ??
        (row.uploader_role === "salarie" ? employeeName : "Utilisateur");
      return {
        id: row.id,
        employeeId: employee?.id ?? "",
        folderId: row.folder_id,
        deletedAt: row.deleted_at,
        employeeRole: employee?.role ?? null,
        documentTypeId: type?.id ?? "",
        documentTypeCode: type?.code ?? "",
        uploaderRole: row.uploader_role ?? "",
        uploadedByName,
        employeeName,
        fileName: row.file_name,
        status: row.status,
        periodMonth: row.period_month,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        sizeBytes: row.size_bytes,
        reviewComment: row.review_comment,
        typeLabel: type?.label ?? "Document",
        storageBucket: row.storage_bucket ?? "employee-documents",
        storagePath: row.storage_path ?? "",
        sourceKind: row.source_kind ?? "uploaded",
      } satisfies RHDocumentRow;
    });
    const filteredDocuments = mappedAllDocuments.filter((document) => {
      if (!document.employeeId) return false;
      if (document.employeeRole !== "salarie") {
        return document.employeeId === rhId;
      }
      return canAccessEmployee(document.employeeId);
    });
    const mappedDocuments = filteredDocuments;

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
    const filteredRequests = mappedRequests.filter((request) => request.employeeId && canAccessEmployee(request.employeeId));
    const mappedJobOffers = (offersRes.data ?? []) as JobOfferRow[];
    const mappedApplications = (appsRes.data ?? []).map((row: { id: string; candidate_id: string; status: ApplicationRow["status"]; job: { title: string | null } | { title: string | null }[] | null; candidate: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null }) => {
      const job = normalizeJoinOne(row.job);
      const candidate = normalizeJoinOne(row.candidate);
      return { id: row.id, candidateId: row.candidate_id, status: row.status, jobTitle: job?.title ?? "Offre", candidateName: candidate?.full_name ?? candidate?.email ?? "Candidat" } satisfies ApplicationRow;
    }).filter((application) => canAccessEmployee(application.candidateId));
    const mappedCvsByUser = Object.fromEntries(((cvsRes.data ?? []) as ProfileCvRow[]).map((row) => [row.user_id, row]));
    const activityPayload = (await activityResponse.json().catch(() => null)) as
      | {
          error?: string;
          items?: {
            userId: string;
            lastSignInAt: string | null;
            createdAt: string | null;
            updatedAt: string | null;
            emailConfirmedAt: string | null;
          }[];
        }
      | null;
    const mappedActivityByEmployeeId = activityResponse.ok
      ? Object.fromEntries((activityPayload?.items ?? []).map((item) => [item.userId, item]))
      : {};
    if (!activityResponse.ok && activityPayload?.error) {
      setSaveMessage(activityPayload.error);
    }

    const documentIds = filteredDocuments.map((document) => document.id);
    if (!documentIds.length) {
      const nextCache: RhDashboardCache = {
        profileId: rhId,
        timestamp: Date.now(),
        employees: mappedEmployees,
        documentTypes: mappedDocumentTypes,
        documents: mappedDocuments,
        requests: filteredRequests,
        jobOffers: mappedJobOffers,
        applications: mappedApplications,
        cvsByUser: mappedCvsByUser,
        activityByEmployeeId: mappedActivityByEmployeeId,
        events: [],
      };
      applyDashboardCache(nextCache);
      rhDashboardCache = nextCache;
      return;
    }

    const { data: eventsData, error: eventsError } = await supabase.from("document_events").select("id,created_at,event_type,actor:profiles(full_name,email),document:employee_documents(id,file_name,document_type:document_types(label))").in("document_id", documentIds).order("created_at", { ascending: false }).limit(40);
    if (eventsError) {
      setError(eventsError.message);
      return;
    }
    const documentsById = Object.fromEntries(filteredDocuments.map((document) => [document.id, document]));
    const mappedEvents = (eventsData ?? []).map((row: { id: string; created_at: string; event_type: string; actor: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null; document: { id: string; file_name: string | null; document_type: { label: string } | { label: string }[] | null } | { id: string; file_name: string | null; document_type: { label: string } | { label: string }[] | null }[] | null }) => {
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
    }).filter((row) => row.employeeId);

    const nextCache: RhDashboardCache = {
      profileId: rhId,
      timestamp: Date.now(),
      employees: mappedEmployees,
      documentTypes: mappedDocumentTypes,
      documents: mappedDocuments,
      requests: filteredRequests,
      jobOffers: mappedJobOffers,
      applications: mappedApplications,
      cvsByUser: mappedCvsByUser,
      activityByEmployeeId: mappedActivityByEmployeeId,
      events: mappedEvents,
    };
    applyDashboardCache(nextCache);
    rhDashboardCache = nextCache;
  }, [applyDashboardCache]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const load = async () => {
      setError(null);
      const { session: currentSession, error: sessionError } = await safeGetClientSession(client);
      if (sessionError) {
        setError(sessionError.message);
        return;
      }
      if (!currentSession) {
        router.push("/auth");
        return;
      }
      setSession(currentSession);
      setUser(currentSession.user);
      const { data: profileData, error: profileError } = await client.from("profiles").select("id,email,full_name,phone,role,professional_status,employment_status,company_name,esn_partenaire").eq("id", currentSession.user.id).single();
      if (profileError || !profileData || profileData.role !== "rh" || profileData.professional_status !== "verified") {
        router.push("/auth");
        return;
      }
      setProfile(profileData);
      const now = Date.now();
      const canUseCache =
        rhDashboardCache?.profileId === profileData.id &&
        now - (rhDashboardCache?.timestamp ?? 0) < RH_DASHBOARD_CACHE_TTL_MS;
      if (canUseCache && rhDashboardCache) {
        applyDashboardCache(rhDashboardCache);
        void loadDashboardData(profileData.id, currentSession.access_token, {
          id: profileData.id,
          fullName: profileData.full_name,
          email: profileData.email,
        }).catch(() => {});
        return;
      }
      setLoading(true);
      try {
        await loadDashboardData(profileData.id, currentSession.access_token, {
          id: profileData.id,
          fullName: profileData.full_name,
          email: profileData.email,
        });
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [applyDashboardCache, loadDashboardData, router]);

  const displayName = useMemo(() => {
    const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string; display_name?: string };
    return meta.full_name ?? meta.name ?? meta.display_name ?? profile?.full_name ?? profile?.email ?? "utilisateur";
  }, [profile?.email, profile?.full_name, user?.user_metadata]);

  useEffect(() => {
    setProfileMenuOpen(false);
  }, [currentSection, currentSubSection, selectedEmployeeId]);
  useEffect(() => {
    setIsEmployeeEditMode(false);
  }, [currentSubSection, selectedEmployeeId]);
  useEffect(() => {
    setCollabDetailSection("documents");
    setCollabDocumentsMenuOpen(false);
  }, [selectedEmployeeId]);
  useEffect(() => {
    setCollabDocTypeFilter("all");
    setCollabDocPeriodFilter("all");
    setCollabDocStatusFilter("all");
    setCollabDocOwnerFilter("all");
  }, [selectedEmployeeId]);
  useEffect(() => {
    if (!generateEmployeeId) return;
    const hasCurrent = billingProfiles.some(
      (profileItem) => profileItem.employeeId === generateBillingProfileEmployeeId,
    );
    if (hasCurrent) return;
    const employeeDefault = billingProfiles.find(
      (profileItem) => profileItem.employeeId === generateEmployeeId,
    );
    if (employeeDefault) {
      setGenerateBillingProfileEmployeeId(employeeDefault.employeeId);
    }
  }, [billingProfiles, generateBillingProfileEmployeeId, generateEmployeeId]);

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
    if (!collabDocumentsMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!collabDocumentsMenuRef.current?.contains(event.target as Node)) {
        setCollabDocumentsMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCollabDocumentsMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [collabDocumentsMenuOpen]);

  const selectedEmployee = useMemo(() => employees.find((employee) => employee.id === selectedEmployeeId) ?? null, [employees, selectedEmployeeId]);
  const resetEmployeeDraft = useCallback((employee: ProfileRow) => {
    setEmployeeDrafts((prev) => ({
      ...prev,
      [employee.id]: {
        full_name: employee.full_name ?? "",
        phone: employee.phone ?? "",
        company_name: employee.company_name ?? "",
        esn_partenaire: employee.esn_partenaire ?? "",
        employment_status: employee.employment_status ?? "active",
      },
    }));
  }, []);
  const isRecentlyActive = useCallback((employeeId: string) => {
    const lastSignInAt = activityByEmployeeId[employeeId]?.lastSignInAt;
    if (!lastSignInAt) return false;
    const timestamp = new Date(lastSignInAt).getTime();
    if (Number.isNaN(timestamp)) return false;
    return Date.now() - timestamp <= 15 * 60 * 1000;
  }, [activityByEmployeeId]);
  const formatLastSignIn = useCallback((employeeId: string) => {
    const lastSignInAt = activityByEmployeeId[employeeId]?.lastSignInAt;
    if (!lastSignInAt) return "Jamais connecte";
    const date = new Date(lastSignInAt);
    if (Number.isNaN(date.getTime())) return "Date inconnue";
    return date.toLocaleString();
  }, [activityByEmployeeId]);
  const refreshDashboardData = useCallback(async () => {
    if (!profile?.id || !profile.email || !session?.access_token) return;
    await loadDashboardData(profile.id, session.access_token, {
      id: profile.id,
      fullName: profile.full_name,
      email: profile.email,
    });
  }, [loadDashboardData, profile?.email, profile?.full_name, profile?.id, session?.access_token]);
  const callRhDocumentsApi = useCallback(async (path: string, init?: RequestInit) => {
    if (!session?.access_token) {
      throw new Error("Session RH manquante.");
    }

    const response = await fetch(path, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? ((await response.json().catch(() => null)) as { error?: string } | null)
      : null;
    const rawMessage = !payload ? (await response.text().catch(() => "")).trim() : "";
    if (!response.ok) {
      const fallbackMessage = `Requete RH impossible (${response.status}).`;
      throw new Error(payload?.error ?? (rawMessage ? `${fallbackMessage} ${rawMessage}` : fallbackMessage));
    }
    return payload;
  }, [session?.access_token]);
  const loadBillingProfiles = useCallback(async () => {
    const payload = (await callRhDocumentsApi("/api/rh/billing-profiles")) as {
      items?: {
        employeeId: string;
        profileLabel: string;
        employeeName: string;
        dailyRate: number;
        updatedAt: string | null;
      }[];
    };
    setBillingProfiles(payload.items ?? []);
  }, [callRhDocumentsApi]);

  const loadRhFolders = useCallback(async (ownerUserId: string, trash = false) => {
    const payload = (await callRhDocumentsApi(
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
      setTrashedRhFolders(mapped);
      return;
    }
    setRhFolders(mapped);
  }, [callRhDocumentsApi]);

  const createRhFolder = useCallback(async () => {
    if (!profile?.id) return;
    const folderName = window.prompt("Nom du dossier");
    if (!folderName?.trim()) return;
    await callRhDocumentsApi("/api/documents/folders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ownerUserId: profile.id,
        name: folderName.trim(),
        parentId: currentRhFolderId,
      }),
    });
    await Promise.all([loadRhFolders(profile.id), loadRhFolders(profile.id, true)]);
    setSaveMessage("Dossier cree.");
  }, [callRhDocumentsApi, currentRhFolderId, loadRhFolders, profile?.id]);

  const renameRhFolder = useCallback(async (folderId: string, currentName: string) => {
    if (!profile?.id) return;
    const nextName = window.prompt("Nouveau nom du dossier", currentName);
    if (!nextName?.trim() || nextName.trim() === currentName.trim()) return;
    await callRhDocumentsApi(`/api/documents/folders/${encodeURIComponent(folderId)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: nextName.trim() }),
    });
    await Promise.all([loadRhFolders(profile.id), loadRhFolders(profile.id, true)]);
    setSaveMessage("Dossier renomme.");
  }, [callRhDocumentsApi, loadRhFolders, profile?.id]);

  const deleteRhFolder = useCallback(async (folderId: string) => {
    if (!profile?.id) return;
    const confirmed = window.confirm("Supprimer ce dossier ?");
    if (!confirmed) return;

    await callRhDocumentsApi(`/api/documents/folders/${encodeURIComponent(folderId)}`, {
      method: "DELETE",
    });
    await Promise.all([loadRhFolders(profile.id), loadRhFolders(profile.id, true)]);
    if (currentRhFolderId === folderId) {
      setCurrentRhFolderId(null);
    }
    await refreshDashboardData();
    setSaveMessage("Dossier supprime.");
  }, [callRhDocumentsApi, currentRhFolderId, loadRhFolders, profile?.id, refreshDashboardData]);

  const restoreRhFolder = useCallback(async (folderId: string) => {
    if (!profile?.id) return;
    await callRhDocumentsApi(`/api/documents/folders/${encodeURIComponent(folderId)}/restore`, {
      method: "POST",
    });
    await Promise.all([loadRhFolders(profile.id), loadRhFolders(profile.id, true)]);
    setSaveMessage("Dossier restaure.");
  }, [callRhDocumentsApi, loadRhFolders, profile?.id]);

  const purgeRhFolder = useCallback(async (folderId: string) => {
    if (!profile?.id) return;
    const confirmed = window.confirm("Supprimer definitivement ce dossier et tout son contenu ?");
    if (!confirmed) return;
    await callRhDocumentsApi(`/api/documents/folders/${encodeURIComponent(folderId)}/purge`, {
      method: "DELETE",
    });
    await Promise.all([loadRhFolders(profile.id), loadRhFolders(profile.id, true)]);
    setSaveMessage("Dossier supprime definitivement.");
  }, [callRhDocumentsApi, loadRhFolders, profile?.id]);

  const moveRhDocumentToFolder = useCallback(async (document: RHDocumentRow, folderId: string) => {
    if (!profile?.id) return;
    await callRhDocumentsApi(`/api/documents/items/${encodeURIComponent(document.id)}/move`, {
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
    setSaveMessage("Document deplace dans le dossier.");
  }, [callRhDocumentsApi, profile?.id]);
  const moveRhDocumentToRoot = useCallback(async (document: RHDocumentRow) => {
    if (!profile?.id) return;
    await callRhDocumentsApi(`/api/documents/items/${encodeURIComponent(document.id)}/move`, {
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
    setSaveMessage("Document deplace a la racine.");
  }, [callRhDocumentsApi, profile?.id]);

  useEffect(() => {
    if (!profile?.id || !session?.access_token) return;
    void Promise.all([loadRhFolders(profile.id), loadRhFolders(profile.id, true)]).catch((loadError) => {
      setSaveMessage(loadError instanceof Error ? loadError.message : "Chargement des dossiers impossible.");
    });
  }, [loadRhFolders, profile?.id, session?.access_token]);
  useEffect(() => {
    if (currentSection !== "documents" || !session?.access_token) return;
    void loadBillingProfiles().catch((error) => {
      setSaveMessage(error instanceof Error ? error.message : "Chargement des profils de facturation impossible.");
    });
  }, [currentSection, loadBillingProfiles, session?.access_token]);
  const activeDraft = useMemo(() => {
    if (!selectedEmployee) return null;
    return employeeDrafts[selectedEmployee.id] ?? { full_name: selectedEmployee.full_name ?? "", phone: selectedEmployee.phone ?? "", company_name: selectedEmployee.company_name ?? "", esn_partenaire: selectedEmployee.esn_partenaire ?? "", employment_status: selectedEmployee.employment_status ?? "active" };
  }, [employeeDrafts, selectedEmployee]);
  const selectedEmployeeDocuments = useMemo(
    () => documents.filter((document) => document.employeeId === selectedEmployeeId && !document.deletedAt),
    [documents, selectedEmployeeId],
  );
  const selectedEmployeeDocumentFilterOptions = useMemo(
    () => ({
      type: Array.from(new Set(selectedEmployeeDocuments.map((document) => document.typeLabel)))
        .sort((left, right) => left.localeCompare(right, "fr"))
        .map((value) => ({ value, label: value })),
      period: Array.from(
        new Set(selectedEmployeeDocuments.map((document) => document.periodMonth ?? "__none__")),
      )
        .sort((left, right) => left.localeCompare(right))
        .map((value) => ({
          value,
          label: value === "__none__" ? "Sans periode" : formatMonth(value),
        })),
      status: [
        { value: "pending", label: "En attente" },
        { value: "validated", label: "Valide" },
        { value: "rejected", label: "Refuse" },
      ],
      owner: Array.from(new Set(selectedEmployeeDocuments.map((document) => document.uploadedByName)))
        .sort((left, right) => left.localeCompare(right, "fr"))
        .map((value) => ({ value, label: value })),
    }),
    [formatMonth, selectedEmployeeDocuments],
  );
  const filteredSelectedEmployeeDocuments = useMemo(
    () =>
      selectedEmployeeDocuments.filter((document) =>
        matchesRhDocumentFilters(document, {
          type: collabDocTypeFilter,
          period: collabDocPeriodFilter,
          status: collabDocStatusFilter,
          creator: collabDocOwnerFilter,
        }),
      ),
    [collabDocOwnerFilter, collabDocPeriodFilter, collabDocStatusFilter, collabDocTypeFilter, selectedEmployeeDocuments],
  );
  const selectedEmployeeDocumentListItems = useMemo(
    () =>
      filteredSelectedEmployeeDocuments.map((document) => ({
        ...document,
        ownerName: document.uploadedByName,
        createdAt: document.createdAt,
        statusLabel: formatDocumentStatus(document.status),
        periodLabel: formatMonth(document.periodMonth),
        details: document.reviewComment ? `Commentaire RH : ${document.reviewComment}` : null,
      })),
    [filteredSelectedEmployeeDocuments, formatDocumentStatus, formatMonth],
  );
  const selectedEmployeeRequests = useMemo(() => requests.filter((request) => request.employeeId === selectedEmployeeId), [requests, selectedEmployeeId]);
  const selectedEmployeeEvents = useMemo(() => events.filter((event) => event.employeeId === selectedEmployeeId), [events, selectedEmployeeId]);
  const selectedEmployeeApplications = useMemo(() => applications.filter((application) => application.candidateId === selectedEmployeeId), [applications, selectedEmployeeId]);
  const activeDocuments = useMemo(() => documents.filter((document) => !document.deletedAt), [documents]);
  const salarieDocuments = useMemo(() => activeDocuments.filter((document) => document.uploaderRole === "salarie"), [activeDocuments]);
  const rhDocuments = useMemo(
    () => activeDocuments.filter((document) => document.uploaderRole === "rh"),
    [activeDocuments],
  );
  const trashedRhDocuments = useMemo(
    () => documents.filter((document) => document.uploaderRole === "rh" && Boolean(document.deletedAt)),
    [documents],
  );
  const pendingDocuments = useMemo(() => salarieDocuments.filter((document) => document.status === "pending"), [salarieDocuments]);
  const rhDocumentFilterSource = useMemo(
    () =>
      currentSubSection === "docs_all"
        ? activeDocuments
        : currentSubSection === "docs_salaries"
        ? salarieDocuments
        : currentSubSection === "docs_a_valider"
          ? pendingDocuments
          : currentSubSection === "docs_tous"
            ? rhDocuments
            : [],
    [activeDocuments, currentSubSection, pendingDocuments, rhDocuments, salarieDocuments],
  );
  const rhDocumentTypeOptions = useMemo(
    () => {
      const options = new Set(rhDocumentFilterSource.map((document) => document.typeLabel));
      if (currentSubSection === "docs_tous" || currentSubSection === "docs_corbeille") {
        options.add("Dossier");
      }
      return Array.from(options).sort((left, right) => left.localeCompare(right, "fr"));
    },
    [currentSubSection, rhDocumentFilterSource],
  );
  const rhDocumentPeriodOptions = useMemo(
    () => Array.from(new Set(rhDocumentFilterSource.map((document) => document.periodMonth ?? "__none__"))).sort((left, right) => left.localeCompare(right)),
    [rhDocumentFilterSource],
  );
  const rhDocumentCreatorOptions = useMemo(
    () => Array.from(new Set(rhDocumentFilterSource.map((document) => document.uploadedByName))).sort((left, right) => left.localeCompare(right, "fr")),
    [rhDocumentFilterSource],
  );
  const rhFilterOptions = useMemo(
    () => ({
      type: rhDocumentTypeOptions.map((value) => ({ value, label: value })),
      period: rhDocumentPeriodOptions.map((value) => ({
        value,
        label: value === "__none__" ? "Sans periode" : formatMonth(value),
      })),
      status: [
        { value: "pending", label: "En attente" },
        { value: "validated", label: "Valide" },
        { value: "rejected", label: "Refuse" },
      ],
      owner: rhDocumentCreatorOptions.map((value) => ({ value, label: value })),
    }),
    [rhDocumentCreatorOptions, rhDocumentPeriodOptions, rhDocumentTypeOptions],
  );
  const filteredSalarieDocuments = useMemo(
    () =>
      salarieDocuments.filter((document) =>
        matchesRhDocumentFilters(document, {
          type: documentTypeFilter,
          period: documentPeriodFilter,
          status: documentStatusFilter,
          creator: documentCreatorFilter,
        }),
      ),
    [documentCreatorFilter, documentPeriodFilter, documentStatusFilter, documentTypeFilter, salarieDocuments],
  );
  const filteredPendingDocuments = useMemo(
    () =>
      pendingDocuments.filter((document) =>
        matchesRhDocumentFilters(document, {
          type: documentTypeFilter,
          period: documentPeriodFilter,
          status: documentStatusFilter,
          creator: documentCreatorFilter,
        }),
      ),
    [documentCreatorFilter, documentPeriodFilter, documentStatusFilter, documentTypeFilter, pendingDocuments],
  );
  const filteredRhDocuments = useMemo(
    () =>
      rhDocuments.filter((document) =>
        matchesRhDocumentFilters(document, {
          type: documentTypeFilter,
          period: documentPeriodFilter,
          status: documentStatusFilter,
          creator: documentCreatorFilter,
        }),
      ),
    [documentCreatorFilter, documentPeriodFilter, documentStatusFilter, documentTypeFilter, rhDocuments],
  );
  const filteredAllDocuments = useMemo(
    () =>
      activeDocuments.filter((document) =>
        matchesRhDocumentFilters(document, {
          type: documentTypeFilter,
          period: documentPeriodFilter,
          status: documentStatusFilter,
          creator: documentCreatorFilter,
        }),
      ),
    [activeDocuments, documentCreatorFilter, documentPeriodFilter, documentStatusFilter, documentTypeFilter],
  );
  const visibleRhDocuments = useMemo(() => {
    if (currentSubSection !== "docs_tous") {
      return filteredRhDocuments;
    }
    if (!currentRhFolderId) {
      return filteredRhDocuments.filter((document) => (document.folderId ?? null) === null);
    }
    return filteredRhDocuments.filter((document) => (document.folderId ?? null) === currentRhFolderId);
  }, [currentRhFolderId, currentSubSection, filteredRhDocuments]);
  const showRhFolderTrash = currentSubSection === "docs_corbeille";
  const craEntriesByDate = useMemo(
    () => new Map(craEntries.map((entry) => [entry.workDate, entry])),
    [craEntries],
  );
  const craDraftTotalDays = useMemo(
    () => craEntries.reduce((total, entry) => total + (Number(entry.dayQuantity) || 0), 0),
    [craEntries],
  );
  const craCalendarCells = useMemo(() => buildCalendarCells(craPeriodMonth), [craPeriodMonth]);
  const rhFolderPath = useMemo(() => {
    const byId = new Map(rhFolders.map((folder) => [folder.id, folder]));
    const path: RhDocumentFolderRow[] = [];
    let cursor = currentRhFolderId;
    while (cursor) {
      const folder = byId.get(cursor);
      if (!folder) break;
      path.unshift(folder);
      cursor = folder.parentId ?? null;
    }
    return path;
  }, [currentRhFolderId, rhFolders]);

  useEffect(() => {
    if (currentRhFolderId && !rhFolders.some((folder) => folder.id === currentRhFolderId)) {
      setCurrentRhFolderId(null);
    }
  }, [currentRhFolderId, rhFolders]);

  useEffect(() => {
    if (showRhFolderTrash && currentRhFolderId) {
      setCurrentRhFolderId(null);
    }
  }, [currentRhFolderId, showRhFolderTrash]);
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

  const handleSignOut = useCallback(async () => {
    if (!supabase) return;
    setProfileMenuOpen(false);
    await forceClientSignOut(supabase);
    router.push("/auth?logged_out=1");
  }, [router]);

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
  const resetCraEditor = useCallback(() => {
    setGenerateEmployeeId(selectedEmployeeId ?? "");
    setGenerateBillingProfileEmployeeId("");
    setCraPeriodMonth(currentMonthInputValue());
    setCraNotes("");
    setCraEntries([]);
  }, [selectedEmployeeId]);

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
    await refreshDashboardData();
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
    await refreshDashboardData();
  }, [refreshDashboardData, requestDocumentTypeId, requestDueAt, requestEmployeeId, requestNote, requestPeriodMonth, resetRequestDialog, selectedRequestType?.requiresPeriod, user]);

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
    await refreshDashboardData();
  }, [refreshDashboardData]);

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
    await refreshDashboardData();
  }, [refreshDashboardData, resetRhUploadDialog, rhUploadDocumentTypeId, rhUploadEmployeeId, rhUploadFile, rhUploadPeriodMonth, selectedRhUploadType?.requiresPeriod, session]);
  const buildRhGeneratePayload = useCallback((kind: "cra" | "facture") => {
    if (!generateEmployeeId || !generateBillingProfileEmployeeId || !craPeriodMonth) {
      setSaveMessage("Choisis un collaborateur, un profil de facturation et une periode.");
      return null;
    }
    const entriesPayload = craEntries
      .filter((entry) => entry.workDate.trim())
      .map((entry) => ({
        workDate: entry.workDate,
        dayQuantity: Number(entry.dayQuantity || 0),
        label: entry.label,
      }))
      .filter((entry) => Number.isFinite(entry.dayQuantity) && entry.dayQuantity > 0);
    if (!entriesPayload.length) {
      setSaveMessage("Selectionne au moins un jour travaille.");
      return null;
    }
    const workedDaysCount = entriesPayload.reduce((total, entry) => total + entry.dayQuantity, 0);
    return {
      kind,
      employeeId: generateEmployeeId,
      billingProfileEmployeeId: generateBillingProfileEmployeeId,
      periodMonth: craPeriodMonth,
      workedDaysCount,
      notes: craNotes,
      entries: entriesPayload,
    };
  }, [craEntries, craNotes, craPeriodMonth, generateBillingProfileEmployeeId, generateEmployeeId]);

  const handleGenerateRhCraPdf = useCallback(async () => {
    const payload = buildRhGeneratePayload("cra");
    if (!payload) return;
    setCraGenerating(true);
    setSaveMessage(null);
    try {
      await callRhDocumentsApi("/api/rh/generated-documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      setSaveMessage("CRA genere avec succes.");
      await refreshDashboardData();
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Generation impossible.");
    } finally {
      setCraGenerating(false);
    }
  }, [buildRhGeneratePayload, callRhDocumentsApi, refreshDashboardData]);

  const handleGenerateRhInvoicePdf = useCallback(async () => {
    const payload = buildRhGeneratePayload("facture");
    if (!payload) return;
    setInvoiceGenerating(true);
    setSaveMessage(null);
    try {
      await callRhDocumentsApi("/api/rh/generated-documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      setSaveMessage("Facture generee avec succes.");
      await refreshDashboardData();
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Generation impossible.");
    } finally {
      setInvoiceGenerating(false);
    }
  }, [buildRhGeneratePayload, callRhDocumentsApi, refreshDashboardData]);

  const handleDeleteRhDocument = useCallback(async (document: RHDocumentRow, permanent = false) => {
    if (!session?.access_token) {
      setSaveMessage("Session RH manquante.");
      return;
    }
    const confirmationLabel = permanent
      ? `Supprimer definitivement le document RH "${document.fileName}" ?`
      : `Deplacer le document RH "${document.fileName}" dans la corbeille ?`;
    if (!window.confirm(confirmationLabel)) {
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
      body: JSON.stringify({ documentId: document.id, permanent }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setSaveMessage(payload?.error ?? (permanent ? "Suppression definitive RH impossible." : "Suppression RH impossible."));
      setDeletingRhDocumentId(null);
      return;
    }

    setDeletingRhDocumentId(null);
    setSaveMessage(permanent ? "Document RH supprime definitivement." : "Document RH deplace dans la corbeille.");
    await refreshDashboardData();
  }, [refreshDashboardData, session]);

  const restoreRhDocument = useCallback(async (document: RHDocumentRow) => {
    if (!session?.access_token) {
      setSaveMessage("Session RH manquante.");
      return;
    }
    setDeletingRhDocumentId(document.id);
    setSaveMessage(null);
    const response = await fetch("/api/rh/documents/upload", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ documentId: document.id }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setSaveMessage(payload?.error ?? "Restauration RH impossible.");
      setDeletingRhDocumentId(null);
      return;
    }
    setDeletingRhDocumentId(null);
    setSaveMessage("Document RH restaure.");
    await refreshDashboardData();
  }, [refreshDashboardData, session]);

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
      await refreshDashboardData();
      return;
    }

    setReviewDrafts((prev) => ({ ...prev, [document.id]: "" }));
    setSaveMessage(nextStatus === "validated" ? "Document valide." : nextStatus === "rejected" ? "Document refuse." : "Document remis en attente.");
    setReviewingDocumentId(null);
    await refreshDashboardData();
  }, [findMatchingRequest, refreshDashboardData, reviewDrafts, user]);

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
    <div className="h-screen overflow-hidden bg-[#f3f6fc] text-[#0A1A2F]">
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
	                  <Link href="/dashboard/rh/documents/tous" className={`block py-1 ${currentSubSection === "docs_all" ? "font-semibold" : ""}`}>Tous les documents</Link>
	                  <Link href="/dashboard/rh/documents/cra-facture" className={`block py-1 ${currentSubSection === "docs_cra_facture" ? "font-semibold" : ""}`}>CRA & Facture</Link>
	                  <Link href="/dashboard/rh/documents/a-valider" className={`block py-1 ${currentSubSection === "docs_a_valider" ? "font-semibold" : ""}`}>A valider</Link>
	                  <Link href="/dashboard/rh/documents/mes-demandes" className={`block py-1 ${currentSubSection === "docs_mes_demandes" ? "font-semibold" : ""}`}>Mes demandes</Link>
	                  <Link href="/dashboard/rh/documents/corbeille" className={`block py-1 ${currentSubSection === "docs_corbeille" ? "font-semibold" : ""}`}>Corbeille</Link>
	                </div>
	              )}

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
                  <span className="text-sm text-[#0A1A2F]/55">Rechercher dans l&apos;espace RH</span>
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
            roleLabel="Espace RH"
            settingsHref="/dashboard/rh/parametres"
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

          {saveMessage && !error && <StatusNotice message={saveMessage} />}

          {currentSection === "overview" && (
            <RhOverviewSection
              pendingDocumentsCount={pendingDocuments.length}
              openRequestsCount={openRequests.length}
              employeesCount={employees.length}
              currentMonthDocumentsCount={currentMonthDocuments.length}
              openRequests={openRequests}
              formatDate={formatDate}
              formatMonth={formatMonth}
            />
          )}

          {currentSection === "collaborateurs" && (
            <Card className="border-0 shadow-none">
              <CardHeader><CardTitle>Collaborateurs</CardTitle></CardHeader>
              <CardContent>
                {currentSubSection === "collab_detail" && selectedEmployee && activeDraft ? (
                  <div className="space-y-4 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-semibold text-[#0A1A2F]">Fiche collaborateur</h3>
                      <Button asChild variant="outline" size="sm">
                        <Link href="/dashboard/rh/collaborateurs">Retour</Link>
                      </Button>
                    </div>

                    <div className="overflow-hidden rounded-xl bg-[#f8fafc]">
	                      <div className="flex items-center justify-between px-4 py-3">
	                        <p className="text-base font-medium text-[#0A1A2F]">Information</p>
	                        {!isEmployeeEditMode ? (
	                          <Button
	                            type="button"
	                            variant="ghost"
	                            size="icon"
	                            className="h-8 w-8 text-[#0A1A2F]/70 hover:text-[#0A1A2F]"
	                            onClick={() => setIsEmployeeEditMode(true)}
	                            aria-label="Modifier les informations"
	                            title="Modifier"
	                          >
	                            <Pencil className="h-4 w-4" />
	                          </Button>
	                        ) : (
	                          <div className="flex items-center gap-2">
	                            <Button
	                              size="sm"
	                              onClick={async () => {
	                                await handleSaveEmployee();
	                                setIsEmployeeEditMode(false);
	                              }}
	                              disabled={savingEmployee}
	                            >
	                              {savingEmployee ? "Enregistrement..." : "Enregistrer"}
	                            </Button>
	                            <Button
	                              type="button"
	                              variant="outline"
	                              size="sm"
	                              onClick={() => {
	                                resetEmployeeDraft(selectedEmployee);
	                                setIsEmployeeEditMode(false);
	                              }}
	                              disabled={savingEmployee}
	                            >
	                              Annuler
	                            </Button>
	                          </div>
	                        )}
	                      </div>
                      <div className="grid gap-6 p-4 md:grid-cols-[160px_minmax(0,1fr)]">
                        <div className="space-y-3">
                          <div className="flex h-[132px] w-[132px] items-center justify-center rounded border border-slate-300 bg-white text-3xl font-semibold text-[#0A1A2F]/60">
                            {(activeDraft.full_name ?? selectedEmployee.email ?? "?").trim().charAt(0).toUpperCase()}
                          </div>
                          <p className="text-xs text-[#0A1A2F]/60">Profil collaborateur</p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
	                          <div>
	                            <p className="text-xs uppercase tracking-wide text-[#0A1A2F]/50">Nom et prenom</p>
		                            {isEmployeeEditMode ? (
		                              <input
		                                value={activeDraft.full_name}
		                                onChange={(event) =>
		                                  setEmployeeDrafts((prev) => ({
		                                    ...prev,
	                                    [selectedEmployee.id]: { ...activeDraft, full_name: event.target.value },
	                                  }))
		                                }
		                                className="mt-1 h-9 w-full rounded border border-slate-300 bg-white px-2 text-sm"
		                              />
		                            ) : (
		                              <p className="mt-1 text-[#0A1A2F]/80">{activeDraft.full_name || "-"}</p>
		                            )}
	                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-[#0A1A2F]/50">Email</p>
                            <p className="mt-1 break-all text-[#0A1A2F]">{selectedEmployee.email}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-[#0A1A2F]/50">N° mobile</p>
                            {isEmployeeEditMode ? (
                              <input
                                value={activeDraft.phone}
                                onChange={(event) =>
                                  setEmployeeDrafts((prev) => ({
                                    ...prev,
                                    [selectedEmployee.id]: { ...activeDraft, phone: event.target.value },
                                  }))
                                }
                                className="mt-1 h-9 w-full rounded border border-slate-300 bg-white px-2 text-sm"
                              />
                            ) : (
                              <p className="mt-1 text-[#0A1A2F]/80">{activeDraft.phone || "-"}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-[#0A1A2F]/50">Entreprise</p>
                            {isEmployeeEditMode ? (
                              <input
                                value={activeDraft.company_name}
                                onChange={(event) =>
                                  setEmployeeDrafts((prev) => ({
                                    ...prev,
                                    [selectedEmployee.id]: { ...activeDraft, company_name: event.target.value },
                                  }))
                                }
                                className="mt-1 h-9 w-full rounded border border-slate-300 bg-white px-2 text-sm"
                                placeholder="Nom de l'entreprise"
                              />
                            ) : (
                              <p className="mt-1 text-[#0A1A2F]/80">{activeDraft.company_name || "-"}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-[#0A1A2F]/50">ESN partenaire</p>
                            {isEmployeeEditMode ? (
                              <input
                                value={activeDraft.esn_partenaire}
                                onChange={(event) =>
                                  setEmployeeDrafts((prev) => ({
                                    ...prev,
                                    [selectedEmployee.id]: { ...activeDraft, esn_partenaire: event.target.value },
                                  }))
                                }
                                className="mt-1 h-9 w-full rounded border border-slate-300 bg-white px-2 text-sm"
                                placeholder="Nom de l'ESN partenaire"
                              />
                            ) : (
                              <p className="mt-1 text-[#0A1A2F]/80">{activeDraft.esn_partenaire || "-"}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-[#0A1A2F]/50">Statut</p>
                            {isEmployeeEditMode ? (
                              <select
                                value={activeDraft.employment_status}
                                onChange={(event) =>
                                  setEmployeeDrafts((prev) => ({
                                    ...prev,
                                    [selectedEmployee.id]: { ...activeDraft, employment_status: event.target.value },
                                  }))
                                }
                                className="mt-1 h-9 w-full rounded border border-slate-300 bg-white px-2 text-sm"
                              >
                                <option value="active">active</option>
                                <option value="inactive">inactive</option>
                                <option value="exited">exited</option>
                              </select>
                            ) : (
                              <p className="mt-1 text-[#0A1A2F]/80">{activeDraft.employment_status || "-"}</p>
                            )}
                          </div>
                        </div>
                      </div>
	                    </div>
	                    <div className="flex items-center gap-2">
	                      {saveMessage && <p className="text-sm text-[#0A1A2F]/70">{saveMessage}</p>}
	                    </div>
	                    <div className="w-full border-b border-slate-200 bg-white">
	                      <div className="flex items-end gap-1 px-2 text-sm">
	                        <button
	                          type="button"
	                          className={`rounded-t-md px-4 py-2 font-medium transition ${
	                            collabDetailSection === "demandes"
	                              ? "border-b-2 border-[#0A1A2F] bg-slate-50 text-[#0A1A2F]"
	                              : "text-[#0A1A2F]/65 hover:bg-slate-50 hover:text-[#0A1A2F]"
	                          }`}
	                          onClick={() => {
	                            setCollabDetailSection("demandes");
	                            setCollabDocumentsMenuOpen(false);
	                          }}
	                        >
	                          Demandes
	                        </button>
	                        <button
	                          type="button"
	                          className={`rounded-t-md px-4 py-2 font-medium transition ${
	                            collabDetailSection === "documents"
	                              ? "border-b-2 border-[#0A1A2F] bg-slate-50 text-[#0A1A2F]"
	                              : "text-[#0A1A2F]/65 hover:bg-slate-50 hover:text-[#0A1A2F]"
	                          }`}
	                          onClick={() => {
	                            setCollabDetailSection("documents");
	                            setCollabDocumentsMenuOpen(false);
	                          }}
	                        >
	                          Documents
	                        </button>
	                        <button
	                          type="button"
	                          className={`rounded-t-md px-4 py-2 font-medium transition ${
	                            collabDetailSection === "candidatures"
	                              ? "border-b-2 border-[#0A1A2F] bg-slate-50 text-[#0A1A2F]"
	                              : "text-[#0A1A2F]/65 hover:bg-slate-50 hover:text-[#0A1A2F]"
	                          }`}
	                          onClick={() => {
	                            setCollabDetailSection("candidatures");
	                            setCollabDocumentsMenuOpen(false);
	                          }}
	                        >
	                          Candidatures
	                        </button>
	                      </div>
	                    </div>

	                    {collabDetailSection === "demandes" ? (
	                      <div className="rounded p-3">
	                        <p className="mb-2 font-medium">Demandes ({selectedEmployeeRequests.length})</p>
	                        {selectedEmployeeRequests.length ? selectedEmployeeRequests.map((request) => (
	                          <p key={request.id} className="text-[#0A1A2F]/80">{request.typeLabel} - {request.status}</p>
	                        )) : <p className="text-[#0A1A2F]/70">Aucune demande.</p>}
	                      </div>
	                    ) : null}
	                    {collabDetailSection === "documents" ? (
	                      <>
		                        <div className="rounded p-3">
		                          <div ref={collabDocumentsMenuRef} className="relative mb-2 flex items-center gap-2">
		                            <p className="font-medium">Documents ({filteredSelectedEmployeeDocuments.length})</p>
		                            <button
		                              type="button"
		                              className="rounded-md p-1 text-[#0A1A2F]/70 hover:bg-slate-100 hover:text-[#0A1A2F]"
		                              aria-label="Options documents"
		                              onClick={() => setCollabDocumentsMenuOpen((open) => !open)}
		                            >
		                              <ChevronDown className={`h-4 w-4 transition ${collabDocumentsMenuOpen ? "rotate-180" : ""}`} />
		                            </button>
		                            {collabDocumentsMenuOpen ? (
		                              <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
		                                <button
		                                  type="button"
		                                  className="w-full rounded-md px-3 py-2 text-left text-sm text-[#0A1A2F] hover:bg-slate-50"
		                                  onClick={() => {
		                                    resetRhUploadDialog();
		                                    setRhUploadEmployeeId(selectedEmployee.id);
		                                    setSaveMessage(null);
		                                    setRhUploadDialogOpen(true);
		                                    setCollabDocumentsMenuOpen(false);
		                                  }}
		                                >
		                                  Importer un fichier
		                                </button>
		                              </div>
		                            ) : null}
		                          </div>
		                          <DocumentFiltersBar
	                            fields={["type", "period", "status", "owner"]}
	                            values={{
	                              type: collabDocTypeFilter,
	                              period: collabDocPeriodFilter,
	                              status: collabDocStatusFilter,
	                              owner: collabDocOwnerFilter,
	                            }}
	                            options={selectedEmployeeDocumentFilterOptions}
	                            onChange={(field, value) => {
	                              if (field === "type") setCollabDocTypeFilter(value);
	                              if (field === "period") setCollabDocPeriodFilter(value);
	                              if (field === "status") setCollabDocStatusFilter(value);
	                              if (field === "owner") setCollabDocOwnerFilter(value);
	                            }}
	                          />
	                          {filteredSelectedEmployeeDocuments.length ? (
		                            <DashboardDocumentList
		                              items={selectedEmployeeDocumentListItems}
		                              storageKey="rh-collab-detail-documents-columns"
		                              storageScope={user?.id ?? profile?.id ?? null}
		                              preferencesAuthToken={session?.access_token ?? null}
		                              columnControlPlacement="inline"
		                              onItemDoubleClick={(document) => {
		                                if (
		                                  document.fileName.toLowerCase().endsWith(".pdf") &&
		                                  document.storagePath
		                                ) {
		                                  void handleViewDocument(document);
		                                }
		                              }}
		                              isItemDoubleClickable={(document) =>
		                                document.fileName.toLowerCase().endsWith(".pdf") && !!document.storagePath
		                              }
		                              renderActions={(document) => (
		                                <>
		                                  {document.fileName.toLowerCase().endsWith(".pdf") ? (
		                                    <Button
		                                      type="button"
		                                      variant="ghost"
		                                      size="sm"
		                                      className="w-full justify-start"
		                                      onClick={() => {
		                                        void handleViewDocument(document);
		                                      }}
		                                      disabled={
		                                        !document.storagePath ||
		                                        viewingDocumentId === document.id ||
		                                        downloadingDocumentId === document.id
		                                      }
		                                    >
		                                      Visualiser
		                                    </Button>
		                                  ) : null}
		                                  <Button
		                                    type="button"
		                                    variant="ghost"
		                                    size="sm"
		                                    className="w-full justify-start"
		                                    onClick={() => {
		                                      void handleDownloadDocument(document);
		                                    }}
		                                    disabled={
		                                      !document.storagePath ||
		                                      downloadingDocumentId === document.id ||
		                                      viewingDocumentId === document.id
		                                    }
		                                  >
		                                    Télécharger
		                                  </Button>
		                                </>
		                              )}
	                            />
	                          ) : <p className="text-[#0A1A2F]/70">Aucun document.</p>}
	                        </div>
	                      </>
	                    ) : null}
	                    {collabDetailSection === "candidatures" ? (
	                      <div className="rounded p-3">
	                        <p className="mb-2 font-medium">Candidatures ({selectedEmployeeApplications.length})</p>
	                        {selectedEmployeeApplications.length ? selectedEmployeeApplications.map((application) => (
	                          <p key={application.id} className="text-[#0A1A2F]/80">{application.jobTitle} - {application.status}</p>
	                        )) : <p className="text-[#0A1A2F]/70">Aucune candidature.</p>}
	                      </div>
	                    ) : null}
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-[#0A1A2F]/70"><tr><th className="px-3 py-2">Nom</th><th className="px-3 py-2">Entreprise</th><th className="px-3 py-2">ESN partenaire</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Statut</th><th className="px-3 py-2">Connexion</th><th className="px-3 py-2">Derniere connexion</th><th className="px-3 py-2">Demandes ouvertes</th></tr></thead>
                      <tbody className="divide-y divide-slate-200 bg-white">{collaborateursRows.map((employee) => <tr key={employee.id}><td className="px-3 py-2"><Link href={`/dashboard/rh/collaborateurs/${employee.id}`} className="hover:underline">{employee.full_name ?? "-"}</Link></td><td className="px-3 py-2">{employee.company_name ?? "-"}</td><td className="px-3 py-2">{employee.esn_partenaire ?? "-"}</td><td className="px-3 py-2">{employee.email}</td><td className="px-3 py-2">{employee.employment_status ?? "-"}</td><td className="px-3 py-2">{isRecentlyActive(employee.id) ? "Actif recemment" : "Hors ligne"}</td><td className="px-3 py-2">{formatLastSignIn(employee.id)}</td><td className="px-3 py-2">{requests.filter((request) => request.employeeId === employee.id && ["pending", "uploaded", "rejected", "expired"].includes(request.status)).length}</td></tr>)}</tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}          {currentSection === "documents" && (
            <div className="space-y-3">
              <RhDocumentsSection
              storageScope={user?.id ?? profile?.id ?? null}
              preferencesAuthToken={session?.access_token ?? null}
              currentSubSection={currentSubSection}
              documentTypeFilter={documentTypeFilter}
              documentPeriodFilter={documentPeriodFilter}
              documentStatusFilter={documentStatusFilter}
              documentCreatorFilter={documentCreatorFilter}
              rhFilterOptions={rhFilterOptions}
              onDocumentTypeFilterChange={setDocumentTypeFilter}
              onDocumentPeriodFilterChange={setDocumentPeriodFilter}
              onDocumentStatusFilterChange={setDocumentStatusFilter}
              onDocumentCreatorFilterChange={setDocumentCreatorFilter}
              onOpenRhUploadDialog={() => {
                setSaveMessage(null);
                setRhUploadDialogOpen(true);
              }}
              onOpenRequestDialog={() => {
                setSaveMessage(null);
                openRequestDialog();
              }}
              generateEmployeeId={generateEmployeeId}
              generateBillingProfileEmployeeId={generateBillingProfileEmployeeId}
              billingProfiles={billingProfiles}
              employees={employees}
              craGenerating={craGenerating}
              invoiceGenerating={invoiceGenerating}
              craPeriodMonth={craPeriodMonth}
              craDraftTotalDays={craDraftTotalDays}
              craNotes={craNotes}
              craCalendarCells={craCalendarCells}
              craEntriesByDate={craEntriesByDate}
              craEntries={craEntries}
              onGenerateEmployeeIdChange={setGenerateEmployeeId}
              onGenerateBillingProfileEmployeeIdChange={setGenerateBillingProfileEmployeeId}
              onCraPeriodMonthChange={handleCraPeriodMonthChange}
              onCraNotesChange={setCraNotes}
              onGenerateCraPdf={handleGenerateRhCraPdf}
              onGenerateInvoicePdf={handleGenerateRhInvoicePdf}
              resetCraEditor={resetCraEditor}
              toggleCraWorkDate={toggleCraWorkDate}
              updateCraEntry={updateCraEntry}
              requests={requests}
              cancellingRequestId={cancellingRequestId}
              onCancelRequest={handleCancelRequest}
              filteredSalarieDocuments={filteredSalarieDocuments}
              filteredAllDocuments={filteredAllDocuments}
              filteredPendingDocuments={filteredPendingDocuments}
              filteredRhDocuments={visibleRhDocuments}
              trashedRhDocuments={trashedRhDocuments}
              rhFolders={rhFolders}
              trashedRhFolders={trashedRhFolders}
              currentRhFolderId={currentRhFolderId}
              rhFolderPath={rhFolderPath}
              showRhFolderTrash={showRhFolderTrash}
              onRhNavigateFolder={setCurrentRhFolderId}
              onRhCreateFolder={createRhFolder}
              onRhRenameFolder={renameRhFolder}
              onRhDeleteFolder={deleteRhFolder}
              onRhRestoreFolder={restoreRhFolder}
              onRhPurgeFolder={purgeRhFolder}
              onRhMoveDocumentToFolder={moveRhDocumentToFolder}
              onRhMoveDocumentToRoot={moveRhDocumentToRoot}
              onViewDocument={handleViewDocument}
              onDownloadDocument={handleDownloadDocument}
              onReviewDocument={handleReviewDocument}
              onDeleteRhDocument={handleDeleteRhDocument}
              onRestoreRhDocument={restoreRhDocument}
              onDeleteRhDocumentPermanently={(document) => handleDeleteRhDocument(document, true)}
              viewingDocumentId={viewingDocumentId}
              downloadingDocumentId={downloadingDocumentId}
              reviewingDocumentId={reviewingDocumentId}
              deletingRhDocumentId={deletingRhDocumentId}
              reviewDrafts={reviewDrafts}
              onReviewDraftsChange={setReviewDrafts}
              formatMonth={formatMonth}
              formatDate={formatDate}
              formatDocumentStatus={formatDocumentStatus}
              />
            </div>
          )}

          {currentSection === "offres" && (
            <RhOffersSection
              currentSubSection={currentSubSection}
              jobOffers={jobOffers}
              applications={applications}
            />
          )}

          {currentSection === "parametres" && (
            <RhSettingsSection
              email={profile?.email ?? "-"}
              fullName={profile?.full_name ?? "-"}
              userId={user?.id ?? "N/A"}
              expiresAt={session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : "-"}
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

      {loading && <DashboardLoadingOverlay message="Chargement des donnees..." />}
    </div>
  );
}







