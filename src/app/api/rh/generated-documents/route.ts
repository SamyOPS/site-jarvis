import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { canManageOwner } from "@/app/api/documents/_shared";
import type { InvoiceLineInput } from "@/features/dashboard/salarie/invoice-totals";
import {
  DAY_UNIT,
  parseCraEntries,
  sumAbsenceDays,
  type CraEntryInput,
  type ParsedCraEntry,
} from "@/lib/cra-entries";
import { buildCraPdfBuffer } from "@/lib/cra-pdf";
import {
  buildInvoiceLinesFromEntries,
  loadEmployeeMissions,
  syncCraMissionLines,
} from "@/lib/missions";
import { buildEmployeeDocumentPath } from "@/lib/document-storage";
import { notifyEmployeeOfDocument } from "@/lib/email";
import { buildInvoicePdfBuffer } from "@/lib/invoice-pdf";
import { assertRhAccess } from "@/lib/rh-access";
import { ApiError, withActor } from "@/lib/api-handler";
import { readPdfLogoBase64 } from "@/lib/pdf-logo";
import { toDocumentDate, toIsoMonthStart } from "@/lib/server-supabase";

async function notifyEmployeeForGeneratedDocument(
  adminClient: any,
  params: { employeeId: string; actorId: string; documentLabel: string; periodMonth: string | null },
) {
  try {
    const [{ data: employee }, { data: actor }] = await Promise.all([
      adminClient.from("profiles").select("email,full_name").eq("id", params.employeeId).single(),
      adminClient.from("profiles").select("full_name,email").eq("id", params.actorId).single(),
    ]);
    if (!employee?.email) return;
    await notifyEmployeeOfDocument({
      employeeEmail: employee.email,
      employeeName: employee.full_name,
      documentLabel: params.documentLabel,
      periodMonth: params.periodMonth,
      uploaderName: actor?.full_name ?? actor?.email ?? null,
    });
  } catch (error) {
    console.error("[email] notify employee (generated) failed", error);
  }
}

export const runtime = "nodejs";

type GenerateKind = "cra" | "facture";

type GeneratePayload = {
  kind?: unknown;
  employeeId?: unknown;
  billingProfileEmployeeId?: unknown;
  periodMonth?: unknown;
  workedDaysCount?: unknown;
  notes?: unknown;
  entries?: unknown;
  discountGranted?: unknown;
  vatEnabled?: unknown;
  amountAlreadyPaid?: unknown;
};

type GenerateEntryPayload = {
  workDate?: unknown;
  dayQuantity?: unknown;
  label?: unknown;
  /** Entreprise cliente de la ligne. Absent = CRA mono-entreprise, comme avant. */
  missionId?: unknown;
  /** Type d'absence, exclusif avec `missionId`. */
  absenceType?: unknown;
  /** Quantite en heures, pour une mission facturee a l'heure. */
  hours?: unknown;
};

function parsePositiveInteger(value: unknown, field: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    throw new Error(`Le champ "${field}" doit etre un entier strictement positif.`);
  }
  return parsed;
}

/**
 * Repartit un simple nombre de jours sur les jours ouvres du mois.
 *
 * Chemin historique : le RH donne « 18 jours » sans pointer de calendrier. Les lignes
 * produites n'ont ni mission ni absence — elles retombent donc sur le rendu mono-entreprise
 * du PDF, exactement comme avant l'alignement sur le chemin salarie.
 */
function buildWorkEntries(periodMonth: string, workedDaysCount: number): ParsedCraEntry[] {
  const entries: ParsedCraEntry[] = [];
  const monthStart = new Date(`${periodMonth}T00:00:00.000Z`);
  const cursor = new Date(monthStart);

  while (entries.length < workedDaysCount) {
    if (cursor.getUTCMonth() !== monthStart.getUTCMonth()) {
      throw new Error("Impossible de repartir le nombre de jours travailles sur la periode.");
    }
    const dayOfWeek = cursor.getUTCDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      entries.push({
        work_date: cursor.toISOString().slice(0, 10),
        mission_id: null,
        absence_type: null,
        day_quantity: 1,
        hours: null,
        label: null,
      });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return entries;
}

function parseAmountAlreadyPaid(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return 0;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Le champ \"montant deja paye\" doit etre un nombre positif ou nul.");
  }
  return parsed;
}

type GeneratedDocumentUpsert = {
  employeeId: string;
  actorId: string;
  documentTypeId: string;
  periodStart: string;
  documentDate: string;
  storageBucket: string;
  storagePath: string;
  fileName: string;
  sizeBytes: number;
  now: string;
  /** « Genere par RH » au masculin pour le CRA, au feminin pour la facture. */
  reviewComment: string;
  alreadyValidatedMessage: string;
  insertErrorMessage: string;
};

/**
 * Cree ou remplace le document genere de la periode, et rend son identifiant.
 *
 * Ce bloc etait ecrit deux fois — une fois pour le CRA, une fois pour la facture — a trois
 * messages pres. Ce qui suit differe reellement entre les deux (mise a jour de
 * `cra_records`, contenu de l'evenement journalise) reste chez l'appelant.
 *
 * `previousStoragePath` n'est renseigne que si un document existait : l'appelant s'en sert
 * pour retirer l'ancien fichier, et le retirer alors qu'on vient d'inserer detruirait le
 * fichier tout juste depose.
 */
async function upsertGeneratedDocument(
  adminClient: SupabaseClient,
  options: GeneratedDocumentUpsert,
): Promise<{ documentId: string; previousStoragePath: string | null }> {
  const { data: existingDocument } = await adminClient
    .from("employee_documents")
    .select("id,status,storage_path,deleted_at")
    .eq("employee_id", options.employeeId)
    .eq("document_type_id", options.documentTypeId)
    .eq("period_month", options.periodStart)
    .order("created_at", { ascending: false })
    .limit(1);

  const existing = existingDocument?.[0] ?? null;
  if (existing?.status === "validated" && !existing?.deleted_at) {
    throw new ApiError(options.alreadyValidatedMessage, 400);
  }

  const shared = {
    uploaded_by: options.actorId,
    uploader_role: "rh",
    status: "validated",
    reviewed_by: options.actorId,
    reviewed_at: options.now,
    review_comment: options.reviewComment,
    document_date: options.documentDate,
    storage_bucket: options.storageBucket,
    storage_path: options.storagePath,
    file_name: options.fileName,
    mime_type: "application/pdf",
    size_bytes: options.sizeBytes,
    source_kind: "generated",
  };

  if (existing?.id) {
    const { error: updateDocumentError } = await adminClient
      .from("employee_documents")
      .update({ ...shared, deleted_at: null, updated_at: options.now })
      .eq("id", existing.id);
    if (updateDocumentError) {
      throw new ApiError(updateDocumentError.message, 400);
    }
    return { documentId: existing.id, previousStoragePath: existing.storage_path ?? null };
  }

  const { data: insertedDocument, error: insertDocumentError } = await adminClient
    .from("employee_documents")
    .insert({
      ...shared,
      employee_id: options.employeeId,
      document_type_id: options.documentTypeId,
      period_month: options.periodStart,
    })
    .select("id")
    .single();
  if (insertDocumentError || !insertedDocument) {
    throw new ApiError(insertDocumentError?.message ?? options.insertErrorMessage, 400);
  }
  return { documentId: insertedDocument.id, previousStoragePath: null };
}

export const POST = withActor(
  ["rh", "admin"],
  async ({ adminClient, user, profile, request }) => {
    // Reconstruit la forme attendue par le corps de la route, inchange : `canManageOwner`
    // et les requetes ci-dessous parlent en `actorId` / `actorRole`.
    const auth = { adminClient, actorId: user.id, actorRole: profile.role };

    const body = (await request.json().catch(() => null)) as GeneratePayload | null;
    const kind = String(body?.kind ?? "").trim() as GenerateKind;
    const employeeId = String(body?.employeeId ?? "").trim();
    /**
     * Le profil de facturation est par defaut CELUI DU COLLABORATEUR : c'est le seul cas
     * qui a un sens metier. Le champ reste accepte pour ne pas casser un appelant existant,
     * mais l'interface RH ne le renseigne plus — elle exposait un selecteur separe dont un
     * effet reimposait de toute facon le profil du collaborateur choisi.
     */
    const billingProfileEmployeeId =
      String(body?.billingProfileEmployeeId ?? "").trim() || employeeId;
    const periodMonthRaw = String(body?.periodMonth ?? "").trim();
    const notes = String(body?.notes ?? "").trim() || null;
    const discountGranted = body?.discountGranted === true;
    const vatEnabled = body?.vatEnabled === true;
    let amountAlreadyPaid = 0;
    try {
      amountAlreadyPaid = parseAmountAlreadyPaid(body?.amountAlreadyPaid);
    } catch (error) {
      throw new ApiError(error instanceof Error ? error.message : "Montant deja paye invalide.", 400);
    }

    if (!["cra", "facture"].includes(kind)) {
      throw new ApiError("Type de document invalide.", 400);
    }
    if (!employeeId) {
      throw new ApiError("Collaborateur requis.", 400);
    }
    // Plus de garde sur `billingProfileEmployeeId` : il retombe sur `employeeId`, deja verifie.
    if (!periodMonthRaw) {
      throw new ApiError("Periode requise.", 400);
    }

    let periodMonth: string;
    try {
      periodMonth = toIsoMonthStart(periodMonthRaw).slice(0, 7);
    } catch {
      throw new ApiError("Periode invalide.", 400);
    }

    const rawEntries = Array.isArray(body?.entries) ? (body?.entries as GenerateEntryPayload[]) : [];

    // Seule garde conservee de la version mono-entreprise : une ligne hors periode ne doit
    // pas atterrir dans le CRA d'un autre mois. Tout le reste (quantites, unites, doublons,
    // missions inconnues) est delegue plus bas a `parseCraEntries`, la meme validation que
    // le chemin salarie. Ce filtrage silencieux etait auparavant applique aux quantites
    // aussi : une ligne a zero disparaissait sans rien dire, elle donne desormais une erreur.
    const entriesInPeriod = rawEntries.filter((entry) =>
      String(entry?.workDate ?? "")
        .trim()
        .startsWith(`${periodMonth}-`),
    );

    const canManageEmployee = await canManageOwner(auth, employeeId);
    if (!canManageEmployee) {
      throw new ApiError("Acces refuse.", 403);
    }
    const canUseBillingProfile = await canManageOwner(auth, billingProfileEmployeeId);
    if (!canUseBillingProfile) {
      throw new ApiError("Acces refuse pour ce profil de facturation.", 403);
    }

    // `canManageOwner` ne verifie que l'affectation, pas les types de documents autorises.
    // Sans ce controle, un RH restreint a certains types pour un collaborateur pouvait quand
    // meme lui generer un CRA ou une facture par ce chemin. Le code du type est `kind`.
    if (auth.actorRole !== "admin") {
      const { data: generatedType } = await auth.adminClient
        .from("document_types")
        .select("id")
        .eq("code", kind)
        .maybeSingle();

      if (generatedType?.id) {
        await assertRhAccess(
          auth.adminClient,
          { id: auth.actorId, role: auth.actorRole },
          employeeId,
          generatedType.id,
          "Type de document non autorise pour ce RH sur ce collaborateur.",
        );
      }
    }

    const { data: billingProfile, error: billingError } = await auth.adminClient
      .from("employee_billing_profiles")
      .select("first_name,last_name,company_name,esn_partenaire,address_line_1,address_line_2,postal_code,city,country,phone,email,siret,iban,bic,daily_rate")
      .eq("employee_id", billingProfileEmployeeId)
      .single();

    if (billingError || !billingProfile) {
      throw new ApiError(billingError?.message ?? "Profil de facturation introuvable.", 400);
    }

    const dailyRate = Number(billingProfile.daily_rate ?? 0);
    if (!Number.isFinite(dailyRate) || dailyRate <= 0) {
      throw new ApiError("Le tarif journalier du profil est invalide.", 400);
    }

    // Missions du COLLABORATEUR, pas du RH : ce sont ses entreprises clientes qui portent
    // le tarif et l'unite de chaque ligne. Chargees apres le controle d'habilitation.
    const { missions, units: missionUnits } = await loadEmployeeMissions(
      auth.adminClient,
      employeeId,
    );

    // `DAY_UNIT` en repli, et non l'unite du profil de facturation comme cote salarie : une
    // ligne RH sans mission est une ligne du chemin historique, qui se saisit en journees.
    let parsedEntries: ParsedCraEntry[];
    try {
      parsedEntries = parseCraEntries(entriesInPeriod as CraEntryInput[], missionUnits, DAY_UNIT);
    } catch (parseError) {
      throw new ApiError(
        parseError instanceof Error ? parseError.message : "Lignes de CRA invalides.",
        400,
      );
    }

    // Les absences ne comptent pas comme des jours travailles, les missions horaires non plus.
    let workedDaysCount = parsedEntries.reduce(
      (total, entry) => total + (entry.absence_type ? 0 : Number(entry.day_quantity ?? 0)),
      0,
    );
    const totalHours = parsedEntries.reduce((total, entry) => total + Number(entry.hours ?? 0), 0);

    // Repli historique : sans aucune ligne exploitable, le RH peut encore donner un simple
    // nombre de jours, que l'on repartit sur les jours ouvres. La condition porte sur les
    // DEUX unites — un CRA entierement saisi a l'heure a bien zero jour, sans etre vide.
    if (workedDaysCount <= 0 && totalHours <= 0) {
      try {
        workedDaysCount = parsePositiveInteger(body?.workedDaysCount, "jours travailles");
      } catch (parseError) {
        throw new ApiError(
          parseError instanceof Error ? parseError.message : "Nombre de jours invalide.",
          400,
        );
      }
      parsedEntries = buildWorkEntries(periodMonth, Math.max(1, Math.round(workedDaysCount)));
    }

    const entries = parsedEntries;
    const now = new Date().toISOString();
    const documentDate = toDocumentDate();
    const storageBucket = "employee-documents";

    if (kind === "cra") {
      const logoRgbBase64 = await readPdfLogoBase64();
      const { data: documentType, error: typeError } = await auth.adminClient
        .from("document_types")
        .select("id,label,active")
        .eq("code", "cra")
        .single();

      if (typeError || !documentType || !documentType.active) {
        throw new ApiError("Type CRA introuvable.", 400);
      }

      const periodStart = `${periodMonth}-01`;
      const { data: existingCra, error: existingCraError } = await auth.adminClient
        .from("cra_records")
        .select("id,status,pdf_version,employee_document_id")
        .eq("employee_id", employeeId)
        .eq("period_month", periodStart)
        .maybeSingle();

      if (existingCraError) {
        throw new ApiError(existingCraError.message, 400);
      }

      // Vérifie que le document lié au CRA "validé" est encore vivant. Sinon le CRA est orphelin et réutilisable.
      let existingCraDocumentAlive = false;
      if (existingCra?.status === "validated" && existingCra.employee_document_id) {
        const { data: linkedDoc } = await auth.adminClient
          .from("employee_documents")
          .select("id,deleted_at")
          .eq("id", existingCra.employee_document_id)
          .maybeSingle();
        existingCraDocumentAlive = Boolean(linkedDoc) && !linkedDoc?.deleted_at;
      }

      if (existingCra?.status === "validated" && existingCraDocumentAlive) {
        throw new ApiError("Un CRA valide existe deja pour cette periode.", 400);
      }

      let craId = existingCra?.id ?? null;
      let pdfVersion = existingCra?.pdf_version ?? 1;
      if (!existingCra) {
        const { data: insertedCra, error: insertCraError } = await auth.adminClient
          .from("cra_records")
          .insert({
            employee_id: employeeId,
            period_month: periodStart,
            status: "draft",
            ...billingProfile,
            worked_days_count: workedDaysCount,
            notes,
          })
          .select("id,pdf_version")
          .single();
        if (insertCraError || !insertedCra) {
          throw new ApiError(insertCraError?.message ?? "Creation du CRA impossible.", 400);
        }
        craId = insertedCra.id;
        pdfVersion = insertedCra.pdf_version;
      } else {
        const { error: updateCraError } = await auth.adminClient
          .from("cra_records")
          .update({
            status: "draft",
            ...billingProfile,
            worked_days_count: workedDaysCount,
            notes,
            updated_at: now,
          })
          .eq("id", existingCra.id);
        if (updateCraError) {
          throw new ApiError(updateCraError.message, 400);
        }
      }

      const { error: deleteEntriesError } = await auth.adminClient
        .from("cra_entries")
        .delete()
        .eq("cra_id", craId);
      if (deleteEntriesError) {
        throw new ApiError(deleteEntriesError.message, 400);
      }

      const { error: insertEntriesError } = await auth.adminClient
        .from("cra_entries")
        .insert(entries.map((entry) => ({ cra_id: craId, ...entry })));
      if (insertEntriesError) {
        throw new ApiError(insertEntriesError.message, 400);
      }

      // Recapitulatif par entreprise, fige au moment du CRA. Vide quand aucune ligne ne
      // porte de mission : le PDF retombe alors sur son rendu mono-entreprise.
      let missionLines: Awaited<ReturnType<typeof syncCraMissionLines>>;
      try {
        missionLines = await syncCraMissionLines(auth.adminClient, craId, entries, missions);
      } catch (syncError) {
        throw new ApiError(
          syncError instanceof Error ? syncError.message : "Recapitulatif par entreprise impossible.",
          400,
        );
      }

      const companyByMissionId = new Map(
        missions.map((mission) => [mission.id, mission.company_name]),
      );
      const absenceDays = sumAbsenceDays(entries);

      const nextPdfVersion = existingCra?.employee_document_id ? pdfVersion + 1 : pdfVersion;
      const fileName = `cra-${periodMonth}-v${nextPdfVersion}.pdf`;
      const storagePath = buildEmployeeDocumentPath({
        employeeId,
        documentTypeId: documentType.id,
        periodMonth: periodStart,
        fileName,
      });
      const pdfBuffer = buildCraPdfBuffer(
        {
          firstName: billingProfile.first_name,
          lastName: billingProfile.last_name,
          companyName: billingProfile.company_name,
          esnPartenaire: billingProfile.esn_partenaire,
          addressLine1: billingProfile.address_line_1,
          addressLine2: billingProfile.address_line_2,
          postalCode: billingProfile.postal_code,
          city: billingProfile.city,
          country: billingProfile.country,
          phone: billingProfile.phone,
          email: billingProfile.email,
          siret: billingProfile.siret,
          iban: billingProfile.iban,
          bic: billingProfile.bic,
          dailyRate,
          workedDaysCount,
          // Nul pour un CRA saisi en journees : la ligne d'heures du PDF reste alors absente.
          workedHoursCount: totalHours,
          paidLeaveDays: absenceDays.paid ?? 0,
          sickLeaveDays: absenceDays.sick ?? 0,
          exceptionalLeaveDays: absenceDays.exceptional ?? 0,
          unpaidLeaveDays: absenceDays.unpaid ?? 0,
          periodMonth: periodStart,
          notes,
          entries: entries.map((entry) => ({
            workDate: entry.work_date,
            dayQuantity: Number(entry.day_quantity ?? 0),
            label: entry.label,
            companyName: entry.mission_id
              ? (companyByMissionId.get(entry.mission_id) ?? null)
              : null,
          })),
          // Vide => rendu strictement identique a l'historique mono-entreprise.
          companies: missionLines.map((line) => ({
            companyName: line.company_name,
            esnPartenaire: line.esn_partenaire,
            quantity: Number(line.quantity ?? 0),
            unit: line.rate_unit === "hour" ? ("hour" as const) : ("day" as const),
          })),
        },
        logoRgbBase64.trim(),
      );

      const { error: uploadError } = await auth.adminClient.storage
        .from(storageBucket)
        .upload(storagePath, pdfBuffer, {
          contentType: "application/pdf",
          upsert: false,
        });
      if (uploadError) {
        throw new ApiError(uploadError.message, 400);
      }
      const { documentId, previousStoragePath } = await upsertGeneratedDocument(
        auth.adminClient,
        {
          employeeId,
          actorId: auth.actorId,
          documentTypeId: documentType.id,
          periodStart,
          documentDate,
          storageBucket,
          storagePath,
          fileName,
          sizeBytes: pdfBuffer.byteLength,
          now,
          reviewComment: "Genere par RH",
          alreadyValidatedMessage: "Le CRA de cette periode est deja valide.",
          insertErrorMessage: "Insertion du CRA impossible.",
        },
      );

      await auth.adminClient
        .from("cra_records")
        .update({
          employee_document_id: documentId,
          pdf_version: nextPdfVersion,
          status: "validated",
          validated_at: now,
          updated_at: now,
        })
        .eq("id", craId);

      if (previousStoragePath && previousStoragePath !== storagePath) {
        await auth.adminClient.storage.from(storageBucket).remove([previousStoragePath]);
      }

      await auth.adminClient.from("document_events").insert({
        document_id: documentId,
        actor_id: auth.actorId,
        event_type: "validated",
        payload: {
          generated_from: "cra",
          cra_id: craId,
          period_month: periodStart,
          billing_profile_employee_id: billingProfileEmployeeId,
        },
      });

      await notifyEmployeeForGeneratedDocument(auth.adminClient, {
        employeeId,
        actorId: auth.actorId,
        documentLabel: documentType.label,
        periodMonth: periodStart,
      });

      return NextResponse.json({ success: true, kind: "cra", documentId, craId });
    }

    const { data: documentType, error: typeError } = await auth.adminClient
      .from("document_types")
      .select("id,label,active")
      .eq("code", "facture")
      .single();
    if (typeError || !documentType || !documentType.active) {
      throw new ApiError("Type facture introuvable.", 400);
    }

    const periodStart = `${periodMonth}-01`;
    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 30);

    // Une ligne par entreprise cliente, chacune dans son unite et avec son propre tarif —
    // meme fonction que la facture du salarie, pour que le meme mois donne le meme montant
    // quel que soit le cote qui l'emet.
    //
    // REPLI : quand aucune ligne ne porte de mission (CRA « n jours » du chemin historique,
    // ou collaborateur sans mission enregistree), on retombe sur l'unique ligne construite
    // depuis le profil de facturation, exactement comme avant.
    const missionInvoiceLines = buildInvoiceLinesFromEntries(entries, missions);
    const invoiceLines: InvoiceLineInput[] = missionInvoiceLines.length
      ? missionInvoiceLines
      : [
          {
            label: billingProfile.company_name ?? "Client",
            quantity: workedDaysCount,
            rate: dailyRate,
            unit: "day" as const,
          },
        ];

    const fileName = `facture-${periodMonth}-${Date.now()}.pdf`;
    const storagePath = buildEmployeeDocumentPath({
      employeeId,
      documentTypeId: documentType.id,
      periodMonth: periodStart,
      fileName,
    });

    const pdfBuffer = buildInvoicePdfBuffer({
      invoiceNumber: periodMonth.replace(/-/g, ""),
      issueDate: issueDate.toISOString(),
      dueDate: dueDate.toISOString(),
      firstName: billingProfile.first_name,
      lastName: billingProfile.last_name,
      addressLine1: billingProfile.address_line_1,
      addressLine2: billingProfile.address_line_2,
      postalCode: billingProfile.postal_code,
      city: billingProfile.city,
      country: billingProfile.country,
      siret: billingProfile.siret,
      iban: billingProfile.iban,
      bic: billingProfile.bic,
      periodMonth: periodStart,
      lines: invoiceLines,
      discountGranted,
      vatEnabled,
      amountAlreadyPaid,
    });

    const { error: uploadError } = await auth.adminClient.storage
      .from(storageBucket)
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (uploadError) {
      throw new ApiError(uploadError.message, 400);
    }
    const { documentId, previousStoragePath } = await upsertGeneratedDocument(
      auth.adminClient,
      {
        employeeId,
        actorId: auth.actorId,
        documentTypeId: documentType.id,
        periodStart,
        documentDate,
        storageBucket,
        storagePath,
        fileName,
        sizeBytes: pdfBuffer.byteLength,
        now,
        reviewComment: "Generee par RH",
        alreadyValidatedMessage: "La facture de cette periode est deja validee.",
        insertErrorMessage: "Insertion de la facture impossible.",
      },
    );

    if (previousStoragePath && previousStoragePath !== storagePath) {
      await auth.adminClient.storage.from(storageBucket).remove([previousStoragePath]);
    }

    await auth.adminClient.from("document_events").insert({
      document_id: documentId,
      actor_id: auth.actorId,
      event_type: "validated",
      payload: {
        generated_from: "invoice",
        period_month: periodStart,
        worked_days_count: workedDaysCount,
        daily_rate: dailyRate,
        discount_granted: discountGranted,
        discount_rate: discountGranted ? 0.02 : 0,
        vat_enabled: vatEnabled,
        vat_rate: vatEnabled ? 0.2 : 0,
        amount_already_paid: amountAlreadyPaid,
        billing_profile_employee_id: billingProfileEmployeeId,
      },
    });

    await notifyEmployeeForGeneratedDocument(auth.adminClient, {
      employeeId,
      actorId: auth.actorId,
      documentLabel: documentType.label,
      periodMonth: periodStart,
    });

    return NextResponse.json({ success: true, kind: "facture", documentId });
  },
  { missingSession: "Session RH manquante." },
)
