/**
 * Parametres du compte : formes, valeurs par defaut et validation.
 *
 * Module PUR, partage par le navigateur et les routes. Les preferences arrivent d'une
 * colonne `jsonb` — donc de n'importe quoi — et sont relues par du code qui suppose une
 * forme precise. Les valider ici, une fois, evite d'avoir a s'en mefier partout ailleurs.
 */

/** Roles disposant d'une page de parametres. */
export const ACCOUNT_ROLES = ["rh", "salarie", "admin"] as const;

/* ---------------------------------------------------------------------------
 * Apparence
 * ------------------------------------------------------------------------ */

export const CONSOLE_THEMES = ["light", "dark"] as const;
export type ConsoleThemeChoice = (typeof CONSOLE_THEMES)[number];

/** Tailles de page proposees par les listes de documents. */
export const PAGE_SIZES = [25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

/**
 * Ecran ouvert a la connexion. Les valeurs sont des CLES, pas des chemins : le chemin
 * depend du role, et figer « /dashboard/rh/... » ici rendrait la preference inutilisable
 * pour un salarie.
 */
export const HOME_PAGES = ["overview", "documents", "messages"] as const;
export type HomePage = (typeof HOME_PAGES)[number];

export const HOME_PAGE_LABELS: Record<HomePage, string> = {
  overview: "Tableau de bord",
  documents: "Documents",
  messages: "Messagerie",
};

export type AppearanceSettings = {
  theme: ConsoleThemeChoice;
  sidebarCollapsed: boolean;
  pageSize: PageSize;
  homePage: HomePage;
};

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  theme: "light",
  sidebarCollapsed: false,
  pageSize: 25,
  homePage: "overview",
};

/** Chemin de l'ecran d'accueil choisi, pour un role donne. */
export function homePageHref(homePage: HomePage, role: "rh" | "salarie") {
  const root = `/dashboard/${role}`;
  if (homePage === "messages") return `${root}/messages`;
  if (homePage === "documents") {
    return role === "rh" ? `${root}/documents/tous` : `${root}/documents`;
  }
  return root;
}

/* ---------------------------------------------------------------------------
 * Notifications par e-mail
 * ------------------------------------------------------------------------ */

/**
 * Familles d'e-mails, une case par famille.
 *
 * Le decoupage suit ce que l'application ENVOIE reellement, et non des categories
 * inventees : proposer de couper des messages qui n'existent pas serait un reglage sans
 * effet.
 */
export const NOTIFICATION_KINDS = [
  "documentRequests",
  "documentUploads",
  "generatedDocuments",
  "messageReminders",
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export type NotificationSettings = Record<NotificationKind, boolean>;

/** Tout est actif par defaut : c'est le comportement actuel, et le plus sur. */
export const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  documentRequests: true,
  documentUploads: true,
  generatedDocuments: true,
  messageReminders: true,
};

export const NOTIFICATION_LABELS: Record<
  NotificationKind,
  { title: string; description: string }
> = {
  documentRequests: {
    title: "Demandes de documents",
    description: "Quand le service RH vous réclame une pièce.",
  },
  documentUploads: {
    title: "Dépôts de documents",
    description: "Quand un document est déposé pour vous, ou par un collaborateur que vous suivez.",
  },
  generatedDocuments: {
    title: "CRA, factures et congés",
    description: "Quand un de ces documents est généré et ajouté à un espace.",
  },
  messageReminders: {
    title: "Rappels de messagerie",
    description: "Quand un message reste non lu au bout de quinze minutes.",
  },
};

/* ---------------------------------------------------------------------------
 * Cles de stockage
 * ------------------------------------------------------------------------ */

/**
 * Cles utilisees dans `user_dashboard_preferences`.
 *
 * Prefixees `account.` pour ne jamais entrer en collision avec les cles de colonnes de
 * listes, qui occupent la meme table et sont nommees d'apres l'ecran (« rh-documents-
 * columns »...).
 */
export const ACCOUNT_PREFERENCE_KEYS = {
  appearance: "account.appearance",
  notifications: "account.notifications",
} as const;

export type AccountPreferenceSection = keyof typeof ACCOUNT_PREFERENCE_KEYS;

/* ---------------------------------------------------------------------------
 * Validation
 * ------------------------------------------------------------------------ */

function pick<T extends readonly unknown[]>(
  allowed: T,
  value: unknown,
  fallback: T[number],
): T[number] {
  return allowed.includes(value as T[number]) ? (value as T[number]) : fallback;
}

/**
 * Normalise une valeur d'apparence.
 *
 * Champ par champ, avec repli sur le defaut : une preference partiellement corrompue ne
 * doit pas emporter les autres. C'est aussi ce qui permet d'ajouter un reglage plus tard
 * sans migrer les lignes deja ecrites.
 */
export function parseAppearance(value: unknown): AppearanceSettings {
  const raw = (value ?? {}) as Partial<Record<keyof AppearanceSettings, unknown>>;
  return {
    theme: pick(CONSOLE_THEMES, raw.theme, DEFAULT_APPEARANCE.theme),
    sidebarCollapsed:
      typeof raw.sidebarCollapsed === "boolean"
        ? raw.sidebarCollapsed
        : DEFAULT_APPEARANCE.sidebarCollapsed,
    pageSize: pick(PAGE_SIZES, Number(raw.pageSize), DEFAULT_APPEARANCE.pageSize),
    homePage: pick(HOME_PAGES, raw.homePage, DEFAULT_APPEARANCE.homePage),
  };
}

export function parseNotifications(value: unknown): NotificationSettings {
  const raw = (value ?? {}) as Partial<Record<NotificationKind, unknown>>;
  const result = { ...DEFAULT_NOTIFICATIONS };
  for (const kind of NOTIFICATION_KINDS) {
    if (typeof raw[kind] === "boolean") result[kind] = raw[kind];
  }
  return result;
}

/* ---------------------------------------------------------------------------
 * Profil
 * ------------------------------------------------------------------------ */

/** Longueurs maximales, alignees sur ce que l'interface affiche sans deborder. */
export const PROFILE_LIMITS = { fullName: 120, phone: 30 } as const;

export type AccountProfile = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: string | null;
  /** Chemin dans le bucket `avatars`, ou null. */
  avatarPath: string | null;
  /** URL publique reconstituee par le serveur. */
  avatarUrl: string | null;
};

/* ---------------------------------------------------------------------------
 * Robustesse du mot de passe
 * ------------------------------------------------------------------------ */

export const PASSWORD_MIN_LENGTH = 8;

export type PasswordStrength = {
  /** 0 a 4. */
  score: number;
  label: string;
  /** Ce qui manque pour monter d'un cran. Vide quand le score est au maximum. */
  hints: string[];
};

/**
 * Evaluation de la robustesse d'un mot de passe.
 *
 * Volontairement simple et locale : longueur et diversite des caracteres. Aucune
 * dependance, aucun appel reseau — un mot de passe en clair n'a rien a faire ailleurs que
 * dans le champ ou il est saisi.
 */
export function evaluatePassword(password: string): PasswordStrength {
  const checks = {
    length: password.length >= 12,
    minimum: password.length >= PASSWORD_MIN_LENGTH,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    digit: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };

  const hints: string[] = [];
  if (!checks.minimum) hints.push(`au moins ${PASSWORD_MIN_LENGTH} caractères`);
  else if (!checks.length) hints.push("12 caractères ou plus");
  if (!checks.lower || !checks.upper) hints.push("des majuscules et des minuscules");
  if (!checks.digit) hints.push("un chiffre");
  if (!checks.symbol) hints.push("un caractère spécial");

  if (!password) return { score: 0, label: "", hints: [] };
  if (!checks.minimum) return { score: 0, label: "Trop court", hints };

  const variety = [checks.lower, checks.upper, checks.digit, checks.symbol].filter(
    Boolean,
  ).length;
  const score = Math.min(4, variety + (checks.length ? 1 : 0) - 1);
  const labels = ["Faible", "Moyen", "Correct", "Solide", "Excellent"];

  return { score, label: labels[score] ?? "", hints };
}
