import {
  binaryStringToBytes,
  createPdfString,
  createTextCommand,
  normalizePdfText,
} from "@/lib/pdf-primitives";

type CraPdfEntry = {
  workDate: string;
  dayQuantity: number;
  label: string | null;
  /** Entreprise de la ligne. Prefixe le commentaire des qu'il y a plusieurs clients. */
  companyName?: string | null;
};

/** Total travaille chez une entreprise cliente, dans l'unite de la mission. */
export type CraPdfCompanySummary = {
  companyName: string;
  esnPartenaire?: string | null;
  quantity: number;
  unit: "day" | "hour";
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
  siret: string | null;
  iban: string;
  bic: string;
  dailyRate: number;
  workedDaysCount: number;
  /**
   * Total d'heures declarees. Renseigne uniquement pour les consultants en saisie
   * horaire : a 0 ou absent, la ligne d'heures n'apparait pas et le PDF est identique
   * a ce qu'il a toujours ete.
   */
  workedHoursCount?: number | null;
  paidLeaveDays?: number;
  sickLeaveDays?: number;
  exceptionalLeaveDays?: number;
  unpaidLeaveDays?: number;
  periodMonth: string;
  notes: string | null;
  entries: CraPdfEntry[];
  /**
   * Recapitulatif par entreprise cliente. Absent ou vide => rendu strictement identique a
   * l'historique (champs « Client : » / « ESN partenaire : » et total unique), ce qui
   * laisse les CRA anterieurs au multi-entreprises inchanges.
   */
  companies?: CraPdfCompanySummary[];
};

/**
 * La conversion base64 -> hex du logo represente l'essentiel du cout de generation
 * (environ 13 ms sur 43 ko), alors que le logo est toujours le meme fichier. On
 * memorise donc le dernier resultat : indispensable pour l'apercu live, qui
 * reconstruit le PDF a chaque modification de la saisie.
 */
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

function buildCraPdfContent(input: CraPdfInput, withLogo: boolean) {
  const title = "Resume Mensuel";
  const consultantName = `${input.firstName} ${input.lastName}`.trim() || "-";
  const clientName = input.companyName || "-";
  const partnerName = input.esnPartenaire ?? "-";
  const periodLabel = formatPeriodLabel(input.periodMonth);
  // Des qu'il y a plusieurs clients, un commentaire seul ne dit pas chez qui il s'applique.
  const multiCompany = (input.companies?.length ?? 0) > 1;
  const comments = [
    ...input.entries
      .filter((entry) => entry.label?.trim())
      .map((entry) => {
        const date = formatEntryCommentDate(entry.workDate);
        const where = multiCompany && entry.companyName ? ` (${entry.companyName})` : "";
        return `${date}${where} : ${entry.label?.trim() ?? "Journee travaillee"}`;
      }),
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

  const companies = input.companies ?? [];

  if (!companies.length) {
    // Chemin historique, intact : un CRA anterieur au multi-entreprises produit le meme
    // PDF qu'avant, au caractere pres.
    addField("Client :", clientName);
    addField("ESN partenaire :", partnerName);
    addField("Periode :", periodLabel);

    y -= 24;
    // En saisie horaire, l'equivalent en jours n'a pas de sens a l'affichage : on annonce
    // le volume horaire.
    if (Number(input.workedHoursCount ?? 0) > 0) {
      addField(
        "Total d'heures travaillees :",
        `${formatDayCount(Number(input.workedHoursCount))} heure(s)`,
      );
    } else {
      addField("Total de jours travaille :", `${formatDayCount(input.workedDaysCount)} jour(s)`);
    }
  } else {
    addField("Periode :", periodLabel);
    y -= 12;

    // Le PDF tient sur une seule page (createPdfString est mono-page) : au-dela de six
    // entreprises, le reste est agrege pour ne pas deborder sur les conges et les
    // commentaires qui suivent.
    const MAX_ROWS = 6;
    const shown = companies.slice(0, MAX_ROWS);
    const overflow = companies.slice(MAX_ROWS);

    const rowHeight = 18;
    const drawRule = () => {
      commands.push("0.75 0.8 0.87 RG", "1.2 w", `46 ${y + 12} m 504 ${y + 12} l S`);
    };

    // En-tete
    commands.push("0.06 0.12 0.18 rg");
    commands.push(createTextCommand("Client", 46, y, "F2", 9));
    commands.push(createTextCommand("ESN partenaire", 250, y, "F2", 9));
    commands.push(createTextCommand("Temps travaille", 400, y, "F2", 9));
    y -= 6;
    drawRule();
    y -= rowHeight - 6;

    // `wrapPdfText` produirait des lignes de hauteur variable : on tronque plutot, la
    // hauteur du tableau reste ainsi previsible.
    const truncate = (value: string, max: number) =>
      value.length > max ? `${value.slice(0, max - 1)}.` : value;

    for (const company of shown) {
      commands.push("0 0 0 rg");
      commands.push(createTextCommand(truncate(company.companyName || "-", 32), 46, y, "F1", 10));
      commands.push(
        createTextCommand(truncate(company.esnPartenaire || "-", 22), 250, y, "F1", 10),
      );
      commands.push(
        createTextCommand(
          `${formatDayCount(company.quantity)} ${company.unit === "hour" ? "heure(s)" : "jour(s)"}`,
          400,
          y,
          "F1",
          10,
        ),
      );
      y -= rowHeight;
    }

    if (overflow.length) {
      const overflowDays = overflow
        .filter((company) => company.unit === "day")
        .reduce((total, company) => total + company.quantity, 0);
      const overflowHours = overflow
        .filter((company) => company.unit === "hour")
        .reduce((total, company) => total + company.quantity, 0);
      const parts = [
        overflowDays > 0 ? `${formatDayCount(overflowDays)} jour(s)` : null,
        overflowHours > 0 ? `${formatDayCount(overflowHours)} heure(s)` : null,
      ].filter(Boolean);

      commands.push("0 0 0 rg");
      commands.push(createTextCommand(`Autres (${overflow.length})`, 46, y, "F1", 10));
      commands.push(createTextCommand("-", 250, y, "F1", 10));
      commands.push(createTextCommand(parts.join(" + ") || "-", 400, y, "F1", 10));
      y -= rowHeight;
    }

    // Total general : jours et heures ne s'additionnent pas, ils sont annonces separement.
    const totalDays = companies
      .filter((company) => company.unit === "day")
      .reduce((total, company) => total + company.quantity, 0);
    const totalHours = companies
      .filter((company) => company.unit === "hour")
      .reduce((total, company) => total + company.quantity, 0);
    const totalParts = [
      totalDays > 0 ? `${formatDayCount(totalDays)} jour(s)` : null,
      totalHours > 0 ? `${formatDayCount(totalHours)} heure(s)` : null,
    ].filter(Boolean);

    y += 6;
    drawRule();
    y -= rowHeight;
    commands.push("0.06 0.12 0.18 rg");
    commands.push(createTextCommand("Total", 46, y, "F2", 10));
    commands.push(createTextCommand(totalParts.join(" + ") || "0 jour(s)", 400, y, "F2", 10));
    y -= rowHeight + 6;
  }
  addField("Conge paye :", `${formatDayCount(input.paidLeaveDays ?? 0)} jour(s)`);
  addField("Arret maladie :", `${formatDayCount(input.sickLeaveDays ?? 0)} jour(s)`);
  addField("Conge exceptionnel :", `${formatDayCount(input.exceptionalLeaveDays ?? 0)} jour(s)`);
  addField("Conge sans solde :", `${formatDayCount(input.unpaidLeaveDays ?? 0)} jour(s)`);
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

export function buildCraPdfBytes(input: CraPdfInput, logoRgbBase64?: string | null) {
  const content = buildCraPdfContent(input, Boolean(logoRgbBase64));
  return binaryStringToBytes(createPdfString(content, { logoRgbBase64 }));
}

export function buildCraPdfBuffer(input: CraPdfInput, logoRgbBase64?: string | null) {
  return Buffer.from(buildCraPdfBytes(input, logoRgbBase64));
}
