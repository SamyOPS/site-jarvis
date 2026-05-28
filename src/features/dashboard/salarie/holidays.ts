function computeEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

const cache = new Map<number, Map<string, string>>();

export function getFrenchHolidays(year: number): Map<string, string> {
  const cached = cache.get(year);
  if (cached) return cached;

  const easter = computeEasterSunday(year);
  const map = new Map<string, string>();

  map.set(`${year}-01-01`, "Jour de l'An");
  map.set(toIsoDate(addDays(easter, 1)), "Lundi de Pâques");
  map.set(`${year}-05-01`, "Fête du Travail");
  map.set(`${year}-05-08`, "Victoire 1945");
  map.set(toIsoDate(addDays(easter, 39)), "Ascension");
  map.set(toIsoDate(addDays(easter, 50)), "Lundi de Pentecôte");
  map.set(`${year}-07-14`, "Fête nationale");
  map.set(`${year}-08-15`, "Assomption");
  map.set(`${year}-11-01`, "Toussaint");
  map.set(`${year}-11-11`, "Armistice 1918");
  map.set(`${year}-12-25`, "Noël");

  cache.set(year, map);
  return map;
}

export function getFrenchHolidayName(isoDate: string): string | null {
  const year = Number(isoDate.slice(0, 4));
  if (!Number.isFinite(year)) return null;
  return getFrenchHolidays(year).get(isoDate) ?? null;
}
