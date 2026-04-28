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
  discountGranted?: boolean;
  vatEnabled?: boolean;
  amountAlreadyPaid?: number;
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
  const euroToken = "__EURO__";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u20AC/g, euroToken)
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/[()\\]/g, "\\$&")
    .replace(new RegExp(euroToken, "g"), "\\200");
}

function createTextCommand(text: string, x: number, y: number, font: "F1" | "F2", size: number) {
  return `BT /${font} ${size} Tf ${x} ${y} Td (${normalizePdfText(text)}) Tj ET`;
}

function estimateTextWidth(text: string, size: number) {
  return text.length * size * 0.5;
}

function wrapText(text: string, maxWidth: number, size: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (estimateTextWidth(candidate, size) <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      lines.push(word);
      currentLine = "";
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
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
  return Number.isInteger(value)
    ? String(value)
    : value.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
}

function formatAmount(value: number) {
<<<<<<< HEAD:public/partenaire/invoice-pdf.ts
  return `${value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} \u20AC`;
=======
  return `${value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} \u20AC`;
>>>>>>> design:lib/invoice-pdf.ts
}


function estimatePdfTextWidth(text: string, fontSize: number) {
  let units = 0;
  for (const char of text) {
    if ("ilI.,:;|!'` ".includes(char)) {
      units += 0.28;
    } else if ("mwMW@%#&".includes(char)) {
      units += 0.9;
    } else if ("0123456789".includes(char)) {
      units += 0.56;
    } else {
      units += 0.56;
    }
  }
  return units * fontSize;
}

function wrapTextToCell(text: string, maxWidth: number, fontSize: number) {
  const clean = (text ?? "").trim();
  if (!clean) {
    return [""];
  }

  const words = clean.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  const pushCurrentLine = () => {
    if (current) {
      lines.push(current);
      current = "";
    }
  };

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (estimatePdfTextWidth(candidate, fontSize) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (!current) {
      let segment = "";
      for (const char of word) {
        const next = `${segment}${char}`;
        if (estimatePdfTextWidth(next, fontSize) > maxWidth) {
          if (segment) {
            lines.push(segment);
            segment = char;
          } else {
            lines.push(char);
            segment = "";
          }
        } else {
          segment = next;
        }
      }
      current = segment;
      continue;
    }

    pushCurrentLine();
    current = word;
  }

  pushCurrentLine();
  return lines.length ? lines : [clean];
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
  const discountRate = input.discountGranted ? 0.02 : 0;
  const discountAmount = totalHt * discountRate;
  const totalAfterDiscount = Math.max(0, totalHt - discountAmount);
  const vatRate = input.vatEnabled ? 0.2 : 0;
  const vatAmount = totalAfterDiscount * vatRate;
  const amountAlreadyPaid = Math.max(0, Number(input.amountAlreadyPaid) || 0);
  const totalTtc = totalAfterDiscount + vatAmount;
  const remainingToPay = Math.max(0, totalTtc - amountAlreadyPaid);
  const description = `Service IT chez ${input.companyName || "Client"}`;
  const descriptionFontSize = 9;
  const descriptionLines = wrapTextToCell(description, 114, descriptionFontSize);
  const descriptionLineHeight = 10;
  const tableBodyHeight = Math.max(14, descriptionLines.length * descriptionLineHeight + 4);
  const tableHeaderHeight = 14;
  const tableHeight = tableBodyHeight + tableHeaderHeight;
  const issuerStartY = 700;
  const recipientStartY = 612;
  const lineGap = 16;
  const issuerBottomY = issuerStartY - (issuerLines.length - 1) * lineGap;
  const recipientBottomY = recipientStartY - (recipientLines.length - 1) * lineGap;
  const contentBottomY = Math.min(issuerBottomY, recipientBottomY);
  const titleBarY = contentBottomY - 56;
  const tableTopY = titleBarY - 14;
  const tableY = tableTopY - tableHeight;
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

  const tableHeaderTextY = tableY + tableBodyHeight + 2;
  const descriptionFirstLineY = tableY + tableBodyHeight - 11;
  const descriptionCommands = descriptionLines.map((line, index) =>
    createTextCommand(line, 58, descriptionFirstLineY - index * descriptionLineHeight, "F1", descriptionFontSize),
  );
  const summaryLabelX = 300;
  const summaryValueX = 420;
  const summaryLabelWidth = 116;
  const summaryFontSize = 10;
  const summaryLineHeight = 10;
  const summaryRowGap = 6;
  let summaryCursorY = summaryStartY;
  const summaryCommands: string[] = [];

  const pushSummaryRow = (label: string, value: string, font: "F1" | "F2" = "F2") => {
    const labelLines = wrapTextToCell(label, summaryLabelWidth, summaryFontSize);
    labelLines.forEach((line, index) => {
      summaryCommands.push(createTextCommand(line, summaryLabelX, summaryCursorY - index * summaryLineHeight, font, summaryFontSize));
    });
    summaryCommands.push(createTextCommand(value, summaryValueX, summaryCursorY, "F1", summaryFontSize));
    summaryCursorY -= labelLines.length * summaryLineHeight + summaryRowGap;
  };

  pushSummaryRow("Total HT :", formatAmount(totalHt));
  pushSummaryRow("Escompte :", input.discountGranted ? `${formatAmount(discountAmount)} (2%)` : formatAmount(0));
  pushSummaryRow("Total HT apres escompte :", formatAmount(totalAfterDiscount));
  pushSummaryRow("TVA :", input.vatEnabled ? `${formatAmount(vatAmount)} (20%)` : `${formatAmount(0)} (0%)`);
  pushSummaryRow("Deja paye :", formatAmount(amountAlreadyPaid));
  pushSummaryRow("Total TTC :", formatAmount(totalTtc));
  pushSummaryRow("Net a payer :", formatAmount(remainingToPay));

  commands.push(
    "0.05 0.36 0.67 rg",
    `${54} ${titleBarY} 487 34 re f`,
    "1 1 1 rg",
    createTextCommand(`FACTURE ${periodLabel}`, 222, titleBarY + 13, "F2", 12),
    "0 0 0 rg",
    `54 ${tableY} 122 ${tableHeight} re S`,
    `176 ${tableY} 66 ${tableHeight} re S`,
    `242 ${tableY} 102 ${tableHeight} re S`,
    `344 ${tableY} 108 ${tableHeight} re S`,
    `452 ${tableY} 89 ${tableHeight} re S`,
    `54 ${tableY + tableBodyHeight} 487 0 re S`,
    createTextCommand("Description", 58, tableHeaderTextY, "F2", 9),
    createTextCommand("Quantite", 180, tableHeaderTextY, "F2", 9),
    createTextCommand("Tarif / journee HT", 246, tableHeaderTextY, "F2", 9),
    createTextCommand("Montant", 348, tableHeaderTextY, "F2", 9),
    createTextCommand("TVA", 456, tableHeaderTextY, "F2", 9),
    ...descriptionCommands,
    createTextCommand(formatQuantity(quantity), 180, descriptionFirstLineY, "F1", 9),
    createTextCommand(formatAmount(dailyRate), 246, descriptionFirstLineY, "F1", 9),
    createTextCommand(formatAmount(totalHt), 348, descriptionFirstLineY, "F1", 9),
    createTextCommand("0%", 456, descriptionFirstLineY, "F1", 9),
    ...summaryCommands,
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
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
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




