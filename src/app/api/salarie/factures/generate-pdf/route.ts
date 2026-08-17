import { NextResponse } from "next/server";

import { buildEmployeeDocumentPath } from "@/lib/document-storage";
import { getRhRecipientsForEmployee, notifyRhOfDocument } from "@/lib/email";
import {
  parseCraEntries,
  toCraEntryUnit,
  type CraEntryInput,
  type CraEntryUnit,
} from "@/lib/cra-entries";
import { buildInvoicePdfBuffer } from "@/lib/invoice-pdf";
import { buildInvoiceLinesFromEntries, loadEmployeeMissions } from "@/lib/missions";
import { computeInvoiceTotals } from "@/features/dashboard/salarie/invoice-totals";
import { ApiError, withActor } from "@/lib/api-handler";
import { assertUploaderRole, loadActiveDocumentType } from "@/lib/document-types";
import { toDocumentDate, toIsoMonthStart } from "@/lib/server-supabase";

type InvoiceGeneratePayload = {
  periodMonth?: unknown;
  entries?: CraEntryInput[];
  discountGranted?: unknown;
  vatEnabled?: unknown;
  amountAlreadyPaid?: unknown;
  fraisKm?: unknown;
  fraisRepas?: unknown;
  fraisNuitee?: unknown;
};

function formatInvoiceNumber(periodMonth: string) {
  return periodMonth.replace(/-/g, "");
}

function roundToCents(value: number) {
  return Math.round(value * 100) / 100;
}

function parseAmountAlreadyPaid(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return 0;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Le montant deja paye doit etre un nombre positif ou nul.");
  }
  return roundToCents(parsed);
}

function parseExpenseAmount(value: unknown, label: string) {
  if (value === undefined || value === null || value === "") {
    return 0;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Le montant des ${label} doit etre un nombre positif ou nul.`);
  }
  return roundToCents(parsed);
}

export const POST = withActor(
  ["salarie"],
  async ({ adminClient, profile, user, request }) => {
    const body = (await request.json().catch(() => null)) as InvoiceGeneratePayload | null;
    if (!body?.periodMonth) {
      throw new ApiError("La periode est obligatoire.", 400);
    }

    // Le profil porte l'identite de l'emetteur, et l'unite de repli des lignes sans mission.
    const { data: billingProfile, error: billingError } = await adminClient
      .from("employee_billing_profiles")
      .select("first_name,last_name,company_name,esn_partenaire,address_line_1,address_line_2,postal_code,city,country,phone,email,siret,iban,bic,daily_rate,time_unit")
      .eq("employee_id", profile.id)
      .single();

    if (billingError || !billingProfile) {
      throw new ApiError(billingError?.message ?? "Profil de facturation introuvable.", 400);
    }

    const periodMonth = toIsoMonthStart(String(body.periodMonth));

    // Les missions portent l'unite et le tarif de chaque entreprise. Le profil ne sert
    // plus que de repli pour les lignes sans mission (CRA anterieurs au multi-entreprises).
    let missionUnits: Map<string, CraEntryUnit>;
    let missions;
    try {
      ({ missions, units: missionUnits } = await loadEmployeeMissions(adminClient, profile.id));
    } catch (missionError) {
      throw new ApiError(
        missionError instanceof Error
          ? missionError.message
          : "Chargement des entreprises impossible.",
        400,
      );
    }

    const entries = parseCraEntries(body.entries, missionUnits, toCraEntryUnit(billingProfile));
    const workedDaysCount = entries.reduce((total, entry) => total + (entry.day_quantity ?? 0), 0);
    const sortedWorkDates = entries.map((entry) => entry.work_date).sort();
    const periodStart = sortedWorkDates[0] ?? null;
    const periodEnd = sortedWorkDates[sortedWorkDates.length - 1] ?? null;
    const discountGranted = body.discountGranted === true;
    const vatEnabled = body.vatEnabled === true;
    let amountAlreadyPaid = 0;
    let fraisKm = 0;
    let fraisRepas = 0;
    let fraisNuitee = 0;
    try {
      amountAlreadyPaid = parseAmountAlreadyPaid(body.amountAlreadyPaid);
      fraisKm = parseExpenseAmount(body.fraisKm, "frais kilometriques");
      fraisRepas = parseExpenseAmount(body.fraisRepas, "frais de repas");
      fraisNuitee = parseExpenseAmount(body.fraisNuitee, "frais de nuitee");
    } catch (error) {
      throw new ApiError(error instanceof Error ? error.message : "Montant invalide.", 400);
    }

    // Une mission facturee a l'heure ne produit aucune journee : controler `workedDaysCount`
    // seul rejetterait toutes ses factures. C'est la presence d'une quantite, quelle que
    // soit son unite, qui compte.
    const totalHours = entries.reduce((total, entry) => total + (entry.hours ?? 0), 0);
    if (!entries.length || (workedDaysCount <= 0 && totalHours <= 0)) {
      throw new ApiError("Ajoute au moins un jour ou une heure travaille pour generer la facture.", 400);
    }

    // Implementation unique, partagee avec la facture generee par le RH.
    const invoiceLines = buildInvoiceLinesFromEntries(entries, missions);

    if (!invoiceLines.length) {
      throw new ApiError(
        "Aucune entreprise avec un tarif renseigne : la facture ne peut pas etre generee.",
        400,
      );
    }

    // Meme fonction que le PDF et que le recapitulatif du dashboard : le montant trace
    // dans l'historique est exactement celui imprime.
    const invoiceTotals = computeInvoiceTotals({
      lines: invoiceLines,
      discountGranted,
      vatEnabled,
      amountAlreadyPaid,
      fraisKm,
      fraisRepas,
      fraisNuitee,
    });

    const documentType = await loadActiveDocumentType(
      adminClient,
      { code: "facture" },
      "Type facture introuvable.",
    );
    assertUploaderRole(
      documentType,
      "salarie",
      "Le salarie ne peut pas generer ce type de document.",
    );

    // Numero de facture sequentiel par salarie et par mois (ex: 202606-01, 202606-02).
    // On compte toutes les factures deja emises pour ce mois (y compris supprimees)
    // afin de ne jamais reutiliser un numero deja attribue.
    const { count: existingInvoiceCount, error: countError } = await adminClient
      .from("employee_documents")
      .select("id", { count: "exact", head: true })
      .eq("employee_id", profile.id)
      .eq("document_type_id", documentType.id)
      .eq("period_month", periodMonth);

    if (countError) {
      throw new ApiError(countError.message, 400);
    }

    const invoiceSequence = (existingInvoiceCount ?? 0) + 1;
    const invoiceNumber = `${formatInvoiceNumber(periodMonth.slice(0, 7))}-${String(invoiceSequence).padStart(2, "0")}`;

    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 30);

    const fileName = `facture-${invoiceNumber}-${Date.now()}.pdf`;
    const storageBucket = "employee-documents";
    const storagePath = buildEmployeeDocumentPath({
      employeeId: profile.id,
      documentTypeId: documentType.id,
      periodMonth,
      fileName,
    });

    const pdfBuffer = buildInvoicePdfBuffer({
      invoiceNumber,
      issueDate: issueDate.toISOString(),
      dueDate: dueDate.toISOString(),
      // adminClient n'est pas type : ces colonnes sont nullables en base et un NULL
      // arriverait tel quel dans le PDF, qui imprimerait la chaine "null" (le nom
      // complet et la ligne "code postal ville" ne sont pas gardes cote generateur).
      firstName: billingProfile.first_name ?? "",
      lastName: billingProfile.last_name ?? "",
      addressLine1: billingProfile.address_line_1 ?? "",
      addressLine2: billingProfile.address_line_2,
      postalCode: billingProfile.postal_code ?? "",
      city: billingProfile.city ?? "",
      country: billingProfile.country ?? "",
      siret: billingProfile.siret,
      iban: billingProfile.iban ?? "",
      bic: billingProfile.bic ?? "",
      periodMonth,
      periodStart,
      periodEnd,
      lines: invoiceLines,
      discountGranted,
      vatEnabled,
      amountAlreadyPaid,
      fraisKm,
      fraisRepas,
      fraisNuitee,
    });

    const { error: uploadError } = await adminClient.storage.from(storageBucket).upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });

    if (uploadError) {
      throw new ApiError(uploadError.message, 400);
    }

    const now = new Date().toISOString();
    const documentDate = toDocumentDate();
    const { data: matchingRequest } = await adminClient
      .from("document_requests")
      .select("id,status,period_month")
      .eq("employee_id", profile.id)
      .eq("document_type_id", documentType.id)
      .in("status", ["pending", "uploaded", "rejected", "expired"])
      .order("created_at", { ascending: false })
      .limit(10);

    const requestRow =
      // Rapprochement strict sur la periode : sans cela, une demande d'un autre mois etait
      // marquee satisfaite par ce depot.
      (matchingRequest ?? []).find((row) => (row.period_month ?? "") === (periodMonth ?? "")) ??
      null;

    // Chaque generation cree une facture distincte : on n'ecrase plus la facture
    // du meme mois. Cela permet plusieurs factures par mois (quinzaine, semaine, etc.).
    const { data: insertedDocument, error: insertDocumentError } = await adminClient
      .from("employee_documents")
      .insert({
        employee_id: profile.id,
        uploaded_by: user.id,
        uploader_role: "salarie",
        document_type_id: documentType.id,
        period_month: periodMonth,
        document_date: documentDate,
        status: "pending",
        storage_bucket: storageBucket,
        storage_path: storagePath,
        file_name: fileName,
        mime_type: "application/pdf",
        size_bytes: pdfBuffer.byteLength,
        request_id: requestRow?.id ?? null,
      })
      .select("id")
      .single();

    if (insertDocumentError || !insertedDocument) {
      await adminClient.storage.from(storageBucket).remove([storagePath]);
      throw new ApiError(insertDocumentError?.message ?? "Insertion de la facture impossible.", 400);
    }

    const documentId = insertedDocument.id;
    const eventType = "uploaded";

    const requestPromise = requestRow
      ? adminClient.from("document_requests").update({ status: "uploaded", updated_at: now }).eq("id", requestRow.id)
      : Promise.resolve({ error: null });

    const eventPromise = adminClient.from("document_events").insert({
      document_id: documentId,
      actor_id: user.id,
      event_type: eventType,
      payload: {
        generated_from: "invoice",
        period_month: periodMonth,
        // Le detail par entreprise remplace le couple (quantite, tarif journalier) : une
        // facture peut porter plusieurs lignes, dans des unites differentes.
        lines: invoiceLines.map((line) => ({
          mission_id: line.missionId,
          company_name: line.label,
          quantity: line.quantity,
          unit: line.unit,
          rate: line.rate,
        })),
        total_ht: invoiceTotals.totalHt,
        discount_granted: discountGranted,
        discount_rate: discountGranted ? 0.02 : 0,
        vat_enabled: vatEnabled,
        vat_rate: vatEnabled ? 0.2 : 0,
        amount_already_paid: amountAlreadyPaid,
        frais_km: fraisKm,
        frais_repas: fraisRepas,
        frais_nuitee: fraisNuitee,
        frais_total: fraisKm + fraisRepas + fraisNuitee,
      },
    });

    const [{ error: requestError }, { error: eventError }] = await Promise.all([requestPromise, eventPromise]);

    if (requestError || eventError) {
      throw new ApiError(requestError?.message ?? eventError?.message ?? "La facture a ete generee, mais le suivi n'est pas complet.", 400);
    }

    try {
      const rhEmails = await getRhRecipientsForEmployee(adminClient, profile.id);
      if (rhEmails.length) {
        await notifyRhOfDocument({
          rhEmails,
          employeeName: profile.full_name,
          employeeEmail: profile.email,
          documentLabel: documentType.label,
          periodMonth,
        });
      }
    } catch (emailError) {
      console.error("[email] notify RH (facture) failed", emailError);
    }

    return NextResponse.json({ success: true, documentId });
  },
  { missingSession: "Session salarie manquante." },
);
