/**
 * Navigation declarative des espaces du tableau de bord.
 *
 * Remplace les deux copies de JSX que sont src/components/dashboard/rh/sidebar-nav.tsx
 * et src/components/dashboard/salarie/sidebar-nav.tsx : meme structure, memes classes,
 * seuls les libelles, les liens et les valeurs de section changeaient.
 *
 * L'etat actif reste derive des props `currentSection` / `currentSubSection`, comme
 * aujourd'hui — et non de `usePathname()`. Le passage au pathname suppose de sortir le
 * workspace vers le layout, ce qui releve du chantier « rendu serveur », pas d'ici.
 *
 * A ne pas confondre avec `nav-config.ts` du chantier console, qui decrit une navigation
 * differente (icones, groupes titres, entree parametres) : c'est une refonte visuelle,
 * pas la navigation en place.
 */

export type SidebarSubItem = {
  label: string;
  href: string;
  /** Valeur de `currentSubSection` qui rend ce lien actif. */
  subSection: string;
  /** Niveau supplementaire d'imbrication (les fiches de paie, cote salarie). */
  children?: SidebarSubItem[];
};

export type SidebarItem = {
  label: string;
  href: string;
  /** Valeur de `currentSection` qui rend cette entree active et deplie ses enfants. */
  section: string;
  children?: SidebarSubItem[];
  /**
   * Libelle affiche en texte non cliquable quand la sous-section courante y correspond.
   * Sert a la fiche collaborateur, qui n'a pas de lien de navigation propre.
   */
  staticChild?: { label: string; subSection: string };
};

export type SidebarConfig = {
  /** Destination du bloc de marque, en tete de la barre laterale. */
  homeHref: string;
  brand: string;
  items: SidebarItem[];
};

export const RH_SIDEBAR: SidebarConfig = {
  homeHref: "/",
  brand: "Jarvis Connect",
  items: [
    {
      label: "Vue d'ensemble",
      href: "/dashboard/rh",
      section: "overview",
    },
    {
      label: "Collaborateurs",
      href: "/dashboard/rh/collaborateurs",
      section: "collaborateurs",
      children: [
        {
          label: "Tous les collaborateurs",
          href: "/dashboard/rh/collaborateurs",
          subSection: "collab_tous",
        },
        {
          label: "Actifs",
          href: "/dashboard/rh/collaborateurs/actifs",
          subSection: "collab_actifs",
        },
        {
          label: "Inactifs / Sortants",
          href: "/dashboard/rh/collaborateurs/inactifs",
          subSection: "collab_inactifs",
        },
      ],
      staticChild: { label: "Fiche collaborateur", subSection: "collab_detail" },
    },
    {
      label: "Documents",
      href: "/dashboard/rh/documents",
      section: "documents",
      children: [
        {
          label: "Tous les documents",
          href: "/dashboard/rh/documents/tous",
          subSection: "docs_all",
        },
        {
          label: "CRA & Facture",
          href: "/dashboard/rh/documents/cra-facture",
          subSection: "docs_cra_facture",
        },
        {
          label: "Congés",
          href: "/dashboard/rh/documents/conge",
          subSection: "docs_conge",
        },
        {
          label: "A valider",
          href: "/dashboard/rh/documents/a-valider",
          subSection: "docs_a_valider",
        },
        {
          label: "Mes demandes",
          href: "/dashboard/rh/documents/mes-demandes",
          subSection: "docs_mes_demandes",
        },
        {
          label: "Corbeille",
          href: "/dashboard/rh/documents/corbeille",
          subSection: "docs_corbeille",
        },
      ],
    },
    {
      label: "Offres",
      href: "/dashboard/rh/offres",
      section: "offres",
      children: [
        {
          label: "Offres actives",
          href: "/dashboard/rh/offres",
          subSection: "offres_actives",
        },
        {
          label: "Candidatures",
          href: "/dashboard/rh/offres/candidatures",
          subSection: "offres_candidatures",
        },
        {
          label: "Archives",
          href: "/dashboard/rh/offres/archives",
          subSection: "offres_archives",
        },
        {
          label: "Creer une offre",
          href: "/dashboard/rh/offres/creer",
          subSection: "offres_creer",
        },
      ],
    },
  ],
};

export const SALARIE_SIDEBAR: SidebarConfig = {
  homeHref: "/",
  brand: "Jarvis Connect",
  items: [
    {
      label: "Vue d'ensemble",
      href: "/dashboard/salarie",
      section: "overview",
    },
    {
      label: "Mes documents",
      href: "/dashboard/salarie/documents",
      section: "documents",
      children: [
        {
          label: "A deposer",
          href: "/dashboard/salarie/documents/a-deposer",
          subSection: "docs_a_deposer",
        },
        {
          label: "Tous mes documents",
          href: "/dashboard/salarie/documents",
          subSection: "docs_tous",
          children: [
            {
              label: "Fiches de paie",
              href: "/dashboard/salarie/documents/fiches-de-paie",
              subSection: "docs_fiches_paie",
            },
          ],
        },
        {
          label: "CRA & Facture",
          href: "/dashboard/salarie/documents/cra-facture",
          subSection: "docs_cra_facture",
        },
        {
          label: "Congés",
          href: "/dashboard/salarie/documents/conge",
          subSection: "docs_conge",
        },
        {
          label: "Corbeille",
          href: "/dashboard/salarie/documents/corbeille",
          subSection: "docs_corbeille",
        },
      ],
    },
    {
      label: "Offres d'emploi",
      href: "/dashboard/salarie/offres",
      section: "offres",
      children: [
        {
          label: "Toutes les offres",
          href: "/dashboard/salarie/offres",
          subSection: "offres_toutes",
        },
        {
          label: "Mes candidatures",
          href: "/dashboard/salarie/candidatures",
          subSection: "candidatures",
        },
        {
          label: "Mes CVs",
          href: "/dashboard/salarie/cv",
          subSection: "cvs",
        },
      ],
    },
  ],
};
