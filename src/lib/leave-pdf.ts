import {
  binaryStringToBytes,
  createPdfString,
  createTextCommand,
} from "@/lib/pdf-primitives";

export type LeaveType = "paid" | "unpaid";

type LeavePdfInput = {
  employeeName: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  daysCount: number;
  requestDate: string;
};

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

export function buildLeavePdfBytes(input: LeavePdfInput, logoRgbBase64?: string | null) {
  const content = buildLeavePdfContent(input, Boolean(logoRgbBase64));
  return binaryStringToBytes(createPdfString(content, { logoRgbBase64 }));
}

export function buildLeavePdfBuffer(input: LeavePdfInput, logoRgbBase64?: string | null) {
  return Buffer.from(buildLeavePdfBytes(input, logoRgbBase64));
}
