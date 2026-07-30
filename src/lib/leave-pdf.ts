export type LeaveType = "paid" | "unpaid";

type LeavePdfInput = {
  employeeName: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  daysCount: number;
  requestDate: string;
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
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/[()\\]/g, "\\$&");
}

function binaryStringToBytes(value: string) {
  return Uint8Array.from(value, (char) => char.charCodeAt(0));
}

function formatLongDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value || "-";
  }
  return parsed.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function leaveTypeLabel(leaveType: LeaveType) {
  return leaveType === "unpaid" ? "Conge sans solde" : "Conge paye";
}

function createTextCommand(text: string, x: number, y: number, font: "F1" | "F2", size: number) {
  return `BT /${font} ${size} Tf ${x} ${y} Td (${normalizePdfText(text)}) Tj ET`;
}

function buildLeavePdfContent(input: LeavePdfInput, withLogo: boolean) {
  const title = "Demande de Conge";
  const consultantName = input.employeeName.trim() || "-";

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
    commands.push(createTextCommand(value, 220, y, "F1", 10));
    y -= 24;
  };

  addField("Nom et prenom :", consultantName);
  addField("Type de conge :", leaveTypeLabel(input.leaveType));

  y -= 12;
  addField("Date de debut :", formatLongDate(input.startDate));
  addField("Date de fin :", formatLongDate(input.endDate));
  addField("Nombre de jours (calendaires) :", `${input.daysCount} jour(s)`);

  y -= 24;
  commands.push("0.06 0.12 0.18 rg");
  commands.push(
    createTextCommand(`Fait le ${formatLongDate(input.requestDate)}.`, 46, y, "F1", 10),
  );

  y -= 60;
  commands.push("0.06 0.12 0.18 rg");
  commands.push(createTextCommand("Signature du salarie :", 46, y, "F2", 10));
  commands.push(createTextCommand(consultantName, 46, y - 22, "F1", 10));

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

export function buildLeavePdfBytes(input: LeavePdfInput, logoRgbBase64?: string | null) {
  const content = buildLeavePdfContent(input, Boolean(logoRgbBase64));
  return binaryStringToBytes(createPdfString(content, logoRgbBase64));
}

export function buildLeavePdfBuffer(input: LeavePdfInput, logoRgbBase64?: string | null) {
  return Buffer.from(buildLeavePdfBytes(input, logoRgbBase64));
}
