"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";
import { ConsoleLoadingSkeleton } from "@/components/console/feedback/loading-skeleton";
import { RhOffersSection } from "@/components/dashboard/rh-offers-section";
import { RhDocumentsSection } from "@/components/dashboard/rh-documents-section";
import type { RhLeaveRequestPayload } from "@/components/dashboard/rh/leave-request-editor";
import { RhOverviewSection } from "@/components/dashboard/rh-overview-section";
import type { ConsoleNotification } from "@/components/console/shell/console-notifications";
import {
  ConsoleResultDialog,
  type ConsoleResult,
} from "@/components/console/feedback/result-dialog";
import type { MissionFormState, MissionItem } from "@/components/dashboard/missions-card";
import { ConsoleCollaborateursTable } from "@/components/console/collaborateurs/collaborateurs-table";
import { ConsoleColleagueDetail } from "@/components/console/collaborateurs/colleague-detail";
import { ConsoleCollaborateurDetail } from "@/components/console/collaborateurs/collaborateur-detail";
import { ConsoleShell } from "@/components/console/shell/console-shell";
import { StatusNotice } from "@/components/dashboard/status-notice";
import { Button } from "@/components/ui/button";
import { useDocumentFolders } from "@/features/dashboard/documents/use-document-folders";
import { useDocumentPreview } from "@/features/dashboard/documents/use-document-preview";
import { createAuthorizedFetch, getFreshAccessToken } from "@/lib/dashboard-api";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { displayNameFromMetadata } from "@/domain/profiles";
import { useCraEditor, type CraEditorMission } from "@/features/dashboard/cra/use-cra-editor";
import { useBatchUploadForm } from "@/features/dashboard/rh/use-batch-upload-form";
import { useDocumentRequestForm } from "@/features/dashboard/rh/use-document-request-form";
import { buildCalendarCells } from "@/domain/cra";
import { RhBatchUploadDialog } from "@/components/dashboard/rh/batch-upload-dialog";
import {
  BATCH_NO_EMPLOYEE,
  getBatchRowIssue,
  type BatchUploadRow,
} from "@/features/dashboard/rh/document-batch";
import { useDocumentFilters } from "@/features/dashboard/documents/document-filters";
import type { RhWorkspaceRouteProps } from "@/features/dashboard/rh/navigation";
import { RH_NAV_CONFIG } from "@/features/dashboard/shell/nav-config";
import type { DocumentRequestStatus, DocumentStatus, DocumentTypeRow } from "@/domain/documents";
import type {
  RhApplicationRow as ApplicationRow,
  RhDocumentRow as RHDocumentRow,
  RhJobOfferRow as JobOfferRow,
  RhProfileRow as ProfileRow,
  RhRequestRow as RequestRow,
} from "@/features/dashboard/rh/types";
import { formatDate, formatDocumentStatus, formatMonth, normalizeJoinOne } from "@/lib/dashboard-formatters";
import { forceClientSignOut, safeGetClientSession } from "@/lib/client-auth";
import { resetAppearanceHydration } from "@/features/account/appearance-store";
import { resetAccountIdentity } from "@/features/account/identity-store";
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
  /** Collegues RH, hors soi-meme. Distincts des collaborateurs : voir `rhColleagues`. */
  rhColleagues: ProfileRow[];
  documentTypes: DocumentTypeRow[];
  documents: RHDocumentRow[];
  requests: RequestRow[];
  jobOffers: JobOfferRow[];
  applications: ApplicationRow[];
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
  // employeeId -> allowed document type ids. Empty / missing = all types allowed.
  typeRestrictionsByEmployee: Record<string, string[]>;
};

const RH_DASHBOARD_CACHE_TTL_MS = 2 * 60 * 1000;
let rhDashboardCache: RhDashboardCache | null = null;

/**
 * Positions du filtre de la page Collaborateurs.
 *
 * « actifs » et « inactifs » portent sur le STATUT D'EMPLOI, qui ne concerne que les
 * consultants : ces deux positions ne montrent donc qu'eux. « rh » isole les collegues,
 * et « tous » reunit les deux populations.
 */
type EmployeeStatusFilter = "all" | "active" | "inactive" | "rh";

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
  /**
   * Collegues RH.
   *
   * VOLONTAIREMENT SEPARE de `employees`. Ce dernier alimente tout ce qui suppose un
   * consultant : selecteur du CRA, depot en lot, demande de document, formulaire de conge,
   * compteurs de la vue d'ensemble. Y verser des RH les ferait apparaitre dans une dizaine
   * d'endroits ou ils n'ont rien a faire. Les deux listes ne se rejoignent qu'au moment de
   * composer le tableau.
   */
  const [rhColleagues, setRhColleagues] = useState<ProfileRow[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeRow[]>([]);
  // employeeId -> allowed document type ids. Empty / missing = all types allowed.
  const [typeRestrictionsByEmployee, setTypeRestrictionsByEmployee] = useState<
    Record<string, string[]>
  >({});
  const [documents, setDocuments] = useState<RHDocumentRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  // Vue globale : le filtre « createur » designe le COLLABORATEUR concerne.
  const documentFilters = useDocumentFilters("employeeName");
  const [jobOffers, setJobOffers] = useState<JobOfferRow[]>([]);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
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
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const callRhDocumentsApi = useMemo(() => createAuthorizedFetch("RH"), []);
  const {
    folders: rhFolders,
    trashedFolders: trashedRhFolders,
    currentFolderId: currentRhFolderId,
    setCurrentFolderId: setCurrentRhFolderId,
    folderPath: rhFolderPath,
    createFolder: createRhFolder,
    renameFolder: renameRhFolder,
    deleteFolder: deleteRhFolder,
    restoreFolder: restoreRhFolder,
    purgeFolder: purgeRhFolder,
    moveDocumentToFolder: moveRhDocumentToFolder,
    moveDocumentToRoot: moveRhDocumentToRoot,
  } = useDocumentFolders<RHDocumentRow>({
    ownerUserId: profile?.id,
    callApi: callRhDocumentsApi,
    onMessage: setSaveMessage,
    onDocumentMoved: (document, folderId) =>
      setDocuments((current) =>
        current.map((row) => (row.id === document.id ? { ...row, folderId } : row)),
      ),
    showTrash: currentSubSection === "docs_corbeille",
    ready: Boolean(session?.access_token),
    // Le RH range le nouveau dossier dans le dossier courant ; le salarie cree a la racine.
    createInCurrentFolder: true,
    // Sans ce rafraichissement, les compteurs du tableau de bord restent figes apres
    // suppression, sans aucune erreur visible.
    onAfterDelete: () => refreshDashboardData(),
  });
  const {
    viewingDocumentId,
    downloadingDocumentId,
    handleViewDocument,
    handleDownloadDocument,
  } = useDocumentPreview<RHDocumentRow>(setSaveMessage);
  const [employeeDrafts, setEmployeeDrafts] = useState<Record<string, { full_name: string; phone: string; company_name: string; esn_partenaire: string; employment_status: string }>>({});
  const [reviewingDocumentId, setReviewingDocumentId] = useState<string | null>(null);
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, string>>({});
  // Le formulaire de demande vit dans son propre hook : voir `useDocumentRequestForm`.
  // Il est instancie plus bas, une fois `salarieUploadableTypes` et
  // `allowedTypeIdsForEmployee` disponibles.
  const [cancellingRequestId, setCancellingRequestId] = useState<string | null>(null);
  // Fiche collaborateur : on est deja sur un seul collaborateur, le filtre designe donc le
  // DEPOSANT du document (`uploadedByName`, la valeur par defaut du hook).
  const collabDocumentFilters = useDocumentFilters();
  // Le depot en lot vit dans son propre hook : voir `useBatchUploadForm`. Il est instancie
  // plus bas, une fois `employees` et `allowedTypeIdsForEmployee` disponibles.
  const [generateEmployeeId, setGenerateEmployeeId] = useState("");
  /**
   * Resultat de la generation d'un CRA ou d'une facture, affiche au centre de l'ecran.
   *
   * Ces deux actions durent plusieurs secondes et produisent un document archive : leur
   * issue ne doit pas se lire dans une ligne en haut de page, alors que le clic vient d'un
   * bouton situe en bas d'un calendrier. Le reste des retours reste en ligne.
   */
  const [generationResult, setGenerationResult] = useState<ConsoleResult | null>(null);

  /** Missions du collaborateur affiche dans la fiche. Distinctes de celles du CRA. */
  const [selectedEmployeeMissions, setSelectedEmployeeMissions] = useState<MissionItem[]>([]);
  const [missionsLoading, setMissionsLoading] = useState(false);
  const [missionsSaving, setMissionsSaving] = useState(false);
  const [missionsMessage, setMissionsMessage] = useState<string | null>(null);

  /** Missions du collaborateur pour lequel on genere. Chargees a chaque changement. */
  const [craMissionRows, setCraMissionRows] = useState<CraEditorMission[]>([]);
  const [craMissionsLoading, setCraMissionsLoading] = useState(false);
  const [craGenerating, setCraGenerating] = useState(false);
  const [invoiceGenerating, setInvoiceGenerating] = useState(false);
  const [leaveGenerating, setLeaveGenerating] = useState(false);
  const [collaborateurSearch, setCollaborateurSearch] = useState("");
  const [billingProfiles, setBillingProfiles] = useState<
    {
      employeeId: string;
      profileLabel: string;
      employeeName: string;
      firstName: string | null;
      lastName: string | null;
      companyName: string | null;
      esnPartenaire: string | null;
      addressLine1: string | null;
      addressLine2: string | null;
      postalCode: string | null;
      city: string | null;
      country: string | null;
      phone: string | null;
      email: string | null;
      siret: string | null;
      iban: string | null;
      bic: string | null;
      dailyRate: number;
      updatedAt: string | null;
    }[]
  >([]);
  const [billingProfileDrafts, setBillingProfileDrafts] = useState<
    Record<
      string,
      {
        firstName: string;
        lastName: string;
        companyName: string;
        esnPartenaire: string;
        addressLine1: string;
        addressLine2: string;
        postalCode: string;
        city: string;
        country: string;
        phone: string;
        email: string;
        siret: string;
        iban: string;
        bic: string;
        dailyRate: string;
      }
    >
  >({});
  const [isBillingProfileEditMode, setIsBillingProfileEditMode] = useState(false);
  const [billingProfileSaving, setBillingProfileSaving] = useState(false);
  const [deletingRhDocumentId, setDeletingRhDocumentId] = useState<string | null>(null);

  const applyDashboardCache = useCallback((cache: RhDashboardCache) => {
    setEmployees(cache.employees);
    setRhColleagues(cache.rhColleagues ?? []);
    setDocumentTypes(cache.documentTypes);
    setTypeRestrictionsByEmployee(cache.typeRestrictionsByEmployee ?? {});
    setDocuments(cache.documents);
    setRequests(cache.requests);
    setJobOffers(cache.jobOffers);
    setApplications(cache.applications);
    setActivityByEmployeeId(cache.activityByEmployeeId);
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
      | {
          error?: string;
          restricted?: boolean;
          employeeIds?: string[];
          documentTypeRestrictions?: Record<string, string[]>;
        }
      | null;
    if (!visibilityResponse.ok) {
      setError(visibilityPayload?.error ?? "Chargement des affectations RH impossible.");
      return;
    }

    const isRestricted = visibilityPayload?.restricted === true;
    const assignedSet = new Set(visibilityPayload?.employeeIds ?? []);
    const canAccessEmployee = (employeeId: string) =>
      !isRestricted || assignedSet.has(employeeId);

    // employeeId -> allowed document type ids. Empty / missing = all types allowed.
    const typeRestrictions = visibilityPayload?.documentTypeRestrictions ?? {};
    const canAccessDocumentType = (employeeId: string, documentTypeId: string) => {
      const allowed = typeRestrictions[employeeId];
      if (!allowed || allowed.length === 0) return true;
      return allowed.includes(documentTypeId);
    };

    const [employeesRes, documentTypesRes, docsRes, requestsRes, offersRes, appsRes, activityResponse] = await Promise.all([
      supabase.from("profiles").select("id,email,full_name,phone,role,professional_status,employment_status,company_name,esn_partenaire,avatar_url").eq("role", "salarie").order("email", { ascending: true }),
      supabase.from("document_types").select("id,label,requires_period,allowed_uploader_roles").eq("active", true).order("label", { ascending: true }),
      supabase.from("employee_documents").select("id,status,file_name,period_month,created_at,updated_at,size_bytes,review_comment,uploader_role,uploaded_by,storage_bucket,storage_path,source_kind,folder_id,deleted_at,document_type:document_types(id,label,code),employee:profiles!employee_documents_employee_id_fkey(id,full_name,email,role),uploader:profiles!employee_documents_uploaded_by_fkey(full_name,email)").order("created_at", { ascending: false }),
      supabase.from("document_requests").select("id,status,due_at,period_month,note,document_type:document_types(id,label),employee:profiles!document_requests_employee_id_fkey(id,full_name,email)").order("created_at", { ascending: false }),
      supabase.from("job_offers").select("id,title,status,location").order("created_at", { ascending: false }),
      supabase.from("applications").select("id,candidate_id,status,job:job_offers(title),candidate:profiles!applications_candidate_id_fkey(full_name,email)").order("created_at", { ascending: false }),
      fetch("/api/rh/collaborators/activity", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),
    ]);

    if (employeesRes.error || documentTypesRes.error || docsRes.error || requestsRes.error || offersRes.error || appsRes.error) {
      setError(employeesRes.error?.message ?? documentTypesRes.error?.message ?? docsRes.error?.message ?? requestsRes.error?.message ?? offersRes.error?.message ?? appsRes.error?.message ?? "Erreur RH");
      return;
    }

    // On envoie les identifiants des DOCUMENTS, pas ceux des deposants : c'est la route
    // qui derive les profils, apres avoir restreint les documents au perimetre du RH.
    // Lui passer des identifiants de profils revenait a lui faire resoudre n'importe quel
    // compte.
    const rhUploaderDocumentIds = Array.from(
      new Set(
        (docsRes.data ?? [])
          .map((row) => {
            const item = row as {
              id?: string | null;
              uploader_role?: string | null;
              uploaded_by?: string | null;
            };
            if (item.uploader_role !== "rh" || !item.uploaded_by) return null;
            return item.id ?? null;
          })
          .filter((value): value is string => Boolean(value)),
      ),
    );
    const rhUploadersById = new Map<string, { fullName: string | null; email: string }>();
    if (rhUploaderDocumentIds.length) {
      const uploadersResponse = await fetch("/api/rh/documents/uploaders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ documentIds: rhUploaderDocumentIds }),
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

    /*
      Collegues RH : par une ROUTE SERVEUR, et non par PostgREST. La policy
      `profiles_select_scoped` n'ouvre a un RH que son propre profil et ceux de ses
      affectes — une lecture directe des pairs ne remonterait rien, en silence.

      Un echec est sans gravite : le tableau se contente alors des consultants.
    */
    let mappedRhColleagues: ProfileRow[] = [];
    try {
      const colleaguesPayload = (await fetch("/api/rh/colleagues", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((response) => (response.ok ? response.json() : null))) as {
        items?: ProfileRow[];
      } | null;
      mappedRhColleagues = colleaguesPayload?.items ?? [];
    } catch {
      mappedRhColleagues = [];
    }
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
      if (!canAccessEmployee(document.employeeId)) return false;
      return canAccessDocumentType(document.employeeId, document.documentTypeId);
    });
    const mappedDocuments = filteredDocuments;

    const mappedRequests = (requestsRes.data ?? []).map((row: { id: string; status: DocumentRequestStatus; due_at: string | null; period_month: string | null; note: string | null; document_type: { id: string; label: string } | { id: string; label: string }[] | null; employee: { id: string; full_name: string | null; email: string } | { id: string; full_name: string | null; email: string }[] | null }) => {
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
    const filteredRequests = mappedRequests.filter(
      (request) =>
        request.employeeId &&
        canAccessEmployee(request.employeeId) &&
        canAccessDocumentType(request.employeeId, request.documentTypeId),
    );
    const mappedJobOffers = (offersRes.data ?? []) as JobOfferRow[];
    const mappedApplications = (appsRes.data ?? []).map((row: { id: string; candidate_id: string; status: ApplicationRow["status"]; job: { title: string | null } | { title: string | null }[] | null; candidate: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null }) => {
      const job = normalizeJoinOne(row.job);
      const candidate = normalizeJoinOne(row.candidate);
      return { id: row.id, candidateId: row.candidate_id, status: row.status, jobTitle: job?.title ?? "Offre", candidateName: candidate?.full_name ?? candidate?.email ?? "Candidat" } satisfies ApplicationRow;
    }).filter((application) => canAccessEmployee(application.candidateId));
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

    const nextCache: RhDashboardCache = {
      profileId: rhId,
      timestamp: Date.now(),
      employees: mappedEmployees,
      rhColleagues: mappedRhColleagues,
      documentTypes: mappedDocumentTypes,
      documents: mappedDocuments,
      requests: filteredRequests,
      jobOffers: mappedJobOffers,
      applications: mappedApplications,
      activityByEmployeeId: mappedActivityByEmployeeId,
      typeRestrictionsByEmployee: typeRestrictions,
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
      const { data: profileData, error: profileError } = await client.from("profiles").select("id,email,full_name,phone,role,professional_status,employment_status,company_name,esn_partenaire,avatar_url").eq("id", currentSession.user.id).single();
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

  const displayName = useMemo(
    () =>
      displayNameFromMetadata(user?.user_metadata) ??
      profile?.full_name ??
      profile?.email ??
      "utilisateur",
    [profile?.email, profile?.full_name, user?.user_metadata],
  );

  // On depend de `reset` seul, PAS de `collabDocumentFilters` : l'objet du hook change des
  // qu'une valeur de filtre change, et l'effet remettrait alors tout a « all » aussitot apres
  // chaque selection de l'utilisateur. `reset` est un useCallback sans dependance, stable.
  const resetCollabDocumentFilters = collabDocumentFilters.reset;
  useEffect(() => {
    resetCollabDocumentFilters();
  }, [resetCollabDocumentFilters, selectedEmployeeId]);

  const selectedEmployee = useMemo(() => employees.find((employee) => employee.id === selectedEmployeeId) ?? null, [employees, selectedEmployeeId]);
  /*
    Un collegue RH ouvert depuis la liste. Cherche dans `rhColleagues` et non dans
    `employees` : les deux listes restent separees, et c'est le rendu qui choisit la fiche
    a afficher — celle du suivi documentaire pour un consultant, celle du contact pour un
    pair.
  */
  const selectedColleague = useMemo(
    () => rhColleagues.find((colleague) => colleague.id === selectedEmployeeId) ?? null,
    [rhColleagues, selectedEmployeeId],
  );
  const selectedEmployeeBillingProfile = useMemo(
    () => billingProfiles.find((item) => item.employeeId === selectedEmployeeId) ?? null,
    [billingProfiles, selectedEmployeeId],
  );
  const resetBillingProfileDraft = useCallback((employeeId: string, source?: (typeof billingProfiles)[number] | null) => {
    const item = source ?? billingProfiles.find((profileItem) => profileItem.employeeId === employeeId) ?? null;
    setBillingProfileDrafts((prev) => ({
      ...prev,
      [employeeId]: {
        firstName: item?.firstName ?? "",
        lastName: item?.lastName ?? "",
        companyName: item?.companyName ?? "",
        esnPartenaire: item?.esnPartenaire ?? "",
        addressLine1: item?.addressLine1 ?? "",
        addressLine2: item?.addressLine2 ?? "",
        postalCode: item?.postalCode ?? "",
        city: item?.city ?? "",
        country: item?.country ?? "France",
        phone: item?.phone ?? "",
        email: item?.email ?? "",
        siret: item?.siret ?? "",
        iban: item?.iban ?? "",
        bic: item?.bic ?? "",
        dailyRate: item?.dailyRate != null ? String(item.dailyRate) : "",
      },
    }));
  }, [billingProfiles]);
  const activeBillingProfileDraft = useMemo(() => {
    if (!selectedEmployee) return null;
    return (
      billingProfileDrafts[selectedEmployee.id] ?? {
        firstName: selectedEmployeeBillingProfile?.firstName ?? "",
        lastName: selectedEmployeeBillingProfile?.lastName ?? "",
        companyName: selectedEmployeeBillingProfile?.companyName ?? "",
        esnPartenaire: selectedEmployeeBillingProfile?.esnPartenaire ?? "",
        addressLine1: selectedEmployeeBillingProfile?.addressLine1 ?? "",
        addressLine2: selectedEmployeeBillingProfile?.addressLine2 ?? "",
        postalCode: selectedEmployeeBillingProfile?.postalCode ?? "",
        city: selectedEmployeeBillingProfile?.city ?? "",
        country: selectedEmployeeBillingProfile?.country ?? "France",
        phone: selectedEmployeeBillingProfile?.phone ?? "",
        email: selectedEmployeeBillingProfile?.email ?? "",
        siret: selectedEmployeeBillingProfile?.siret ?? "",
        iban: selectedEmployeeBillingProfile?.iban ?? "",
        bic: selectedEmployeeBillingProfile?.bic ?? "",
        dailyRate:
          selectedEmployeeBillingProfile?.dailyRate != null
            ? String(selectedEmployeeBillingProfile.dailyRate)
            : "",
      }
    );
  }, [billingProfileDrafts, selectedEmployee, selectedEmployeeBillingProfile]);
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
    if (!lastSignInAt) return "Jamais connecté";
    const date = new Date(lastSignInAt);
    if (Number.isNaN(date.getTime())) return "Date inconnue";
    /*
      Sans options, `toLocaleString` ajoute les secondes : « 07/09/2026 14:32:07 ». Une
      seconde n'apprend rien sur une derniere connexion, et le chiffre en trop deplace la
      colonne du tableau des collaborateurs a chaque ligne.
    */
    return date.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [activityByEmployeeId]);
  const refreshDashboardData = useCallback(async () => {
    if (!profile?.id || !profile.email || !session?.access_token) return;
    await loadDashboardData(profile.id, session.access_token, {
      id: profile.id,
      fullName: profile.full_name,
      email: profile.email,
    });
  }, [loadDashboardData, profile?.email, profile?.full_name, profile?.id, session?.access_token]);
  const loadBillingProfiles = useCallback(async () => {
    const payload = (await callRhDocumentsApi("/api/rh/billing-profiles")) as {
      items?: {
        employeeId: string;
        profileLabel: string;
        employeeName: string;
        firstName: string | null;
        lastName: string | null;
        companyName: string | null;
        esnPartenaire: string | null;
        addressLine1: string | null;
        addressLine2: string | null;
        postalCode: string | null;
        city: string | null;
        country: string | null;
        phone: string | null;
        email: string | null;
        siret: string | null;
        iban: string | null;
        bic: string | null;
        dailyRate: number;
        updatedAt: string | null;
      }[];
    };
    setBillingProfiles(payload.items ?? []);
  }, [callRhDocumentsApi]);

  useEffect(() => {
    const shouldLoadBillingProfiles =
      currentSection === "documents" || currentSubSection === "collab_detail";
    if (!shouldLoadBillingProfiles || !session?.access_token) return;
    void loadBillingProfiles().catch((error) => {
      setSaveMessage(error instanceof Error ? error.message : "Chargement des profils de facturation impossible.");
    });
  }, [currentSection, currentSubSection, loadBillingProfiles, session?.access_token]);
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
    [selectedEmployeeDocuments],
  );
  const filteredSelectedEmployeeDocuments = useMemo(
    () => collabDocumentFilters.apply(selectedEmployeeDocuments),
    [collabDocumentFilters, selectedEmployeeDocuments],
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
    [filteredSelectedEmployeeDocuments],
  );
  const selectedEmployeeRequests = useMemo(() => requests.filter((request) => request.employeeId === selectedEmployeeId), [requests, selectedEmployeeId]);
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

  /**
   * Collaborateurs ACTIFS. Base commune des listes de personnes du tableau de bord.
   *
   * Un salarie sorti ou inactif n'a plus rien a deposer, et sa derniere connexion n'apprend
   * rien : le lister ne fait que diluer ce sur quoi il y a matiere a agir. Le filtre etait
   * ecrit deux fois, il l'est desormais une seule.
   */
  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.employment_status === "active"),
    [employees],
  );

  /**
   * Collaborateurs actifs n'ayant RIEN depose ce mois-ci.
   *
   * Deux choix de definition, qui changent completement le resultat :
   *
   * 1. On regarde `salarieDocuments`, c'est-a-dire les documents dont l'auteur du depot est
   *    le SALARIE (`uploaderRole === "salarie"`). Un document que le RH a televerse pour
   *    lui ne compte pas : la question est « qui n'a rien fourni », pas « pour qui n'a-t-on
   *    rien ». Sans cette distinction, deposer soi-meme une fiche de paie ferait disparaitre
   *    le collaborateur de la liste alors qu'il n'a rien fait.
   *
   * 2. Seuls les collaborateurs ACTIFS sont comptes. Un salarie sorti ou inactif n'a rien a
   *    deposer, l'y faire figurer noierait la liste sous des faux positifs permanents.
   */
  const employeesWithoutDeposit = useMemo(() => {
    const now = new Date();
    const depositors = new Set(
      salarieDocuments
        .filter((document) => {
          if (!document.createdAt) return false;
          const createdAt = new Date(document.createdAt);
          return (
            !Number.isNaN(createdAt.getTime()) &&
            createdAt.getMonth() === now.getMonth() &&
            createdAt.getFullYear() === now.getFullYear()
          );
        })
        .map((document) => document.employeeId),
    );

    return activeEmployees
      .filter((employee) => !depositors.has(employee.id))
      .map((employee) => ({
        id: employee.id,
        name: employee.full_name ?? employee.email,
        companyName: employee.company_name ?? null,
      }));
  }, [activeEmployees, salarieDocuments]);

  /** Denominateur de la liste ci-dessus. */
  const activeEmployeesCount = activeEmployees.length;

  /**
   * Dernieres connexions, la plus recente en tete.
   *
   * L'application ne suit AUCUNE session ouverte : la seule donnee disponible est
   * `last_sign_in_at`, remontee par `collaborators/activity`. On ne peut donc pas dire qui
   * est connecte, seulement qui s'est connecte en dernier — et c'est ce que la liste montre.
   *
   * `isOnline` reprend la fenetre de 15 minutes deja utilisee par la page admin
   * (`isRecentlyActive`) plutot que d'en inventer une seconde : deux ecrans qui repondent
   * differemment a « qui est connecte » seraient pires que pas de reponse du tout. Les
   * connexions de moins de 15 minutes remontent naturellement en tete, puisque le tri est
   * chronologique.
   *
   * Les comptes jamais connectes sont ECARTES : ils n'ont pas leur place dans une liste de
   * connexions. Ils meriteraient leur propre indicateur, c'est un autre sujet.
   */
  const recentSignIns = useMemo(() => {
    const now = Date.now();
    return activeEmployees
      .map((employee) => {
        const lastSignInAt = activityByEmployeeId[employee.id]?.lastSignInAt ?? null;
        const timestamp = lastSignInAt ? new Date(lastSignInAt).getTime() : Number.NaN;
        return {
          id: employee.id,
          name: employee.full_name ?? employee.email,
          lastSignInAt,
          timestamp,
          isOnline: !Number.isNaN(timestamp) && now - timestamp <= 15 * 60 * 1000,
        };
      })
      .filter((employee) => !Number.isNaN(employee.timestamp))
      .sort((left, right) => right.timestamp - left.timestamp)
      .slice(0, 8);
  }, [activeEmployees, activityByEmployeeId]);

  /** Documents en attente de controle, les plus anciens d'abord : ce sont les plus urgents. */
  const pendingDocumentsForReview = useMemo(
    () =>
      [...pendingDocuments]
        .sort((left, right) => (left.createdAt ?? "").localeCompare(right.createdAt ?? ""))
        .map((document) => ({
          id: document.id,
          employeeName: document.employeeName,
          typeLabel: document.typeLabel,
          periodMonth: document.periodMonth,
          createdAt: document.createdAt,
        })),
    [pendingDocuments],
  );
  const rhDocumentFilterSource = useMemo(
    () =>
      currentSubSection === "docs_all"
        ? activeDocuments
        : currentSubSection === "docs_a_valider"
          ? pendingDocuments
          : [],
    [activeDocuments, currentSubSection, pendingDocuments],
  );
  const rhDocumentTypeOptions = useMemo(
    () => {
      const options = new Set(rhDocumentFilterSource.map((document) => document.typeLabel));
      if (currentSubSection === "docs_corbeille") {
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
    () =>
      Array.from(
        new Set([
          ...employees.map((employee) => employee.full_name ?? employee.email ?? "Utilisateur"),
          ...rhDocumentFilterSource.map((document) => document.employeeName),
        ]),
      ).sort((left, right) => left.localeCompare(right, "fr")),
    [employees, rhDocumentFilterSource],
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
  const filteredPendingDocuments = useMemo(
    () => documentFilters.apply(pendingDocuments),
    [documentFilters, pendingDocuments],
  );
  const filteredRhDocuments = useMemo(
    () => documentFilters.apply(rhDocuments),
    [documentFilters, rhDocuments],
  );
  const filteredAllDocuments = useMemo(
    () => documentFilters.apply(activeDocuments),
    [documentFilters, activeDocuments],
  );
  const showRhFolderTrash = currentSubSection === "docs_corbeille";

  /**
   * Meme moteur de saisie que l'espace salarie : missions multi-entreprises, absences et
   * saisie horaire. Le CRA RH etait auparavant une copie appauvrie de ce calendrier — il
   * ne pointait ni entreprise, ni absence, ni heures.
   *
   * `fallbackTimeUnit` reste « day » : une ligne RH sans mission releve du chemin historique.
   */
  const craEditor = useCraEditor({ missions: craMissionRows, fallbackTimeUnit: "day" });
  // Seules les valeurs que le WORKSPACE utilise lui-meme sont extraites : la generation du
  // payload et la remise a zero. Tout le reste part a l'editeur dans l'objet `craEditor`.
  const {
    craPeriodMonth,
    craNotes,
    craEntries,
    craDraftTotalDays,
    craDraftTotalHours,
    invoiceSettings,
    resetCraEditor,
  } = craEditor;

  const craCalendarCells = useMemo(() => buildCalendarCells(craPeriodMonth), [craPeriodMonth]);
  const openRequests = useMemo(() => requests.filter((request) => ["pending", "uploaded", "rejected", "expired"].includes(request.status)), [requests]);

  const currentMonthDocuments = useMemo(() => {
    const now = new Date();
    return documents.filter((document) => {
      if (!document.createdAt) return false;
      const createdAt = new Date(document.createdAt);
      return !Number.isNaN(createdAt.getTime()) && createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
    });
  }, [documents]);
  /**
   * Filtre de statut de la page Collaborateurs.
   *
   * Il remplace les trois entrees de sous-menu. La route reste la valeur PAR DEFAUT — un
   * signet vers /actifs ouvre donc la page deja filtree — et le choix de l'utilisateur
   * prend le dessus des qu'il touche au filtre. Meme mecanique que le depliage de la barre
   * laterale : `override ?? valeurDeLaRoute`, sans effet de synchronisation.
   */
  const routeEmployeeStatus: EmployeeStatusFilter =
    currentSubSection === "collab_actifs"
      ? "active"
      : currentSubSection === "collab_inactifs"
        ? "inactive"
        : "all";
  const [employeeStatusOverride, setEmployeeStatusOverride] =
    useState<EmployeeStatusFilter | null>(null);
  const employeeStatusFilter = employeeStatusOverride ?? routeEmployeeStatus;

  const collaborateursRows = useMemo(() => {
    if (employeeStatusFilter === "rh") {
      return rhColleagues;
    }
    if (employeeStatusFilter === "active") {
      return employees.filter((employee) => employee.employment_status === "active");
    }
    if (employeeStatusFilter === "inactive") {
      return employees.filter((employee) =>
        ["inactive", "exited"].includes(employee.employment_status ?? ""),
      );
    }
    // « Tous » : les consultants d'abord, les collegues ensuite. L'ordre compte — la page
    // sert d'abord au suivi des consultants.
    return [...employees, ...rhColleagues];
  }, [employeeStatusFilter, employees, rhColleagues]);
  /**
   * Missions de TOUT le perimetre, indexees par collaborateur.
   *
   * La liste affiche les entreprises clientes de chaque ligne. Un collaborateur pouvant en
   * avoir plusieurs, il n'y a pas de champ unique a lire : il faut les charger. Un seul
   * appel sans `employeeId` suffit — le serveur restreint au perimetre des affectations.
   */
  /**
   * On conserve l'IDENTIFIANT de mission, pas seulement le nom.
   *
   * Deux missions peuvent porter le meme nom d'entreprise pour un meme collaborateur — par
   * exemple un client facture a l'heure sur un contrat et au jour sur un autre. Utiliser le
   * nom comme cle React provoquait alors un doublon.
   */
  const [missionsByEmployee, setMissionsByEmployee] = useState<
    Record<string, { id: string; name: string }[]>
  >({});

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const payload = (await callRhDocumentsApi("/api/rh/missions")) as {
          items?: { id: string; employee_id: string; company_name: string }[];
        } | null;
        if (cancelled) return;
        const grouped: Record<string, { id: string; name: string }[]> = {};
        for (const mission of payload?.items ?? []) {
          if (!mission.employee_id || !mission.company_name) continue;
          grouped[mission.employee_id] = [
            ...(grouped[mission.employee_id] ?? []),
            { id: mission.id, name: mission.company_name },
          ];
        }
        setMissionsByEmployee(grouped);
      } catch {
        // Echec silencieux : la colonne se contente d'afficher « - ». Empecher l'affichage
        // de toute la liste des collaborateurs pour ca serait disproportionne.
        if (!cancelled) setMissionsByEmployee({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [callRhDocumentsApi]);

  /**
   * Missions du collaborateur ouvert dans la fiche.
   *
   * Un collaborateur peut travailler pour PLUSIEURS entreprises clientes depuis la
   * migration multi-missions : `profiles.company_name` et le profil de facturation n'en
   * decrivent qu'une, et sont deprecies. La source de verite est `employee_missions`.
   */
  const loadSelectedEmployeeMissions = useCallback(
    async (employeeId: string) => {
      setMissionsLoading(true);
      setMissionsMessage(null);
      try {
        const payload = (await callRhDocumentsApi(
          `/api/rh/missions?employeeId=${encodeURIComponent(employeeId)}`,
        )) as { items?: MissionItem[] } | null;
        setSelectedEmployeeMissions(payload?.items ?? []);
      } catch (error) {
        setSelectedEmployeeMissions([]);
        setMissionsMessage(
          error instanceof Error ? error.message : "Chargement des entreprises impossible.",
        );
      } finally {
        setMissionsLoading(false);
      }
    },
    [callRhDocumentsApi],
  );

  useEffect(() => {
    if (!selectedEmployeeId) {
      setSelectedEmployeeMissions([]);
      return;
    }
    void loadSelectedEmployeeMissions(selectedEmployeeId);
  }, [loadSelectedEmployeeMissions, selectedEmployeeId]);

  const handleMissionSave = useCallback(
    async (form: MissionFormState) => {
      if (!selectedEmployeeId) return;
      setMissionsSaving(true);
      setMissionsMessage(null);
      try {
        await callRhDocumentsApi("/api/rh/missions", {
          // La creation et la modification partagent la meme route : c'est la presence
          // d'un `missionId` qui les distingue, comme cote serveur.
          method: form.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId: selectedEmployeeId,
            missionId: form.id || undefined,
            companyName: form.companyName,
            esnPartenaire: form.esnPartenaire,
            rate: form.rate,
            rateUnit: form.rateUnit,
          }),
        });
        await loadSelectedEmployeeMissions(selectedEmployeeId);
        setMissionsMessage("Entreprise enregistree.");
      } catch (error) {
        setMissionsMessage(
          error instanceof Error ? error.message : "Enregistrement impossible.",
        );
      } finally {
        setMissionsSaving(false);
      }
    },
    [callRhDocumentsApi, loadSelectedEmployeeMissions, selectedEmployeeId],
  );

  /**
   * ARCHIVE la mission, ne la supprime pas.
   *
   * La route RH n'expose deliberement aucun DELETE : une mission est referencee par les CRA
   * et les lignes de facture passes. L'effacer romprait l'historique ; on la retire donc de
   * la liste active en posant `archived_at`.
   */
  const handleMissionDelete = useCallback(
    async (missionId: string) => {
      if (!selectedEmployeeId) return;
      setMissionsSaving(true);
      setMissionsMessage(null);
      try {
        await callRhDocumentsApi("/api/rh/missions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeeId: selectedEmployeeId, missionId, archived: true }),
        });
        await loadSelectedEmployeeMissions(selectedEmployeeId);
        setMissionsMessage("Entreprise archivee.");
      } catch (error) {
        setMissionsMessage(error instanceof Error ? error.message : "Archivage impossible.");
      } finally {
        setMissionsSaving(false);
      }
    },
    [callRhDocumentsApi, loadSelectedEmployeeMissions, selectedEmployeeId],
  );

  /**
   * Demandes ouvertes indexees par collaborateur.
   *
   * L'ancien tableau appelait `requests.filter(...)` DANS le rendu de chaque ligne : cout
   * quadratique, refait a chaque rendu. Un index construit une fois suffit.
   */
  const openRequestsByEmployee = useMemo(() => {
    const counts = new Map<string, number>();
    for (const request of openRequests) {
      counts.set(request.employeeId, (counts.get(request.employeeId) ?? 0) + 1);
    }
    return counts;
  }, [openRequests]);

  const visibleCollaborateurs = useMemo(() => {
    const query = collaborateurSearch.trim().toLowerCase();
    if (!query) return collaborateursRows;
    return collaborateursRows.filter((employee) =>
      // La recherche porte sur les ENTREPRISES CLIENTES reelles, plus sur l'ancien champ
      // unique du profil : chercher « ACME » doit trouver le collaborateur qui y travaille,
      // meme s'il travaille aussi ailleurs.
      [
        employee.full_name,
        employee.email,
        ...(missionsByEmployee[employee.id] ?? []).map((mission) => mission.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [collaborateursRows, collaborateurSearch, missionsByEmployee]);

  /**
   * Notifications de la cloche : ce qui attend une action du RH.
   *
   * DERIVEES de l'etat metier deja charge, faute de table de notifications. Il n'y a donc
   * pas de notion de « lu » : la cloche reflete l'instant present, et se vide quand le
   * travail est fait. C'est une propriete, pas une limite — un compteur qu'on peut marquer
   * lu sans avoir traite les documents ne servirait a rien.
   *
   * Deux sources : les documents deposes en attente de controle, et les demandes dont
   * l'echeance est passee. Les plus anciennes d'abord.
   */
  const consoleNotifications = useMemo<ConsoleNotification[]>(() => {
    const documents = pendingDocumentsForReview.slice(0, 6).map((document) => ({
      id: `doc-${document.id}`,
      title: `${document.typeLabel} a valider`,
      description: document.employeeName,
      createdAtLabel: document.createdAt
        ? `Depose le ${formatDate(document.createdAt)}`
        : null,
      href: "/dashboard/rh/documents/a-valider",
    }));

    const now = Date.now();
    const overdue = openRequests
      .filter((request) => {
        if (!request.dueAt) return false;
        const due = new Date(request.dueAt).getTime();
        return !Number.isNaN(due) && due < now;
      })
      .slice(0, 6)
      .map((request) => ({
        id: `req-${request.id}`,
        title: `${request.typeLabel} en retard`,
        description: request.employeeName,
        createdAtLabel: `Echeance du ${formatDate(request.dueAt)}`,
        href: "/dashboard/rh/documents/mes-demandes",
      }));

    return [...documents, ...overdue];
  }, [openRequests, pendingDocumentsForReview]);

  /**
   * URL publique d'une photo, reconstituee cote client.
   *
   * La base ne stocke qu'un chemin. Le bucket etant public, l'URL se compose sans appel :
   * inutile de faire signer chaque ligne du tableau par le serveur.
   */
  const avatarUrlOf = useCallback((path: string | null | undefined) => {
    if (!path || !supabase) return null;
    return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }, []);

  /** Lignes du tableau des collaborateurs, pretes a afficher. */
  const collaborateurRows = useMemo(
    () =>
      visibleCollaborateurs.map((employee) => {
        const isColleague = employee.role === "rh";
        return {
          id: employee.id,
          fullName: employee.full_name,
          email: employee.email,
          role: employee.role,
          avatarUrl: avatarUrlOf(employee.avatar_url),
          companies: isColleague ? [] : (missionsByEmployee[employee.id] ?? []),
          employmentStatus: employee.employment_status ?? null,
          isOnline: isColleague ? false : isRecentlyActive(employee.id),
          /*
            Les colonnes propres au suivi d'un consultant restent VIDES pour un collegue :
            entreprises clientes, demandes, derniere connexion. Cette derniere n'est pas
            connue — la route d'activite ne rend que les comptes affectes —, et afficher
            « 0 demande » pour quelqu'un a qui on n'en adresse jamais serait une reponse a
            une question qui ne se pose pas.
          */
          lastSignInLabel: isColleague ? "—" : formatLastSignIn(employee.id),
          openRequestsCount: isColleague ? null : (openRequestsByEmployee.get(employee.id) ?? 0),
        };
      }),
    [
      avatarUrlOf,
      formatLastSignIn,
      isRecentlyActive,
      missionsByEmployee,
      openRequestsByEmployee,
      visibleCollaborateurs,
    ],
  );
  const salarieUploadableTypes = useMemo(() => documentTypes.filter((documentType) => documentType.allowedUploaderRoles.length === 0 || documentType.allowedUploaderRoles.includes("salarie")), [documentTypes]);
  const rhUploadableTypes = useMemo(() => documentTypes.filter((documentType) => documentType.allowedUploaderRoles.length === 0 || documentType.allowedUploaderRoles.includes("rh")), [documentTypes]);
  // Restrict the document type to those allowed for the selected employee.
  // null/empty restriction = all types allowed.
  const allowedTypeIdsForEmployee = useCallback(
    (employeeId: string): Set<string> | null => {
      // Un document interne n'appartient a aucun collaborateur : aucune restriction de type
      // par salarie ne s'y applique.
      if (!employeeId || employeeId === BATCH_NO_EMPLOYEE) return null;
      const allowed = typeRestrictionsByEmployee[employeeId];
      if (!allowed || allowed.length === 0) return null;
      return new Set(allowed);
    },
    [typeRestrictionsByEmployee],
  );
  const requestForm = useDocumentRequestForm(salarieUploadableTypes, allowedTypeIdsForEmployee);

  const handleSignOut = useCallback(async () => {
    if (!supabase) return;
    // Les preferences et l'identite sont propres au compte : on ne les laisse pas
    // en place pour celui qui se connectera ensuite dans le meme onglet.
    resetAppearanceHydration();
    resetAccountIdentity();
    await forceClientSignOut(supabase);
    router.push("/auth?logged_out=1");
  }, [router]);

  const openRequestDialog = useCallback(
    (employeeId?: string) => {
      // Le message de page appartient au workspace, pas au formulaire : le hook ne le touche pas.
      setSaveMessage(null);
      requestForm.openDialog(employeeId);
    },
    [requestForm],
  );

  const batchForm = useBatchUploadForm(employees, allowedTypeIdsForEmployee);

  /**
   * Ouvre le depot. `employeeId` impose le collaborateur quand on part de sa fiche ; sinon
   * l'attribution vient du nom de fichier.
   */
  const openRhBatchDialog = useCallback(
    (employeeId?: string) => {
      // Le message de page appartient au workspace, pas au formulaire.
      setSaveMessage(null);
      batchForm.openDialog(employeeId);
    },
    [batchForm],
  );

  /** Un document de meme collaborateur, type et periode existe-t-il deja ? */
  const isRhBatchRowDuplicate = useCallback(
    (row: BatchUploadRow) => {
      if (!row.employeeId || row.employeeId === BATCH_NO_EMPLOYEE || !row.documentTypeId) {
        return false;
      }
      // period_month est une colonne date ("2026-08-01") : on compare sur "YYYY-MM" pour
      // rester juste meme si le format renvoye gagnait une partie horaire.
      return documents.some(
        (document) =>
          !document.deletedAt &&
          document.employeeId === row.employeeId &&
          document.documentTypeId === row.documentTypeId &&
          (document.periodMonth ?? "").slice(0, 7) === row.periodMonth,
      );
    },
    [documents],
  );
  /**
   * Remise a zero complete : le brouillon appartient au hook, la cible de generation au
   * workspace.
   */
  const resetRhCraEditor = useCallback(() => {
    setGenerateEmployeeId(selectedEmployeeId ?? "");
    resetCraEditor();
  }, [resetCraEditor, selectedEmployeeId]);

  /**
   * Missions du collaborateur cible. Rechargees a chaque changement de collaborateur : ce
   * sont ses entreprises clientes qui portent le tarif et l'unite de chaque ligne.
   */
  useEffect(() => {
    if (!generateEmployeeId) {
      setCraMissionRows([]);
      return;
    }
    let cancelled = false;
    setCraMissionsLoading(true);
    void (async () => {
      try {
        const payload = (await callRhDocumentsApi(
          `/api/rh/missions?employeeId=${encodeURIComponent(generateEmployeeId)}`,
        )) as { items?: CraEditorMission[] } | null;
        if (cancelled) return;
        setCraMissionRows(payload?.items ?? []);
      } catch (error) {
        if (cancelled) return;
        // Sans mission, l'editeur reste utilisable sur le chemin historique (en journees).
        setCraMissionRows([]);
        setSaveMessage(
          error instanceof Error ? error.message : "Chargement des missions impossible.",
        );
      } finally {
        if (!cancelled) setCraMissionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [callRhDocumentsApi, generateEmployeeId]);

  /**
   * Modification d'un champ du profil de facturation.
   *
   * La fiche ne connait plus la forme du brouillon : elle envoie une retouche partielle,
   * le workspace la fusionne. Chacun des dix champs portait auparavant sa propre copie de
   * ce `setBillingProfileDrafts((prev) => ({ ...prev, [id]: { ...draft, champ: valeur } }))`.
   */
  const handleBillingDraftChange = useCallback(
    (patch: Partial<typeof activeBillingProfileDraft>) => {
      if (!selectedEmployee || !activeBillingProfileDraft) return;
      setBillingProfileDrafts((prev) => ({
        ...prev,
        [selectedEmployee.id]: { ...activeBillingProfileDraft, ...patch },
      }));
    },
    [activeBillingProfileDraft, selectedEmployee],
  );

  /** Le statut d'emploi vit dans `profiles`, pas dans le profil de facturation. */
  const handleEmploymentStatusChange = useCallback(
    (value: string) => {
      if (!selectedEmployee || !activeDraft) return;
      setEmployeeDrafts((prev) => ({
        ...prev,
        [selectedEmployee.id]: { ...activeDraft, employment_status: value },
      }));
    },
    [activeDraft, selectedEmployee],
  );

  /*
    Entrer et sortir du mode edition remettent TOUS LES DEUX les brouillons a l'etat
    enregistre : a l'ouverture pour repartir de la base et non d'une saisie abandonnee, a
    l'annulation pour jeter ce qui vient d'etre tape.
  */
  const handleStartBillingEdit = useCallback(() => {
    if (!selectedEmployee) return;
    resetBillingProfileDraft(selectedEmployee.id, selectedEmployeeBillingProfile);
    resetEmployeeDraft(selectedEmployee);
    setIsBillingProfileEditMode(true);
  }, [resetBillingProfileDraft, resetEmployeeDraft, selectedEmployee, selectedEmployeeBillingProfile]);

  const handleCancelBillingEdit = useCallback(() => {
    if (!selectedEmployee) return;
    resetBillingProfileDraft(selectedEmployee.id, selectedEmployeeBillingProfile);
    resetEmployeeDraft(selectedEmployee);
    setIsBillingProfileEditMode(false);
  }, [resetBillingProfileDraft, resetEmployeeDraft, selectedEmployee, selectedEmployeeBillingProfile]);

  const handleSaveBillingProfile = useCallback(async () => {
    if (!supabase || !selectedEmployee || !activeBillingProfileDraft || !activeDraft) return;
    setBillingProfileSaving(true);
    setSaveMessage(null);
    try {
      // Le statut d'emploi part avec le profil de facturation : la route verifie que le
      // collaborateur releve bien du perimetre de ce RH, ce que l'ecriture directe dans
      // `profiles` ne faisait pas.
      await callRhDocumentsApi("/api/rh/billing-profiles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employmentStatus: activeDraft.employment_status,
          employeeId: selectedEmployee.id,
          firstName: activeBillingProfileDraft.firstName,
          lastName: activeBillingProfileDraft.lastName,
          /*
           * Les trois champs deprecies — entreprise, ESN, tarif journalier — ne sont plus
           * modifiables depuis la fiche : l'entreprise cliente vit dans les missions. Ils
           * sont transmis TELS QU'ILS ONT ETE CHARGES, pour ne pas effacer ce qui existe
           * en base sur les profils anterieurs.
           */
          companyName: activeBillingProfileDraft.companyName,
          esnPartenaire: activeBillingProfileDraft.esnPartenaire,
          addressLine1: activeBillingProfileDraft.addressLine1,
          addressLine2: activeBillingProfileDraft.addressLine2,
          postalCode: activeBillingProfileDraft.postalCode,
          city: activeBillingProfileDraft.city,
          country: activeBillingProfileDraft.country,
          phone: activeBillingProfileDraft.phone,
          email: activeBillingProfileDraft.email,
          siret: activeBillingProfileDraft.siret,
          iban: activeBillingProfileDraft.iban,
          bic: activeBillingProfileDraft.bic,
          /*
           * On transmet la CHAINE, pas `Number(... || 0)`.
           *
           * Un tarif vide donnait `0`, et le serveur refuse un tarif nul : l'enregistrement
           * echouait sur « le champ tarif journalier est invalide », a propos d'un champ que
           * la fiche n'affiche plus. Une chaine vide est bien interpretee comme « absent ».
           */
          dailyRate: activeBillingProfileDraft.dailyRate || null,
        }),
      });
      await loadBillingProfiles();
      await refreshDashboardData();
      setIsBillingProfileEditMode(false);
      setSaveMessage("Profil de facturation mis a jour.");
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Enregistrement du profil de facturation impossible.");
    } finally {
      setBillingProfileSaving(false);
    }
  }, [activeBillingProfileDraft, activeDraft, callRhDocumentsApi, loadBillingProfiles, refreshDashboardData, selectedEmployee]);

  const handleCreateRequest = useCallback(async () => {
    if (!requestForm.employeeId || !requestForm.documentTypeId) {
      setSaveMessage("Choisis un collaborateur et un type de document.");
      return;
    }
    if (requestForm.selectedType?.requiresPeriod && !requestForm.periodMonth) {
      setSaveMessage("Ce type de document demande une periode.");
      return;
    }

    requestForm.setCreating(true);
    setSaveMessage(null);

    try {
      await callRhDocumentsApi("/api/rh/document-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: requestForm.employeeId,
          documentTypeId: requestForm.documentTypeId,
          periodMonth: requestForm.periodMonth || null,
          dueAt: requestForm.dueAt || null,
          note: requestForm.note.trim() || null,
        }),
      });
      setSaveMessage("Demande documentaire creee.");
      requestForm.setOpen(false);
      requestForm.reset();
      await refreshDashboardData();
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Creation de la demande impossible.");
    } finally {
      requestForm.setCreating(false);
    }
  }, [callRhDocumentsApi, refreshDashboardData, requestForm]);

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

  /**
   * Depose le lot en appelant la route unitaire existante, un appel par fichier.
   *
   * Volontairement pas d'endpoint de lot : la route porte deja le controle d'affectation
   * RH, la restriction de type par salarie, la validation de periode, la notification du
   * salarie et la cloture de la demande correspondante.
   */
  const handleRhBatchUpload = useCallback(async () => {
    const accessToken = await getFreshAccessToken();
    if (!accessToken) {
      setSaveMessage("Session RH manquante.");
      return;
    }

    const pendingRows = batchForm.rows.filter(
      (row) => row.status !== "done" && !getBatchRowIssue(row, documentTypes),
    );
    if (!pendingRows.length) return;

    batchForm.setUploading(true);
    setSaveMessage(null);
    batchForm.setRows((previousRows) =>
      previousRows.map((row) =>
        pendingRows.some((pending) => pending.key === row.key)
          ? { ...row, status: "uploading", error: null }
          : row,
      ),
    );

    const uploadRow = async (row: BatchUploadRow) => {
      const formData = new FormData();
      // Champ omis pour un document interne : la route rattache alors le document au RH,
      // exactement comme le faisait le depot unitaire sans collaborateur.
      if (row.employeeId !== BATCH_NO_EMPLOYEE) {
        formData.set("employeeId", row.employeeId);
      }
      formData.set("documentTypeId", row.documentTypeId);
      if (row.periodMonth) formData.set("periodMonth", row.periodMonth);
      formData.set("file", row.file);

      try {
        const response = await fetch("/api/rh/documents/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: formData,
        });
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        if (!response.ok) {
          return { key: row.key, error: payload?.error ?? "Depot impossible." };
        }
        return { key: row.key, error: null };
      } catch (error) {
        return {
          key: row.key,
          error: error instanceof Error ? error.message : "Depot impossible.",
        };
      }
    };

    // Concurrence bornee : un lot de 30 fiches de paie ne doit pas ouvrir 30 requetes
    // simultanees. Chaque ligne est mise a jour des qu'elle aboutit.
    const CONCURRENCY = 3;
    const queue = [...pendingRows];
    let successCount = 0;
    let failureCount = 0;

    const worker = async () => {
      for (;;) {
        const row = queue.shift();
        if (!row) return;
        const result = await uploadRow(row);
        if (result.error) failureCount += 1;
        else successCount += 1;
        batchForm.setRows((previousRows) =>
          previousRows.map((current) =>
            current.key === result.key
              ? {
                  ...current,
                  status: result.error ? "error" : "done",
                  error: result.error,
                }
              : current,
          ),
        );
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));

    batchForm.setUploading(false);
    setSaveMessage(
      failureCount
        ? `${successCount} document(s) depose(s), ${failureCount} en echec.`
        : `${successCount} document(s) depose(s).`,
    );
    await refreshDashboardData();
  }, [batchForm, documentTypes, refreshDashboardData]);

  const buildRhGeneratePayload = useCallback((kind: "cra" | "facture") => {
    if (!generateEmployeeId || !craPeriodMonth) {
      setSaveMessage("Choisis un collaborateur et une periode.");
      return null;
    }
    // Les lignes partent telles quelles : mission, absence et heures comprises. Le serveur
    // les valide par `parseCraEntries`, la meme fonction que le chemin salarie — inutile de
    // filtrer ici, un rejet explicite vaut mieux qu'une ligne silencieusement omise.
    const entriesPayload = craEntries
      .filter((entry) => entry.workDate.trim())
      .map((entry) => ({
        workDate: entry.workDate,
        dayQuantity: entry.dayQuantity === "" ? undefined : Number(entry.dayQuantity),
        hours: entry.hours === "" ? undefined : Number(entry.hours),
        missionId: entry.missionId || undefined,
        absenceType: entry.absenceType || undefined,
        label: entry.label,
      }));
    if (!entriesPayload.length) {
      setSaveMessage("Selectionne au moins un jour travaille.");
      return null;
    }
    if (craDraftTotalDays <= 0 && craDraftTotalHours <= 0) {
      setSaveMessage("Selectionne au moins un jour ou une heure travaille.");
      return null;
    }
    return {
      kind,
      employeeId: generateEmployeeId,
      periodMonth: craPeriodMonth,
      workedDaysCount: craDraftTotalDays,
      notes: craNotes,
      entries: entriesPayload,
      discountGranted: invoiceSettings.discountGranted,
      vatEnabled: invoiceSettings.vatEnabled,
      amountAlreadyPaid:
        invoiceSettings.amountAlreadyPaid.trim() === ""
          ? 0
          : Number(invoiceSettings.amountAlreadyPaid),
    };
  }, [craDraftTotalDays, craDraftTotalHours, craEntries, craNotes, craPeriodMonth, generateEmployeeId, invoiceSettings]);

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
      setGenerationResult({
        tone: "success",
        title: "CRA généré",
        message: "Le CRA a été généré et ajouté aux documents du collaborateur.",
      });
      await refreshDashboardData();
    } catch (error) {
      setGenerationResult({
        tone: "error",
        title: "CRA non généré",
        message: error instanceof Error ? error.message : "Génération impossible.",
      });
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
      setGenerationResult({
        tone: "success",
        title: "Facture générée",
        message: "La facture a été générée et ajoutée aux documents du collaborateur.",
      });
      await refreshDashboardData();
    } catch (error) {
      setGenerationResult({
        tone: "error",
        title: "Facture non générée",
        message: error instanceof Error ? error.message : "Génération impossible.",
      });
    } finally {
      setInvoiceGenerating(false);
    }
  }, [buildRhGeneratePayload, callRhDocumentsApi, refreshDashboardData]);

  const handleGenerateRhLeavePdf = useCallback(
    async (payload: RhLeaveRequestPayload) => {
      setLeaveGenerating(true);
      setSaveMessage(null);
      try {
        await callRhDocumentsApi("/api/rh/conge/generate-pdf", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        setSaveMessage("Demande de congé generee avec succes.");
        await refreshDashboardData();
      } catch (error) {
        setSaveMessage(error instanceof Error ? error.message : "Generation impossible.");
      } finally {
        setLeaveGenerating(false);
      }
    },
    [callRhDocumentsApi, refreshDashboardData],
  );

  const handleDeleteRhDocument = useCallback(async (document: RHDocumentRow, permanent = false) => {
    const accessToken = await getFreshAccessToken();
    if (!accessToken) {
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
        Authorization: `Bearer ${accessToken}`,
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
  }, [refreshDashboardData]);

  const restoreRhDocument = useCallback(async (document: RHDocumentRow) => {
    const accessToken = await getFreshAccessToken();
    if (!accessToken) {
      setSaveMessage("Session RH manquante.");
      return;
    }
    setDeletingRhDocumentId(document.id);
    setSaveMessage(null);
    const response = await fetch("/api/rh/documents/upload", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
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
  }, [refreshDashboardData]);

  const handleReviewDocument = useCallback(async (document: RHDocumentRow, nextStatus: "pending" | "validated" | "rejected") => {
    const accessToken = await getFreshAccessToken();
    if (!accessToken) {
      setSaveMessage("Session RH manquante.");
      return;
    }

    const reviewComment = (reviewDrafts[document.id] ?? "").trim();
    if (nextStatus === "rejected" && !reviewComment) {
      setSaveMessage("Un commentaire est obligatoire pour refuser un document.");
      return;
    }

    setReviewingDocumentId(document.id);
    setSaveMessage(null);

    // La revue passe par l'API : elle seule verifie que le collaborateur et le type de
    // document relevent bien du perimetre de ce RH, et elle derive `reviewed_by` du jeton
    // plutot que de faire confiance au navigateur.
    const response = await fetch("/api/rh/documents/review", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        documentId: document.id,
        status: nextStatus,
        reviewComment,
      }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setSaveMessage(payload?.error ?? "Mise a jour du statut impossible.");
      setReviewingDocumentId(null);
      await refreshDashboardData();
      return;
    }

    setReviewDrafts((prev) => ({ ...prev, [document.id]: "" }));
    setSaveMessage(nextStatus === "validated" ? "Document valide." : nextStatus === "rejected" ? "Document refuse." : "Document remis en attente.");
    setReviewingDocumentId(null);
    await refreshDashboardData();
  }, [refreshDashboardData, reviewDrafts]);

  return (
    <ConsoleShell
      role="rh"
      email={profile?.email ?? user?.email ?? "-"}
      displayName={displayName}
      onSignOut={handleSignOut}
      hidePageHeader
      notifications={consoleNotifications}
    >
      {/*
        Le contenu est MASQUE — et non demonte — pendant le premier chargement : le
        squelette prend sa place juste dessous. Le garder monte evite de recreer tous les
        etats des sections quand les donnees arrivent, et `display:none` le retire aussi
        de l'arbre d'accessibilite, donc rien n'est lu deux fois.
      */}
      <div className={loading ? "hidden" : "space-y-4"}>
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
              pendingDocuments={pendingDocumentsForReview}
              recentSignIns={recentSignIns}
              employeesWithoutDeposit={employeesWithoutDeposit}
              activeEmployeesCount={activeEmployeesCount}
            />
          )}

          {currentSection === "collaborateurs" &&
            (currentSubSection === "collab_detail" && selectedColleague ? (
              <ConsoleColleagueDetail
                colleague={{
                  id: selectedColleague.id,
                  name: selectedColleague.full_name ?? "",
                  email: selectedColleague.email,
                  phone: selectedColleague.phone,
                  avatarUrl: avatarUrlOf(selectedColleague.avatar_url),
                }}
                messagesHref={RH_NAV_CONFIG.messagesHref}
              />
            ) : currentSubSection === "collab_detail" && selectedEmployee && activeDraft ? (
              <ConsoleCollaborateurDetail
                employee={{
                  id: selectedEmployee.id,
                  name: selectedEmployee.full_name ?? "",
                  email: selectedEmployee.email,
                  phone: selectedEmployee.phone,
                  avatarUrl: avatarUrlOf(selectedEmployee.avatar_url),
                }}
                lastSignInLabel={formatLastSignIn(selectedEmployee.id)}
                isOnline={isRecentlyActive(selectedEmployee.id)}
                messagesHref={RH_NAV_CONFIG.messagesHref}
                employmentStatus={activeDraft.employment_status}
                onEmploymentStatusChange={handleEmploymentStatusChange}
                billingDraft={activeBillingProfileDraft}
                onBillingDraftChange={handleBillingDraftChange}
                editing={isBillingProfileEditMode}
                saving={billingProfileSaving}
                onStartEdit={handleStartBillingEdit}
                onCancelEdit={handleCancelBillingEdit}
                onSave={() => void handleSaveBillingProfile()}
                missions={{
                  items: selectedEmployeeMissions,
                  onSave: handleMissionSave,
                  onDelete: handleMissionDelete,
                  saving: missionsSaving,
                  loading: missionsLoading,
                  message: missionsMessage,
                }}
                requests={selectedEmployeeRequests}
                onRequestDocument={() => openRequestDialog(selectedEmployee.id)}
                applications={selectedEmployeeApplications}
                documents={{
                  items: selectedEmployeeDocumentListItems,
                  totalCount: selectedEmployeeDocuments.length,
                  storageScope: user?.id ?? profile?.id ?? null,
                  authToken: session?.access_token ?? null,
                  filterValues: {
                    type: collabDocumentFilters.type,
                    period: collabDocumentFilters.period,
                    status: collabDocumentFilters.status,
                    owner: collabDocumentFilters.creator,
                  },
                  filterOptions: selectedEmployeeDocumentFilterOptions,
                  onFilterChange: (field, value) => {
                    if (field === "type") collabDocumentFilters.setType(value);
                    if (field === "period") collabDocumentFilters.setPeriod(value);
                    if (field === "status") collabDocumentFilters.setStatus(value);
                    if (field === "owner") collabDocumentFilters.setCreator(value);
                  },
                  onView: handleViewDocument,
                  onDownload: handleDownloadDocument,
                  viewingId: viewingDocumentId,
                  downloadingId: downloadingDocumentId,
                  onImport: () => openRhBatchDialog(selectedEmployee.id),
                }}
              />
            ) : (
              <div className="space-y-2">
                {/*
                  Le titre etait porte par un `CardHeader` ; le reste de la console n'en
                  utilise plus. Un simple titre de page suffit — la fiche, elle, porte le
                  nom du collaborateur en `h1`.
                */}
                <h1 className="text-app-lg font-semibold text-app-text">Collaborateurs</h1>
                <ConsoleCollaborateursTable
                  rows={collaborateurRows}
                  search={collaborateurSearch}
                  onSearchChange={setCollaborateurSearch}
                  statusFilter={employeeStatusFilter}
                  onStatusFilterChange={setEmployeeStatusOverride}
                />
              </div>
            ))}          {currentSection === "documents" && (
            <div className="space-y-3">
              <RhDocumentsSection
              storageScope={user?.id ?? profile?.id ?? null}
              preferencesAuthToken={session?.access_token ?? null}
              currentSubSection={currentSubSection}
              documentTypeFilter={documentFilters.type}
              documentPeriodFilter={documentFilters.period}
              documentStatusFilter={documentFilters.status}
              documentCreatorFilter={documentFilters.creator}
              rhFilterOptions={rhFilterOptions}
              onDocumentTypeFilterChange={documentFilters.setType}
              onDocumentPeriodFilterChange={documentFilters.setPeriod}
              onDocumentStatusFilterChange={documentFilters.setStatus}
              onDocumentCreatorFilterChange={documentFilters.setCreator}
              onOpenRhUploadDialog={() => openRhBatchDialog()}
              onOpenRequestDialog={() => {
                setSaveMessage(null);
                openRequestDialog();
              }}
              generateEmployeeId={generateEmployeeId}
              billingProfiles={billingProfiles}
              employees={employees}
              craGenerating={craGenerating}
              invoiceGenerating={invoiceGenerating}
              leaveGenerating={leaveGenerating}
              onGenerateLeavePdf={handleGenerateRhLeavePdf}
              // Le brouillon entier passe en un objet : l'editeur riche lit une quarantaine
              // de valeurs, les enumerer une par une n'apporterait rien.
              craEditor={craEditor}
              craCalendarCells={craCalendarCells}
              craMissionsLoading={craMissionsLoading}
              onGenerateEmployeeIdChange={setGenerateEmployeeId}
              onGenerateCraPdf={handleGenerateRhCraPdf}
              onGenerateInvoicePdf={handleGenerateRhInvoicePdf}
              resetCraEditor={resetRhCraEditor}
              requests={requests}
              cancellingRequestId={cancellingRequestId}
              onCancelRequest={handleCancelRequest}
              filteredAllDocuments={filteredAllDocuments}
              filteredPendingDocuments={filteredPendingDocuments}
              filteredRhDocuments={filteredRhDocuments}
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

      </div>

      <Dialog
        open={requestForm.open}
        onOpenChange={(open) => {
          requestForm.setOpen(open);
          if (!open) requestForm.reset();
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
                <select value={requestForm.employeeId} onChange={(event) => requestForm.setEmployeeId(event.target.value)} className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm">
                  <option value="">Choisir un collaborateur</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>{employee.full_name ?? employee.email}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Type de document</label>
                <select value={requestForm.documentTypeId} onChange={(event) => requestForm.setDocumentTypeId(event.target.value)} className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm">
                  <option value="">Choisir un type</option>
                  {requestForm.requestableTypes.map((documentType) => (
                    <option key={documentType.id} value={documentType.id}>{documentType.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Echeance</label>
                <input type="date" value={requestForm.dueAt} onChange={(event) => requestForm.setDueAt(event.target.value)} className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Periode {requestForm.selectedType?.requiresPeriod ? "(obligatoire)" : "(optionnelle)"}
                </label>
                <input type="month" value={requestForm.periodMonth} onChange={(event) => requestForm.setPeriodMonth(event.target.value)} className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Note</label>
              <textarea value={requestForm.note} onChange={(event) => requestForm.setNote(event.target.value)} rows={4} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Message ou precision pour le collaborateur" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { requestForm.setOpen(false); requestForm.reset(); }}>
              Annuler
            </Button>
            <Button type="button" onClick={() => void handleCreateRequest()} disabled={requestForm.creating}>
              {requestForm.creating ? "Creation..." : "Creer la demande"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConsoleResultDialog
        result={generationResult}
        onClose={() => setGenerationResult(null)}
      />

      <RhBatchUploadDialog
        open={batchForm.open}
        onOpenChange={(open) => {
          batchForm.setOpen(open);
          if (!open) batchForm.reset();
        }}
        rows={batchForm.rows}
        employees={employees}
        documentTypes={rhUploadableTypes}
        defaultDocumentTypeId={batchForm.defaultTypeId}
        onDefaultDocumentTypeChange={batchForm.handleDefaultTypeChange}
        onFilesSelected={batchForm.handleFilesSelected}
        onRowChange={batchForm.handleRowChange}
        onRemoveRow={batchForm.handleRemoveRow}
        allowedTypeIdsForEmployee={allowedTypeIdsForEmployee}
        isDuplicate={isRhBatchRowDuplicate}
        onSubmit={handleRhBatchUpload}
        uploading={batchForm.uploading}
      />

      {loading && (
        <ConsoleLoadingSkeleton
          label="Chargement des données..."
          showStats={currentSection === "overview"}
        />
      )}
    </ConsoleShell>
  );
}
