import { ABSENCE_LABELS } from "@/domain/cra";
import {
  binaryStringToBytes,
  createMultiPagePdfString,
  createTextCommand,
} from "@/lib/pdf-primitives";

/** Creneau horaire d'une journee, tel que saisi : « 09:00 » - « 10:30 », commentaire. */
export type CraPdfSlot = { start: string; end: string; label: string };

type CraPdfEntry = {
  workDate: string;
  dayQuantity: number;
  /** Heures d'une ligne facturee a l'heure ; nul ou absent pour une ligne au jour. */
  hours?: number | null;
  /** Type d'absence (paid, sick, exceptional, unpaid) ; absent pour une journee travaillee. */
  absenceType?: string | null;
  label: string | null;
  /** Entreprise de la ligne. */
  companyName?: string | null;
  /** Detail horaire de la journee, dans l'ordre. */
  timeSlots?: CraPdfSlot[] | null;
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
  /**
   * Entreprise cliente du chemin MONO-entreprise, affichee seulement quand `companies` est
   * vide. Nullable : un collaborateur sans mission enregistree n'en a aucune a nommer.
   */
  companyName: string | null;
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
  /** Total d'heures declarees, pour le chemin mono-entreprise en saisie horaire. */
  workedHoursCount?: number | null;
  paidLeaveDays?: number;
  sickLeaveDays?: number;
  exceptionalLeaveDays?: number;
  unpaidLeaveDays?: number;
  periodMonth: string;
  notes: string | null;
  entries: CraPdfEntry[];
  /** Recapitulatif par entreprise cliente. Vide : synthese mono-entreprise. */
  companies?: CraPdfCompanySummary[];
};

/*
  Mise en page, en points (A4 portrait : 595 x 842).

  Le CRA est desormais MULTIPAGE : son detail (tous les jours travailles, avec leurs
  creneaux) depend des donnees. Page 1 : en-tete, synthese, absences, notes, puis debut du
  detail ; pages suivantes : suite du detail, en-tete du tableau repete. Chaque page porte
  un pied « CRA - nom - periode » et sa pagination.

  Les textes sont decoupes et tronques a leur VRAIE largeur, mesuree avec les metriques
  de Helvetica (voir `textWidth`) : un commentaire en majuscules est 40 % plus large qu'en
  minuscules, un decoupage au nombre de caracteres le ferait deborder de la page.
*/
const LEFT = 46;
const RIGHT = 549;
const TOP_FIRST = 676;
const TOP_NEXT = 790;
const BOTTOM = 64;

const COLUMN = { date: LEFT, client: 116, time: 232, detail: 278 } as const;
/** Commentaire d'un creneau : apres la plage « 09:00 - 10:30 » (≈ 54 pt en gras 9 pt). */
const SLOT_LABEL_X = 340;
const CLIENT_WIDTH = COLUMN.time - COLUMN.client - 8;
const DETAIL_WIDTH = RIGHT - COLUMN.detail;
const SLOT_LABEL_WIDTH = RIGHT - SLOT_LABEL_X;
const TABLE_SIZE = 9;
const LINE = 11;
const ROW_PADDING = 6;

const INK = "0 0 0 rg";
const NAVY = "0.06 0.12 0.18 rg";
const MUTED = "0.42 0.47 0.55 rg";
const RULE = "0.75 0.8 0.87 RG";
const ZEBRA = "0.955 0.965 0.98 rg";

function formatPeriodLabel(value: string) {
  const normalized = /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : value.slice(0, 10);
  const parsed = new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return value.slice(0, 7) || "-";
  }
  return parsed.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** « lun. 13 oct. ». En UTC : la date d'une ligne ne doit pas glisser selon le fuseau. */
function formatRowDate(value: string) {
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return value || "-";
  }
  return parsed.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(".", ",");
}

function formatQuantity(entry: CraPdfEntry) {
  if (Number(entry.hours ?? 0) > 0) return `${formatNumber(Number(entry.hours))} h`;
  return `${formatNumber(entry.dayQuantity)} j`;
}

function absenceLabel(type: string) {
  return ABSENCE_LABELS.find((absence) => absence.value === type)?.label ?? "Absence";
}

/*
  Largeurs des caracteres ASCII 32 a 126, en millièmes d'em : metriques AFM officielles
  des polices standard Helvetica et Helvetica-Bold (celles que le PDF declare).
*/
const HELVETICA = [
  278, 278, 355, 556, 556, 889, 667, 222, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  222, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];
const HELVETICA_BOLD = [
  278, 333, 474, 556, 556, 889, 722, 278, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
  278, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
  611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
];

/**
 * Largeur imprimee d'un texte, en points. Mesuree sur le texte tel que le PDF l'imprime :
 * accents retires, caracteres hors ASCII remplaces par une espace (`normalizePdfText`).
 */
function textWidth(value: string, font: "F1" | "F2", size: number) {
  const widths = font === "F2" ? HELVETICA_BOLD : HELVETICA;
  const printable = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, " ");
  let total = 0;
  for (let index = 0; index < printable.length; index += 1) {
    total += widths[printable.charCodeAt(index) - 32] ?? 556;
  }
  return (total * size) / 1000;
}

/**
 * Decoupe un texte en lignes d'au plus `maxWidth` points, sur les espaces. Le texte reste
 * BRUT : c'est `createTextCommand` qui l'echappe, une seule fois. (L'ancien generateur
 * echappait deux fois les lignes decoupees : une parenthese s'imprimait « \( ».)
 */
function wrapText(value: string, maxWidth: number, font: "F1" | "F2" = "F1", size = TABLE_SIZE) {
  const fits = (line: string) => textWidth(line, font, size) <= maxWidth;
  const words = value.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (fits(next)) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    // Un mot plus large que la ligne (une URL) est coupe net plutot que de deborder.
    let rest = word;
    while (!fits(rest)) {
      let cut = rest.length - 1;
      while (cut > 1 && !fits(rest.slice(0, cut))) cut -= 1;
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    current = rest;
  }
  if (current) lines.push(current);
  return lines;
}

/** Tronque un texte a `maxWidth` points, avec un point final s'il a ete coupe. */
function truncate(value: string, maxWidth: number, font: "F1" | "F2" = "F1", size = TABLE_SIZE) {
  if (textWidth(value, font, size) <= maxWidth) return value;
  let cut = value.length - 1;
  while (cut > 1 && textWidth(`${value.slice(0, cut)}.`, font, size) > maxWidth) cut -= 1;
  return `${value.slice(0, cut)}.`;
}

/** Une ligne du detail : une entreprise (ou une absence) sur une journee. */
type DetailRow = {
  date: string | null;
  client: string;
  time: string;
  /** Lignes de detail : texte simple, ou creneau (heures + commentaire). */
  lines: ({ kind: "text"; text: string } | { kind: "slot"; range: string; text: string })[];
  /** Index de la journee, pour alterner le fond d'un jour a l'autre. */
  dayIndex: number;
};

function buildDetailRows(input: CraPdfInput) {
  const fallbackClient = input.companyName || "-";
  const sorted = [...input.entries].sort((left, right) => {
    const byDate = left.workDate.localeCompare(right.workDate);
    if (byDate !== 0) return byDate;
    // Absence en dernier sur une meme journee, puis par entreprise.
    if (Boolean(left.absenceType) !== Boolean(right.absenceType)) return left.absenceType ? 1 : -1;
    return (left.companyName ?? "").localeCompare(right.companyName ?? "");
  });

  const rows: DetailRow[] = [];
  let previousDate = "";
  let dayIndex = -1;

  for (const entry of sorted) {
    const isNewDay = entry.workDate !== previousDate;
    if (isNewDay) dayIndex += 1;
    previousDate = entry.workDate;

    const lines: DetailRow["lines"] = [];
    const comment = entry.label?.trim() ?? "";

    if (entry.absenceType) {
      const text = comment ? `${absenceLabel(entry.absenceType)} - ${comment}` : absenceLabel(entry.absenceType);
      wrapText(text, DETAIL_WIDTH).forEach((line) => lines.push({ kind: "text", text: line }));
    } else {
      wrapText(comment, DETAIL_WIDTH).forEach((line) => lines.push({ kind: "text", text: line }));
      for (const slot of entry.timeSlots ?? []) {
        const label = slot.label.trim();
        const wrapped = label ? wrapText(label, SLOT_LABEL_WIDTH) : [""];
        wrapped.forEach((line, index) =>
          lines.push({ kind: "slot", range: index === 0 ? `${slot.start} - ${slot.end}` : "", text: line }),
        );
      }
    }

    rows.push({
      date: isNewDay ? formatRowDate(entry.workDate) : null,
      client: entry.absenceType ? "Absence" : truncate(entry.companyName || fallbackClient, CLIENT_WIDTH),
      time: formatQuantity(entry),
      lines,
      dayIndex,
    });
  }

  return rows;
}

function rowHeight(row: DetailRow) {
  return Math.max(1, row.lines.length) * LINE + ROW_PADDING;
}

function buildCraPages(input: CraPdfInput, withLogo: boolean) {
  const consultantName = `${input.firstName} ${input.lastName}`.trim() || "-";
  const periodLabel = formatPeriodLabel(input.periodMonth);

  const pages: string[][] = [];
  let commands: string[] = [];
  let y = 0;

  const text = (value: string, x: number, atY: number, font: "F1" | "F2", size: number, color = INK) => {
    commands.push(color, createTextCommand(value, x, atY, font, size));
  };
  const rule = (atY: number, from = LEFT, to = RIGHT) => {
    commands.push(RULE, "0.8 w", `${from} ${atY} m ${to} ${atY} l S`);
  };
  const sectionTitle = (title: string) => {
    text(title, LEFT, y, "F2", 11, NAVY);
    y -= 8;
    rule(y);
    y -= 16;
  };

  const startPage = () => {
    commands = ["1 1 1 rg", "0 0 595 842 re f"];
    pages.push(commands);
  };

  // --- Page 1 : en-tete -------------------------------------------------------------
  startPage();
  if (withLogo) {
    commands.push("q", "78 0 0 78 44 724 cm", "/Im1 Do", "Q");
  }
  text("Compte rendu d'activite", 180, 772, "F2", 20, NAVY);
  text(periodLabel, 180, 752, "F1", 12, MUTED);
  commands.push(RULE, "1.2 w", "180 740 m 549 740 l S");

  y = TOP_FIRST;
  const field = (label: string, value: string) => {
    text(label, LEFT, y, "F2", 10, NAVY);
    text(value, 170, y, "F1", 10);
    y -= 18;
  };
  field("Technicien :", truncate(consultantName, RIGHT - 170, "F1", 10));
  field("Periode :", periodLabel);

  const companies = input.companies ?? [];
  if (!companies.length) {
    field("Client :", input.companyName || "-");
    field("ESN partenaire :", input.esnPartenaire ?? "-");
  }
  y -= 14;

  // --- Synthese ---------------------------------------------------------------------
  sectionTitle("Synthese");
  if (!companies.length) {
    const hours = Number(input.workedHoursCount ?? 0);
    field(
      "Total travaille :",
      hours > 0 ? `${formatNumber(hours)} heure(s)` : `${formatNumber(input.workedDaysCount)} jour(s)`,
    );
  } else {
    text("Client", LEFT, y, "F2", 9, MUTED);
    text("ESN partenaire", 250, y, "F2", 9, MUTED);
    text("Temps travaille", 420, y, "F2", 9, MUTED);
    y -= 15;
    for (const company of companies) {
      text(truncate(company.companyName || "-", 250 - LEFT - 10, "F1", 10), LEFT, y, "F1", 10);
      text(truncate(company.esnPartenaire || "-", 420 - 250 - 10, "F1", 10), 250, y, "F1", 10);
      text(
        `${formatNumber(company.quantity)} ${company.unit === "hour" ? "heure(s)" : "jour(s)"}`,
        420,
        y,
        "F1",
        10,
      );
      y -= 16;
    }
    // Jours et heures ne s'additionnent pas : ils sont annonces separement.
    const totalDays = companies.filter((c) => c.unit === "day").reduce((t, c) => t + c.quantity, 0);
    const totalHours = companies.filter((c) => c.unit === "hour").reduce((t, c) => t + c.quantity, 0);
    const total = [
      totalDays > 0 ? `${formatNumber(totalDays)} jour(s)` : null,
      totalHours > 0 ? `${formatNumber(totalHours)} heure(s)` : null,
    ].filter(Boolean).join(" + ");
    y += 4;
    rule(y + 8, LEFT, RIGHT);
    y -= 8;
    text("Total", LEFT, y, "F2", 10, NAVY);
    text(total || "0 jour(s)", 420, y, "F2", 10, NAVY);
    y -= 18;
  }
  y -= 10;

  // --- Absences ---------------------------------------------------------------------
  sectionTitle("Absences et heures supplementaires");
  const absences = [
    ["Conge paye", input.paidLeaveDays ?? 0],
    ["Arret maladie", input.sickLeaveDays ?? 0],
    ["Conge exceptionnel", input.exceptionalLeaveDays ?? 0],
    ["Conge sans solde", input.unpaidLeaveDays ?? 0],
  ] as const;
  // Sur deux colonnes : quatre compteurs sur deux lignes au lieu de quatre.
  absences.forEach(([label, days], index) => {
    const x = index % 2 === 0 ? LEFT : 300;
    text(`${label} :`, x, y, "F2", 10, NAVY);
    text(`${formatNumber(days)} jour(s)`, x + 120, y, "F1", 10);
    if (index % 2 === 1) y -= 16;
  });
  text("Heures supplementaires :", LEFT, y, "F2", 10, NAVY);
  text("0 heure(s), dont 0 heure(s) de nuit", LEFT + 140, y, "F1", 10);
  y -= 26;

  // --- Notes ------------------------------------------------------------------------
  const notes = input.notes?.trim();
  if (notes) {
    sectionTitle("Notes");
    for (const line of wrapText(notes, RIGHT - LEFT, "F1", 10)) {
      text(line, LEFT, y, "F1", 10);
      y -= 14;
    }
    y -= 12;
  }

  // --- Detail des journees ----------------------------------------------------------
  const rows = buildDetailRows(input);

  const tableHeader = () => {
    text("Date", COLUMN.date, y, "F2", 9, MUTED);
    text("Client", COLUMN.client, y, "F2", 9, MUTED);
    text("Temps", COLUMN.time, y, "F2", 9, MUTED);
    text("Detail", COLUMN.detail, y, "F2", 9, MUTED);
    y -= 6;
    rule(y);
    y -= 12;
  };

  const newPage = () => {
    startPage();
    y = TOP_NEXT;
    text(`Detail des journees (suite) - ${consultantName} - ${periodLabel}`, LEFT, y, "F2", 10, NAVY);
    y -= 24;
    tableHeader();
  };

  // Le titre et au moins une ligne doivent tenir ensemble : sinon, page suivante.
  if (y - 60 - (rows[0] ? rowHeight(rows[0]) : 0) < BOTTOM) {
    newPage();
  } else {
    sectionTitle("Detail des journees");
    tableHeader();
  }

  if (!rows.length) {
    text("Aucune journee saisie.", LEFT, y, "F1", 10, MUTED);
    y -= 16;
  }

  for (const row of rows) {
    const height = rowHeight(row);
    if (y - height < BOTTOM) newPage();

    // Fond alterne d'une journee a l'autre : les lignes d'un meme jour restent groupees.
    if (row.dayIndex % 2 === 0) {
      commands.push(ZEBRA, `${LEFT - 4} ${y - height + LINE - 2} ${RIGHT - LEFT + 8} ${height} re f`);
    }

    if (row.date) text(row.date, COLUMN.date, y, "F2", 9);
    text(row.client, COLUMN.client, y, "F1", 9);
    text(row.time, COLUMN.time, y, "F1", 9);

    let lineY = y;
    for (const line of row.lines) {
      if (line.kind === "slot") {
        if (line.range) text(line.range, COLUMN.detail, lineY, "F2", 9, NAVY);
        if (line.text) text(line.text, SLOT_LABEL_X, lineY, "F1", 9);
      } else {
        text(line.text, COLUMN.detail, lineY, "F1", 9);
      }
      lineY -= LINE;
    }
    y -= height;
  }

  // Total du detail, sous le tableau.
  const detailDays = input.entries
    .filter((entry) => !entry.absenceType && !(Number(entry.hours ?? 0) > 0))
    .reduce((total, entry) => total + entry.dayQuantity, 0);
  const detailHours = input.entries.reduce((total, entry) => total + (entry.absenceType ? 0 : Number(entry.hours ?? 0)), 0);
  const detailTotal = [
    detailDays > 0 ? `${formatNumber(detailDays)} jour(s)` : null,
    detailHours > 0 ? `${formatNumber(detailHours)} heure(s)` : null,
  ].filter(Boolean).join(" + ");
  if (rows.length) {
    if (y - 24 < BOTTOM) newPage();
    rule(y + 6);
    y -= 10;
    text("Total travaille", COLUMN.date, y, "F2", 10, NAVY);
    text(detailTotal || "-", COLUMN.time, y, "F2", 10, NAVY);
  }

  // --- Pieds de page : la pagination n'est connue qu'a la fin -----------------------
  const footer = `CRA - ${consultantName} - ${periodLabel}`;
  pages.forEach((page, index) => {
    page.push(RULE, "0.6 w", `${LEFT} 44 m ${RIGHT} 44 l S`);
    page.push(MUTED, createTextCommand(footer, LEFT, 30, "F1", 8));
    page.push(MUTED, createTextCommand(`Page ${index + 1} / ${pages.length}`, 500, 30, "F1", 8));
  });

  return pages.map((page) => page.join("\n"));
}

export function buildCraPdfBytes(input: CraPdfInput, logoRgbBase64?: string | null) {
  const pages = buildCraPages(input, Boolean(logoRgbBase64));
  return binaryStringToBytes(createMultiPagePdfString(pages, { logoRgbBase64 }));
}

export function buildCraPdfBuffer(input: CraPdfInput, logoRgbBase64?: string | null) {
  return Buffer.from(buildCraPdfBytes(input, logoRgbBase64));
}
