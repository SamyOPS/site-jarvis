type InvoicePdfInput = {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2: string | null;
  postalCode: string;
  city: string;
  country: string;
  siret: string;
  iban: string;
  bic: string;
  companyName: string;
  periodMonth: string;
  quantity: number;
  dailyRate: number;
};

function byteLength(value: string) {
  return typeof Buffer !== "undefined"
    ? Buffer.byteLength(value, "binary")
    : value.length;
}

function binaryStringToBytes(value: string) {
  return Uint8Array.from(value, (char) => char.charCodeAt(0));
}

function normalizePdfText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/[()\\]/g, "\\$&");
}

function createTextCommand(text: string, x: number, y: number, font: "F1" | "F2", size: number) {
  return `BT /${font} ${size} Tf ${x} ${y} Td (${normalizePdfText(text)}) Tj ET`;
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("fr-FR");
}

function formatPeriodLabel(value: string) {
  const normalized = /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : value;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return value.slice(0, 7) || "-";
  }

  return parsed.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }).toUpperCase();
}

function formatQuantity(value: number) {
  return Number.isInteger(value) ? String(value) : value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatAmount(value: number) {
  return value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildInvoicePdfContent(input: InvoicePdfInput) {
  const fullName = `${input.firstName} ${input.lastName}`.trim() || "-";
  const issuerLines = [
    fullName,
    input.addressLine1 || "-",
    input.addressLine2 || null,
    `${input.postalCode} ${input.city}`.trim(),
    input.country || null,
    `Siret : ${input.siret || "-"}`,
  ].filter((line): line is string => Boolean(line));
  const recipientLines = [
    "Jarvis Connect",
    "4 Avenue de la Liberation",
    "60160 Montataire",
    "FRANCE",
  ];
  const issueDateLabel = formatDate(input.issueDate);
  const dueDateLabel = formatDate(input.dueDate);
  const periodLabel = formatPeriodLabel(input.periodMonth);
  const quantity = Number(input.quantity) || 0;
  const dailyRate = Number(input.dailyRate) || 0;
  const totalHt = quantity * dailyRate;
  const description = `Service IT chez ${input.companyName || "Client"}`;
  const issuerStartY = 700;
  const recipientStartY = 612;
  const lineGap = 16;
  const issuerBottomY = issuerStartY - (issuerLines.length - 1) * lineGap;
  const recipientBottomY = recipientStartY - (recipientLines.length - 1) * lineGap;
  const contentBottomY = Math.min(issuerBottomY, recipientBottomY);
  const titleBarY = contentBottomY - 56;
  const tableY = titleBarY - 42;
  const summaryStartY = tableY - 74;

  const commands = [
    "1 1 1 rg",
    "0 0 595 842 re f",
    "0.05 0.36 0.67 rg",
    "54 796 487 16 re f",
    "54 30 487 16 re f",
    "0 0 0 rg",
    createTextCommand(`Facture N:${input.invoiceNumber}`, 354, 776, "F2", 12),
    createTextCommand(`Date : ${issueDateLabel}`, 354, 760, "F1", 11),
    createTextCommand(`A regler avant : ${dueDateLabel}`, 354, 744, "F1", 11),
  ];

  let issuerY = issuerStartY;
  issuerLines.forEach((line) => {
    commands.push(createTextCommand(line, 54, issuerY, "F1", 11));
    issuerY -= 16;
  });

  let recipientY = recipientStartY;
  recipientLines.forEach((line) => {
    commands.push(createTextCommand(line, 356, recipientY, line === "Jarvis Connect" ? "F2" : "F1", 11));
    recipientY -= 16;
  });

  commands.push(
    "0.05 0.36 0.67 rg",
    `${54} ${titleBarY} 487 34 re f`,
    "1 1 1 rg",
    createTextCommand(`FACTURE ${periodLabel}`, 222, titleBarY + 13, "F2", 12),
    "0 0 0 rg",
    `54 ${tableY} 122 28 re S`,
    `176 ${tableY} 66 28 re S`,
    `242 ${tableY} 102 28 re S`,
    `344 ${tableY} 108 28 re S`,
    `452 ${tableY} 89 28 re S`,
    `54 ${tableY + 14} 487 0 re S`,
    createTextCommand("Description", 58, tableY + 16, "F2", 9),
    createTextCommand("Quantite", 180, tableY + 16, "F2", 9),
    createTextCommand("Tarif / journee HT", 246, tableY + 16, "F2", 9),
    createTextCommand("Montant", 348, tableY + 16, "F2", 9),
    createTextCommand("TVA", 456, tableY + 16, "F2", 9),
    createTextCommand(description, 58, tableY + 3, "F1", 9),
    createTextCommand(formatQuantity(quantity), 180, tableY + 3, "F1", 9),
    createTextCommand(formatAmount(dailyRate), 246, tableY + 3, "F1", 9),
    createTextCommand(formatAmount(totalHt), 348, tableY + 3, "F1", 9),
    createTextCommand("0%", 456, tableY + 3, "F1", 9),
    createTextCommand("Total HT :", 300, summaryStartY, "F2", 10),
    createTextCommand(formatAmount(totalHt), 420, summaryStartY, "F1", 10),
    createTextCommand("Escompte :", 300, summaryStartY - 16, "F2", 10),
    createTextCommand("0,00", 420, summaryStartY - 16, "F1", 10),
    createTextCommand("Total HT apres escompte :", 300, summaryStartY - 32, "F2", 10),
    createTextCommand(formatAmount(totalHt), 420, summaryStartY - 32, "F1", 10),
    createTextCommand("TVA :", 300, summaryStartY - 48, "F2", 10),
    createTextCommand("0,00 (0%)", 420, summaryStartY - 48, "F1", 10),
    createTextCommand("Deja paye :", 300, summaryStartY - 64, "F2", 10),
    createTextCommand("0,00", 420, summaryStartY - 64, "F1", 10),
    createTextCommand("Total TTC :", 300, summaryStartY - 80, "F2", 10),
    createTextCommand(formatAmount(totalHt), 420, summaryStartY - 80, "F1", 10),
    createTextCommand("Condition de paiement :", 54, 288, "F2", 10),
    createTextCommand("Paiement a 30 jours fin de mois par virement.", 54, 272, "F1", 10),
    createTextCommand(`IBAN: ${input.iban || "-"}`, 54, 256, "F1", 10),
    createTextCommand(`BIC: ${input.bic || "-"}`, 54, 240, "F1", 10),
    createTextCommand("Penalites de retard de 1,5 fois le taux d'interet legal.", 54, 224, "F1", 10),
    createTextCommand("En votre aimable reglement", 230, 126, "F1", 10),
    createTextCommand("Jarvis Connect", 280, 12, "F1", 10),
  );

  return commands.join("\n");
}

function createPdfString(content: string) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>",
    `<< /Length ${byteLength(content)} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return pdf;
}

export function buildInvoicePdfBytes(input: InvoicePdfInput) {
  return binaryStringToBytes(createPdfString(buildInvoicePdfContent(input)));
}

export function buildInvoicePdfBuffer(input: InvoicePdfInput) {
  return Buffer.from(buildInvoicePdfBytes(input));
}
