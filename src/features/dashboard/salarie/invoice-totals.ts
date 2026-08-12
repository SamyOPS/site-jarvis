export const INVOICE_DISCOUNT_RATE = 0.02;
export const INVOICE_VAT_RATE = 0.2;

export type InvoiceLineUnit = "day" | "hour";

/** Une entreprise cliente = une ligne de prestation. */
export type InvoiceLineInput = {
  /** Identifiant de mission. Cle de reconciliation cote interface, jamais imprimee. */
  missionId?: string | null;
  /** Entreprise cliente : sert de libelle a la ligne. */
  label: string;
  /** Quantite dans l'unite de la mission : des heures, ou des journees. */
  quantity: number;
  /** Tarif exprime dans la meme unite : euros par heure, ou par journee. */
  rate: number;
  unit: InvoiceLineUnit;
};

export type InvoiceTotalsInput = {
  lines: InvoiceLineInput[];
  discountGranted?: boolean;
  vatEnabled?: boolean;
  amountAlreadyPaid?: number;
  fraisKm?: number;
  fraisRepas?: number;
  fraisNuitee?: number;
};

export type InvoiceLineTotals = InvoiceLineInput & {
  /** quantity x rate, arrondi au centime. */
  serviceHt: number;
};

export type InvoiceTotals = {
  lines: InvoiceLineTotals[];
  serviceHt: number;
  fraisKm: number;
  fraisRepas: number;
  fraisNuitee: number;
  fraisTotal: number;
  totalHt: number;
  discountAmount: number;
  totalAfterDiscount: number;
  vatAmount: number;
  amountAlreadyPaid: number;
  totalTtc: number;
  remainingToPay: number;
};

function roundToCents(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * Source unique de verite des montants d'une facture salarie : le PDF
 * (`buildInvoicePdfBuffer`) et le recapitulatif affiche dans le dashboard appellent tous
 * les deux cette fonction, pour que le montant annonce avant generation soit exactement
 * celui imprime.
 *
 * Une facture consolide plusieurs entreprises : chaque ligne porte sa propre quantite,
 * son propre tarif et sa propre unite. Il n'y a aucune conversion entre heures et jours,
 * les lignes s'additionnent en euros et non en quantites.
 *
 * Le montant de chaque ligne est arrondi au centime AVANT d'etre somme : sans cela, la
 * somme des montants imprimes ligne a ligne ne retomberait pas sur le total imprime.
 */
export function computeInvoiceTotals(input: InvoiceTotalsInput): InvoiceTotals {
  const lines: InvoiceLineTotals[] = (input.lines ?? []).map((line) => {
    const quantity = Math.max(0, Number(line.quantity) || 0);
    const rate = Math.max(0, Number(line.rate) || 0);
    return {
      ...line,
      quantity,
      rate,
      serviceHt: roundToCents(quantity * rate),
    };
  });

  const serviceHt = lines.reduce((total, line) => total + line.serviceHt, 0);
  const fraisKm = Math.max(0, Number(input.fraisKm) || 0);
  const fraisRepas = Math.max(0, Number(input.fraisRepas) || 0);
  const fraisNuitee = Math.max(0, Number(input.fraisNuitee) || 0);
  const fraisTotal = fraisKm + fraisRepas + fraisNuitee;
  const totalHt = serviceHt + fraisTotal;
  const discountRate = input.discountGranted ? INVOICE_DISCOUNT_RATE : 0;
  // L'escompte ne porte que sur la prestation, jamais sur les frais refactures.
  const discountAmount = roundToCents(serviceHt * discountRate);
  const totalAfterDiscount = Math.max(0, totalHt - discountAmount);
  const vatRate = input.vatEnabled ? INVOICE_VAT_RATE : 0;
  const vatAmount = roundToCents(totalAfterDiscount * vatRate);
  const amountAlreadyPaid = Math.max(0, Number(input.amountAlreadyPaid) || 0);
  const totalTtc = totalAfterDiscount + vatAmount;
  const remainingToPay = Math.max(0, totalTtc - amountAlreadyPaid);

  return {
    lines,
    serviceHt,
    fraisKm,
    fraisRepas,
    fraisNuitee,
    fraisTotal,
    totalHt,
    discountAmount,
    totalAfterDiscount,
    vatAmount,
    amountAlreadyPaid,
    totalTtc,
    remainingToPay,
  };
}

/** Libelle de quantite portant son unite : « 12 j », « 84 h ». */
export function formatInvoiceQuantity(line: Pick<InvoiceLineInput, "quantity" | "unit">) {
  const value = Number(line.quantity) || 0;
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${
    line.unit === "hour" ? "h" : "j"
  }`;
}
