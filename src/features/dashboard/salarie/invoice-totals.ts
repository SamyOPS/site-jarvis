export const INVOICE_DISCOUNT_RATE = 0.02;
export const INVOICE_VAT_RATE = 0.2;

export type InvoiceTotalsInput = {
  quantity: number;
  dailyRate: number;
  discountGranted?: boolean;
  vatEnabled?: boolean;
  amountAlreadyPaid?: number;
  fraisKm?: number;
  fraisRepas?: number;
  fraisNuitee?: number;
};

export type InvoiceTotals = {
  quantity: number;
  dailyRate: number;
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

/**
 * Source unique de verite des montants d'une facture salarie : le PDF
 * (`buildInvoicePdfBuffer`) et le recapitulatif affiche dans le dashboard
 * appellent tous les deux cette fonction, pour que le montant annonce avant
 * generation soit exactement celui imprime.
 *
 * Module autonome et sans dependance : importable depuis un composant client
 * sans embarquer le generateur PDF dans le bundle.
 */
export function computeInvoiceTotals(input: InvoiceTotalsInput): InvoiceTotals {
  const quantity = Number(input.quantity) || 0;
  const dailyRate = Number(input.dailyRate) || 0;
  const serviceHt = quantity * dailyRate;
  const fraisKm = Math.max(0, Number(input.fraisKm) || 0);
  const fraisRepas = Math.max(0, Number(input.fraisRepas) || 0);
  const fraisNuitee = Math.max(0, Number(input.fraisNuitee) || 0);
  const fraisTotal = fraisKm + fraisRepas + fraisNuitee;
  const totalHt = serviceHt + fraisTotal;
  const discountRate = input.discountGranted ? INVOICE_DISCOUNT_RATE : 0;
  // L'escompte ne porte que sur la prestation, jamais sur les frais refactures.
  const discountAmount = serviceHt * discountRate;
  const totalAfterDiscount = Math.max(0, totalHt - discountAmount);
  const vatRate = input.vatEnabled ? INVOICE_VAT_RATE : 0;
  const vatAmount = totalAfterDiscount * vatRate;
  const amountAlreadyPaid = Math.max(0, Number(input.amountAlreadyPaid) || 0);
  const totalTtc = totalAfterDiscount + vatAmount;
  const remainingToPay = Math.max(0, totalTtc - amountAlreadyPaid);

  return {
    quantity,
    dailyRate,
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
