import {
  Briefcase,
  FileText,
  FolderClosed,
  IdCard,
  LayoutDashboard,
  Send,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Navigation declarative du shell console.
 *
 * Remplace src/components/dashboard/rh/sidebar-nav.tsx et
 * src/components/dashboard/salarie/sidebar-nav.tsx, qui etaient deux copies
 * du meme JSX ne differant que par les libelles et les hrefs.
 *
 * L'etat actif est derive de usePathname() et non plus des props de route :
 * le shell n'a donc plus besoin de connaitre currentSection/currentSubSection.
 * Ces props restent inchangees cote workspace, elles pilotent le contenu.
 *
 * Toutes les destinations existantes sont preservees, y compris les routes
 * qui n'etaient pas listees dans l'ancienne sidebar (par-type, cra, facture,
 * mes-offres) : elles sont rattachees en alias a l'entree equivalente.
 */

export type ConsoleRole = "rh" | "salarie";

export type ConsoleNavChild = {
  label: string;
  href: string;
  /** Chemins supplementaires qui marquent ce sous-lien comme actif. */
  aliases?: string[];
};

export type ConsoleNavEntry = {
  label: string;
  href: string;
  icon: LucideIcon;
  /**
   * Prefixe marquant l'entree comme active (elle et ses descendants).
   * Absent = correspondance exacte uniquement, ce qui evite qu'une entree
   * racine comme /dashboard/rh capture toutes les sous-routes.
   */
  activePrefix?: string;
  aliases?: string[];
  children?: ConsoleNavChild[];
};

export type ConsoleNavGroup = {
  /** null = groupe de tete, affiche sans en-tete. */
  label: string | null;
  items: ConsoleNavEntry[];
};

export type ConsoleNavConfig = {
  role: ConsoleRole;
  roleLabel: string;
  /** Racine de l'espace, utilisee comme premier fil d'Ariane. */
  rootHref: string;
  rootLabel: string;
  settingsHref: string;
  settingsLabel: string;
  groups: ConsoleNavGroup[];
  /**
   * Libelle du dernier fil d'Ariane pour les routes qui n'ont pas d'entree
   * de navigation dediee (fiche collaborateur, parametres...).
   */
  resolveLeafLabel?: (pathname: string) => string | null;
};

/* ---------------------------------------------------------------------------
 * Espace RH
 * ------------------------------------------------------------------------ */

export const RH_NAV_CONFIG: ConsoleNavConfig = {
  role: "rh",
  roleLabel: "Espace RH",
  rootHref: "/dashboard/rh",
  rootLabel: "Espace RH",
  settingsHref: "/dashboard/rh/parametres",
  settingsLabel: "Parametres",
  groups: [
    {
      label: null,
      items: [
        {
          label: "Vue d'ensemble",
          href: "/dashboard/rh",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      label: "Gestion",
      items: [
        {
          label: "Collaborateurs",
          href: "/dashboard/rh/collaborateurs",
          icon: Users,
          activePrefix: "/dashboard/rh/collaborateurs",
          children: [
            {
              label: "Tous les collaborateurs",
              href: "/dashboard/rh/collaborateurs",
            },
            { label: "Actifs", href: "/dashboard/rh/collaborateurs/actifs" },
            {
              label: "Inactifs / Sortants",
              href: "/dashboard/rh/collaborateurs/inactifs",
            },
          ],
        },
        {
          label: "Documents",
          href: "/dashboard/rh/documents/tous",
          icon: FileText,
          activePrefix: "/dashboard/rh/documents",
          children: [
            {
              label: "Tous les documents",
              href: "/dashboard/rh/documents/tous",
              aliases: [
                "/dashboard/rh/documents",
                "/dashboard/rh/documents/par-type",
              ],
            },
            {
              label: "CRA & Facture",
              href: "/dashboard/rh/documents/cra-facture",
            },
            { label: "Conges", href: "/dashboard/rh/documents/conge" },
            { label: "A valider", href: "/dashboard/rh/documents/a-valider" },
            {
              label: "Mes demandes",
              href: "/dashboard/rh/documents/mes-demandes",
            },
            { label: "Corbeille", href: "/dashboard/rh/documents/corbeille" },
          ],
        },
      ],
    },
    {
      label: "Recrutement",
      items: [
        {
          label: "Offres",
          href: "/dashboard/rh/offres",
          icon: Briefcase,
          activePrefix: "/dashboard/rh/offres",
          children: [
            { label: "Offres actives", href: "/dashboard/rh/offres" },
            { label: "Candidatures", href: "/dashboard/rh/offres/candidatures" },
            { label: "Archives", href: "/dashboard/rh/offres/archives" },
            { label: "Creer une offre", href: "/dashboard/rh/offres/creer" },
          ],
        },
      ],
    },
  ],
  resolveLeafLabel(pathname) {
    if (pathname === "/dashboard/rh/parametres") return "Parametres";
    if (
      pathname.startsWith("/dashboard/rh/collaborateurs/") &&
      !pathname.endsWith("/actifs") &&
      !pathname.endsWith("/inactifs")
    ) {
      return "Fiche collaborateur";
    }
    return null;
  },
};

/* ---------------------------------------------------------------------------
 * Espace salarie
 * ------------------------------------------------------------------------ */

export const SALARIE_NAV_CONFIG: ConsoleNavConfig = {
  role: "salarie",
  roleLabel: "Espace salarie",
  rootHref: "/dashboard/salarie",
  rootLabel: "Espace salarie",
  settingsHref: "/dashboard/salarie/parametres",
  settingsLabel: "Parametres",
  groups: [
    {
      label: null,
      items: [
        {
          label: "Vue d'ensemble",
          href: "/dashboard/salarie",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      label: "Documents",
      items: [
        {
          label: "Mes documents",
          href: "/dashboard/salarie/documents",
          icon: FolderClosed,
          activePrefix: "/dashboard/salarie/documents",
          children: [
            {
              label: "A deposer",
              href: "/dashboard/salarie/documents/a-deposer",
            },
            { label: "Tous mes documents", href: "/dashboard/salarie/documents" },
            {
              label: "Fiches de paie",
              href: "/dashboard/salarie/documents/fiches-de-paie",
            },
            {
              label: "CRA & Facture",
              href: "/dashboard/salarie/documents/cra-facture",
              aliases: [
                "/dashboard/salarie/documents/cra",
                "/dashboard/salarie/documents/facture",
              ],
            },
            { label: "Conges", href: "/dashboard/salarie/documents/conge" },
            {
              label: "Corbeille",
              href: "/dashboard/salarie/documents/corbeille",
            },
          ],
        },
      ],
    },
    {
      label: "Carriere",
      items: [
        {
          label: "Offres d'emploi",
          href: "/dashboard/salarie/offres",
          icon: Briefcase,
          aliases: ["/dashboard/salarie/mes-offres"],
        },
        {
          label: "Mes candidatures",
          href: "/dashboard/salarie/candidatures",
          icon: Send,
        },
        {
          label: "Mes CVs",
          href: "/dashboard/salarie/cv",
          icon: IdCard,
        },
      ],
    },
  ],
  resolveLeafLabel(pathname) {
    return pathname === "/dashboard/salarie/parametres" ? "Parametres" : null;
  },
};

export const CONSOLE_NAV_CONFIGS: Record<ConsoleRole, ConsoleNavConfig> = {
  rh: RH_NAV_CONFIG,
  salarie: SALARIE_NAV_CONFIG,
};

/* ---------------------------------------------------------------------------
 * Derivation de l'etat actif
 * ------------------------------------------------------------------------ */

function matchesHref(pathname: string, href: string, aliases?: string[]) {
  if (pathname === href) return true;
  return Boolean(aliases?.includes(pathname));
}

export function isChildActive(child: ConsoleNavChild, pathname: string) {
  return matchesHref(pathname, child.href, child.aliases);
}

export function isEntryActive(entry: ConsoleNavEntry, pathname: string) {
  if (matchesHref(pathname, entry.href, entry.aliases)) return true;
  if (entry.activePrefix) {
    if (pathname === entry.activePrefix) return true;
    if (pathname.startsWith(`${entry.activePrefix}/`)) return true;
  }
  return entry.children?.some((child) => isChildActive(child, pathname)) ?? false;
}

/**
 * Sous-lien actif de l'entree. Utile quand plusieurs sous-liens partagent un
 * prefixe : on retient la correspondance exacte, jamais un prefixe.
 */
export function getActiveChild(entry: ConsoleNavEntry, pathname: string) {
  return entry.children?.find((child) => isChildActive(child, pathname)) ?? null;
}

export function getActiveEntry(config: ConsoleNavConfig, pathname: string) {
  for (const group of config.groups) {
    for (const entry of group.items) {
      if (isEntryActive(entry, pathname)) return entry;
    }
  }
  return null;
}

/* ---------------------------------------------------------------------------
 * Fil d'Ariane et titre de page
 * ------------------------------------------------------------------------ */

export type ConsoleCrumb = {
  label: string;
  /** Absent sur le dernier element : il n'est pas cliquable. */
  href?: string;
};

export function getConsoleBreadcrumb(
  config: ConsoleNavConfig,
  pathname: string,
): ConsoleCrumb[] {
  const crumbs: ConsoleCrumb[] = [
    { label: config.rootLabel, href: config.rootHref },
  ];

  const entry = getActiveEntry(config, pathname);

  if (entry) {
    // L'entree racine est deja representee par le premier fil d'Ariane.
    if (entry.href !== config.rootHref) {
      crumbs.push({ label: entry.label, href: entry.href });
    }

    const child = getActiveChild(entry, pathname);
    if (child) {
      crumbs.push({ label: child.label, href: child.href });
    }
  }

  const leafLabel = config.resolveLeafLabel?.(pathname);
  if (leafLabel) {
    crumbs.push({ label: leafLabel });
  }

  // Le dernier element represente la page courante : il perd son lien.
  const last = crumbs[crumbs.length - 1];
  if (last) delete last.href;

  return crumbs;
}

export function getConsolePageTitle(
  config: ConsoleNavConfig,
  pathname: string,
): string {
  const leafLabel = config.resolveLeafLabel?.(pathname);
  if (leafLabel) return leafLabel;

  const entry = getActiveEntry(config, pathname);
  if (!entry) return config.rootLabel;

  const child = getActiveChild(entry, pathname);
  return child?.label ?? entry.label;
}

/** Aplatit la navigation pour alimenter la palette de commandes. */
export function flattenNavDestinations(config: ConsoleNavConfig) {
  const destinations: { label: string; href: string; section: string }[] = [];

  for (const group of config.groups) {
    for (const entry of group.items) {
      destinations.push({
        label: entry.label,
        href: entry.href,
        section: group.label ?? config.rootLabel,
      });
      for (const child of entry.children ?? []) {
        if (child.href === entry.href) continue;
        destinations.push({
          label: child.label,
          href: child.href,
          section: entry.label,
        });
      }
    }
  }

  destinations.push({
    label: config.settingsLabel,
    href: config.settingsHref,
    section: config.rootLabel,
  });

  return destinations;
}
