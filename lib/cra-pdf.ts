type CraPdfEntry = {
  workDate: string;
  dayQuantity: number;
  label: string | null;
};

type CraPdfInput = {
  firstName: string;
  lastName: string;
  companyName: string;
  esnPartenaire: string | null;
  addressLine1: string;
  addressLine2: string | null;
  postalCode: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  siret: string;
  iban: string;
  bic: string;
  dailyRate: number;
  workedDaysCount: number;
  periodMonth: string;
  notes: string | null;
  entries: CraPdfEntry[];
};

function byteLength(value: string) {
  return typeof Buffer !== "undefined"
    ? Buffer.byteLength(value, "binary")
    : value.length;
}

function base64ToBytes(value: string) {
  if (typeof Buffer !== "undefined") {
    return Uint8Array.from(Buffer.from(value, "base64"));
  }

  const decoded = atob(value);
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }
  return bytes;
}

function bytesToHex(value: Uint8Array) {
  return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizePdfText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/[()\\]/g, "\\$&");
}

function binaryStringToBytes(value: string) {
  return Uint8Array.from(value, (char) => char.charCodeAt(0));
}

function formatPeriodLabel(value: string) {
  const normalized = /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : value;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return value.slice(0, 7) || "-";
  }

  return parsed.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function formatEntryCommentDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value || "Date non renseignee";
  }

  return parsed.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function formatDayCount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(".", ",");
}

function wrapPdfText(value: string, maxChars: number) {
  const normalized = normalizePdfText(value);
  if (normalized.length <= maxChars) {
    return [normalized];
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length > maxChars && currentLine) {
      lines.push(currentLine);
      currentLine = word;
      return;
    }
    currentLine = nextLine;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function createTextCommand(text: string, x: number, y: number, font: "F1" | "F2", size: number) {
  return `BT /${font} ${size} Tf ${x} ${y} Td (${normalizePdfText(text)}) Tj ET`;
}

function buildCraPdfContent(input: CraPdfInput, withLogo: boolean) {
  const title = "Resume Mensuel";
  const consultantName = `${input.firstName} ${input.lastName}`.trim() || "-";
  const clientName = input.companyName || "-";
  const partnerName = input.esnPartenaire ?? "-";
  const periodLabel = formatPeriodLabel(input.periodMonth);
  const comments = [
    ...input.entries
      .filter((entry) => entry.label?.trim())
      .map(
        (entry) =>
          `${formatEntryCommentDate(entry.workDate)} : ${entry.label?.trim() ?? "Journee travaillee"}`,
      ),
  ];

  if (input.notes?.trim()) {
    comments.push(...wrapPdfText(input.notes.trim(), 74));
  }

  if (!comments.length) {
    comments.push("Aucun commentaire.");
  }

  const commands = [
    "1 1 1 rg",
    "0 0 595 842 re f",
  ];

  if (withLogo) {
    commands.push("q", "78 0 0 78 44 724 cm", "/Im1 Do", "Q");
  }

  commands.push(
    "0.12 0.2 0.29 rg",
    createTextCommand(title, 180, 768, "F2", 20),
    "0.75 0.8 0.87 RG",
    "1.2 w",
    "180 748 m 504 748 l S",
  );

  let y = 676;
  const addField = (label: string, value: string) => {
    commands.push("0.06 0.12 0.18 rg");
    commands.push(createTextCommand(label, 46, y, "F2", 10));
    commands.push("0 0 0 rg");
    commands.push(createTextCommand(value, 170, y, "F1", 10));
    y -= 24;
  };

  addField("Technicien :", consultantName);
  addField("Client :", clientName);
  addField("ESN partenaire :", partnerName);
  addField("Periode :", periodLabel);

  y -= 24;
  addField("Total de jours travaille :", `${formatDayCount(input.workedDaysCount)} jour(s)`);
  addField("Conge paye :", "0 jour(s)");
  addField("Arret maladie :", "0 jour(s)");
  addField("Conge exceptionnel :", "0 jour(s)");
  addField("Conge sans solde :", "0 jour(s)");
  addField("Heures supplementaires :", "0 heure(s), dont 0 heure(s) de nuit");

  y -= 28;
  commands.push("0.06 0.12 0.18 rg");
  commands.push(createTextCommand("Commentaires :", 46, y, "F2", 10));
  y -= 20;

  comments.slice(0, 12).forEach((line) => {
    wrapPdfText(line, 74).forEach((wrappedLine) => {
      commands.push("0 0 0 rg");
      commands.push(createTextCommand(`- ${wrappedLine}`, 52, y, "F1", 10));
      y -= 16;
    });
  });

  return commands.join("\n");
}

function createPdfString(content: string, logoRgbBase64?: string | null) {
  const logoHex = logoRgbBase64 ? `${bytesToHex(base64ToBytes(logoRgbBase64))}>` : null;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
    logoHex
      ? "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> /XObject << /Im1 7 0 R >> >> >>"
      : "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>",
    `<< /Length ${byteLength(content)} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];

  if (logoHex) {
    objects.push(
      `<< /Type /XObject /Subtype /Image /Width 120 /Height 120 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${logoHex.length} >>\nstream\n${logoHex}\nendstream`,
    );
  }

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

export function buildCraPdfBytes(input: CraPdfInput, logoRgbBase64?: string | null) {
  const content = buildCraPdfContent(input, Boolean(logoRgbBase64));
  return binaryStringToBytes(createPdfString(content, logoRgbBase64));
}

export function buildCraPdfBuffer(input: CraPdfInput, logoRgbBase64?: string | null) {
  return Buffer.from(buildCraPdfBytes(input, logoRgbBase64));
}
