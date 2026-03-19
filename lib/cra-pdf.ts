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

function normalizePdfText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/[()\\]/g, "\\$&");
}

function createSimplePdfBuffer(lines: string[]) {
  const safeLines = lines.slice(0, 34).map((line) => normalizePdfText(line));
  const content = [
    "BT",
    "/F1 11 Tf",
    "48 800 Td",
    ...safeLines.flatMap((line, index) => (index === 0 ? [`(${line}) Tj`] : ["0 -18 Td", `(${line}) Tj`])),
    "ET",
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(content, "binary")} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "binary"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "binary");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "binary");
}

export function buildCraPdfBuffer(input: CraPdfInput) {
  const periodLabel = input.periodMonth.slice(0, 7);
  const lines = [
    "CRA",
    `Periode: ${periodLabel}`,
    `Consultant: ${input.firstName} ${input.lastName}`,
    `Societe: ${input.companyName}`,
    `ESN partenaire: ${input.esnPartenaire ?? "-"}`,
    `Adresse: ${input.addressLine1}${input.addressLine2 ? `, ${input.addressLine2}` : ""}, ${input.postalCode} ${input.city}, ${input.country}`,
    `Contact: ${input.phone} / ${input.email}`,
    `SIRET: ${input.siret}`,
    `IBAN: ${input.iban}`,
    `BIC: ${input.bic}`,
    `Tarif journalier: ${input.dailyRate.toFixed(2)} EUR`,
    `Journees travaillees: ${input.workedDaysCount}`,
    "",
    "Lignes CRA:",
    ...input.entries.map((entry) => `${entry.workDate} - ${entry.dayQuantity} j - ${entry.label ?? "Journee travaillee"}`),
  ];

  if (input.notes?.trim()) {
    lines.push("", "Notes:", input.notes.trim());
  }

  return createSimplePdfBuffer(lines);
}
