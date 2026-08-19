import {
  BookOpen,
  CircleHelp,
  FileText,
  FolderClosed,
  LayoutDashboard,
  Settings,
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

/**
 * Lien du pied de la barre laterale.
 *
 * `href` est OPTIONNEL a dessein : le centre d'aide, la documentation et le changelog
 * n'ont aucune page dans l'application. Plutot que d'inventer des destinations ou de
 * pointer vers une page sans rapport, une entree sans `href` s'affiche en grise et ne
 * navigue pas. Renseigner l'adresse suffit a l'activer.
 */
export type ConsoleFooterLink = {
  label: string;
  href?: string;
  icon: LucideIcon;
};

/** Encart d'annonce en pied de barre laterale. Masque tant que `title` est absent. */
export type ConsoleFooterNote = {
  /** Surtitre en petites capitales. */
  eyebrow: string;
  title: string;
  description: string;
  linkLabel: string;
  href?: string;
};

export type ConsoleFooter = {
  note?: ConsoleFooterNote;
  links: ConsoleFooterLink[];
  /** Mention legale, en tout bas. */
  legal: string;
};

/**
 * Pied commun aux deux espaces : le contenu ne depend pas du role.
 *
 * L'encart reprend la forme de la maquette (surtitre, titre, une phrase, un lien). Son
 * texte decrit le chantier en cours plutot qu'une version fictive : annoncer une release
 * qui n'existe pas serait une fausse communication produit.
 */
export const CONSOLE_FOOTER: ConsoleFooter = {
  note: {
    eyebrow: "Nouveautes",
    title: "Nouvelle console",
    description: "Navigation repensee et mise en page allegee.",
    linkLabel: "En savoir plus",
  },
  links: [
    { label: "Centre d'aide", href: "/contact", icon: CircleHelp },
    { label: "Documentation", icon: BookOpen },
  ],
  // Repris tel quel du pied du site public. Sans annee calculee : `new Date()` au
  // chargement du module ferait diverger le rendu serveur et le rendu client.
  legal: "Jarvis Connect - Tous droits reserves",
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
      label: "Vue d'ensemble",
      items: [
        {
          label: "Tableau de bord",
          href: "/dashboard/rh",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      label: "Gestion",
      items: [
        {
          /*
           * Pas de sous-menu : une seule page, avec un filtre de statut a l'interieur.
           *
           * Les URL /actifs et /inactifs restent VALIDES — elles pre-selectionnent le
           * filtre correspondant. Un signet existant continue donc de fonctionner, et
           * `activePrefix` marque cette entree active sur toutes ces routes, fiche
           * collaborateur comprise.
           */
          label: "Collaborateurs",
          href: "/dashboard/rh/collaborateurs",
          icon: Users,
          activePrefix: "/dashboard/rh/collaborateurs",
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
    /*
     * Groupe « Recrutement » RETIRE DE LA NAVIGATION le 18/08/2026 : fonctionnalite non
     * utilisee pour l'instant.
     *
     * Les pages ne sont PAS supprimees — /dashboard/rh/offres, ses archives, ses
     * candidatures et son formulaire de creation repondent toujours, ainsi que les routes
     * d'API correspondantes. Seul le point d'entree disparait. Pour retablir la section,
     * remettre ce bloc :
     *
     *   {
     *     label: "Recrutement",
     *     items: [
     *       {
     *         label: "Offres",
     *         href: "/dashboard/rh/offres",
     *         icon: Briefcase,
     *         activePrefix: "/dashboard/rh/offres",
     *         children: [
     *           { label: "Offres actives", href: "/dashboard/rh/offres" },
     *           { label: "Candidatures", href: "/dashboard/rh/offres/candidatures" },
     *           { label: "Archives", href: "/dashboard/rh/offres/archives" },
     *           { label: "Creer une offre", href: "/dashboard/rh/offres/creer" },
     *         ],
     *       },
     *     ],
     *   },
     *
     * NB : `Briefcase` n'est plus importe de lucide-react — le reajouter aussi.
     */
    {
      label: "Administration",
      items: [
        {
          label: "Parametres",
          href: "/dashboard/rh/parametres",
          icon: Settings,
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
      label: "Vue d'ensemble",
      items: [
        {
          label: "Tableau de bord",
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
    /*
     * Groupe « Carriere » RETIRE DE LA NAVIGATION le 18/08/2026, en pendant du groupe
     * « Recrutement » cote RH : sans personne pour publier d'offres, il n'y avait plus de
     * raison d'en proposer la consultation aux salaries.
     *
     * Les pages ne sont PAS supprimees — /dashboard/salarie/offres, /mes-offres,
     * /candidatures et /cv repondent toujours. Seul le point d'entree disparait. Pour
     * retablir la section, remettre ce bloc :
     *
     *   {
     *     label: "Carriere",
     *     items: [
     *       {
     *         label: "Offres d'emploi",
     *         href: "/dashboard/salarie/offres",
     *         icon: Briefcase,
     *         aliases: ["/dashboard/salarie/mes-offres"],
     *       },
     *       { label: "Mes candidatures", href: "/dashboard/salarie/candidatures", icon: Send },
     *       { label: "Mes CVs", href: "/dashboard/salarie/cv", icon: IdCard },
     *     ],
     *   },
     *
     * NB : `Briefcase`, `Send` et `IdCard` ne sont plus importes — les reajouter aussi.
     */
    {
      label: "Administration",
      items: [
        {
          label: "Parametres",
          href: "/dashboard/salarie/parametres",
          icon: Settings,
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

  // Les parametres figurent desormais dans le groupe « Administration » et sont donc deja
  // collectes par la boucle. On ne les ajoute que s'ils manquent — la garde couvre les deux
  // sens : pas de doublon dans la palette aujourd'hui, et pas de disparition silencieuse si
  // ce groupe venait a etre retire.
  if (!destinations.some((destination) => destination.href === config.settingsHref)) {
    destinations.push({
      label: config.settingsLabel,
      href: config.settingsHref,
      section: config.rootLabel,
    });
  }

  return destinations;
}
