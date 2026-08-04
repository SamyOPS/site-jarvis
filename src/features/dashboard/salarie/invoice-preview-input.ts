import type { InvoicePdfInput } from "@/lib/invoice-pdf";

export function roundToCents(value: number) {
  return Math.round(value * 100) / 100;
}

function text(value: string | null | undefined) {
  return (value ?? "").trim();
}

function amount(value: string | null | undefined) {
  return roundToCents(Number(value ?? "") || 0);
}

export type InvoicePreviewProfile = {
  firstName: string;
  lastName: string;
  companyName: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  country: string;
  siret: string;
  iban: string;
  bic: string;
  dailyRate: string;
};

export type InvoicePreviewEntry = {
  workDate: string;
  dayQuantity: string;
};

export type InvoicePreviewSettings = {
  discountGranted: boolean;
  vatEnabled: boolean;
  amountAlreadyPaid: string;
  fraisKm: string;
  fraisRepas: string;
  fraisNuitee: string;
};

export type InvoicePreviewInputArgs = {
  profile: InvoicePreviewProfile;
  entries: InvoicePreviewEntry[];
  periodMonth: string;
  totalDays: number;
  settings: InvoicePreviewSettings;
  /** Rang provisoire de la facture dans le mois ; le serveur tranche a la generation. */
  sequence: number;
  /** Date d'emission. Fournie par l'appelant pour rester deterministe et testable. */
  issuedAt: Date;
};

/**
 * Construit l'entree du generateur de PDF facture pour l'apercu client, en
 * reproduisant les derivations de /api/salarie/factures/generate-pdf.
 *
 * `addressLine2`, `country` et `siret` doivent etre ramenes a null quand ils sont
 * vides : une chaine vide ajoute une ligne a l'en-tete emetteur, et le nombre de
 * lignes decale ensuite toute la mise en page (issuerBottomY -> titleBarY -> tableY).
 *
 * Trois champs restent la propriete du serveur et ne peuvent etre qu'approches :
 * le numero de facture (sequence calculee en base a la generation), la date
 * d'emission et l'echeance (horloge du serveur au moment du POST).
 */
export function buildInvoicePreviewInput({
  profile,
  entries,
  periodMonth,
  totalDays,
  settings,
  sequence,
  issuedAt,
}: InvoicePreviewInputArgs): InvoicePdfInput {
  const workDates = entries
    .map((entry) => text(entry.workDate))
    .filter(Boolean)
    .sort();

  const dueDate = new Date(issuedAt);
  dueDate.setDate(dueDate.getDate() + 30);

  return {
    invoiceNumber: `${periodMonth.replace(/-/g, "")}-${String(sequence).padStart(2, "0")}`,
    issueDate: issuedAt.toISOString(),
    dueDate: dueDate.toISOString(),
    firstName: text(profile.firstName),
    lastName: text(profile.lastName),
    companyName: text(profile.companyName),
    addressLine1: text(profile.addressLine1),
    addressLine2: text(profile.addressLine2) || null,
    postalCode: text(profile.postalCode),
    city: text(profile.city),
    country: text(profile.country) || "",
    siret: text(profile.siret) || null,
    iban: text(profile.iban),
    bic: text(profile.bic),
    periodMonth: `${periodMonth}-01`,
    periodStart: workDates[0] ?? null,
    periodEnd: workDates[workDates.length - 1] ?? null,
    quantity: totalDays,
    dailyRate: Number(profile.dailyRate) || 0,
    discountGranted: settings.discountGranted,
    vatEnabled: settings.vatEnabled,
    amountAlreadyPaid: amount(settings.amountAlreadyPaid),
    fraisKm: amount(settings.fraisKm),
    fraisRepas: amount(settings.fraisRepas),
    fraisNuitee: amount(settings.fraisNuitee),
  };
}
