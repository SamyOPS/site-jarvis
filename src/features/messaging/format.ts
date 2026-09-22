/** Mises en forme propres a la messagerie : dates relatives et separateurs de jour. */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** « a l'instant », « il y a 12 min », « il y a 3 h », puis la date. */
export function formatRelativeTime(value: string | null | undefined) {
  if (!value) return "";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "";

  const elapsed = Date.now() - time;
  if (elapsed < MINUTE) return "à l'instant";
  if (elapsed < HOUR) return `il y a ${Math.round(elapsed / MINUTE)} min`;
  if (elapsed < DAY) return `il y a ${Math.round(elapsed / HOUR)} h`;
  if (elapsed < 7 * DAY) return `il y a ${Math.round(elapsed / DAY)} j`;

  return new Date(time).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

/** Heure d'un message, telle qu'elle s'affiche sous la bulle. */
export function formatMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/** Libelle du separateur de journee : « Aujourd'hui », « Hier », ou la date complete. */
export function formatDaySeparator(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const startOfDay = (input: Date) =>
    new Date(input.getFullYear(), input.getMonth(), input.getDate()).getTime();
  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / DAY);

  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Clé de regroupement par journée, pour savoir où poser un séparateur. */
export function dayKey(value: string) {
  return value.slice(0, 10);
}

/** Initiales d'un nom, pour la pastille d'avatar. */
export function initialsOf(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "?"
  );
}
