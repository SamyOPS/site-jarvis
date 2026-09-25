// Liens de navigation partagés par le menu (panneau latéral) et le footer :
// une seule source de vérité, pour qu'un renommage de section (ex. « Offres »
// devenue « Formations ») n'ait pas à être répercuté à deux endroits.

export const mainLinks = [
  { label: "Accueil", href: "/" },
  { label: "Expertises", href: "/decouvrir#expertises" },
  { label: "Formations", href: "/decouvrir#formations" },
  /*
   * Pointe la SECTION de /decouvrir, pas la page /offres — comme les autres entrees de
   * cette liste. La page elle-meme reste atteignable par « Offres d'emploi » du bloc
   * « Membre de Jarvis » ci-dessous, et par le lien pose sur la section.
   *
   * La distinction compte au clic : une entree vers /offres sortirait de la vitrine, ce que
   * le pied de page sait traiter (il teste `leavesVitrine`) mais pas le menu, qui envoie
   * toutes ses entrees principales dans `onNav`.
   */
  { label: "Offres d'emploi", href: "/decouvrir#offres" },
  { label: "FAQ", href: "/decouvrir#faq" },
];

export const infoLinks = [
  { label: "Mentions légales", href: "/mentions-legales" },
  { label: "CGU", href: "/cgu" },
  {
    label: "Politique de confidentialité",
    href: "/politique-de-confidentialite",
  },
  { label: "S'inscrire à la newsletter", href: "#newsletter" },
];

// Bloc « Membre de Jarvis », repris tel quel par le panneau du menu et le footer.
// Ces deux destinations vivaient sur un site séparé, atteintes par leur URL
// absolue ; elles font désormais partie de cette application — la vitrine, les
// offres et la console sont un seul déploiement. Ce sont donc des routes
// internes : <Link> et transition de page, sans rechargement complet.
//
// Elles ne sont pas dans le groupe (vitrine) : leur layout diffère (ni menu, ni
// fondu de page). Le routeur s'en charge, la navigation reste côté client.
export const AUTH_HREF = "/auth";
export const JOBS_HREF = "/offres";

export const memberLinks = [
  { label: "Accéder à mon espace", href: AUTH_HREF },
  /*
   * « Voir toutes les offres » et non « Offres d'emploi » : ce libelle-la est desormais
   * celui de l'entree de navigation principale, qui mene a la SECTION de /decouvrir. Deux
   * liens homonymes vers deux destinations differentes cohabitaient dans le meme panneau.
   * Le « toutes » dit ce qui les separe — la liste complete, par opposition a l'aperçu.
   */
  { label: "Voir toutes les offres", href: JOBS_HREF },
];

// Quitte la vitrine : mérite le voile, et le voile doit rester posé jusqu'à ce
// que la page d'arrivée soit peinte.
//
// Deux cas répondent vrai. Une URL réellement sortante (réseaux sociaux,
// hébergeur), évidemment. Mais aussi /auth et /offres : ces routes appartiennent
// bien à cette application, hors du groupe (vitrine) et sous un autre layout.
// Le `PageTransition` de la vitrine s'y démonte — et le voile avec lui, d'un
// coup sec. Une navigation de document garde l'écran noir jusqu'au bout, et
// laisse le script d'amorçage reposer proprement les attributs de scope.
//
// Un mailto:/tel: n'est PAS concerné : il n'y a pas de navigation, seul le
// client de messagerie s'ouvre.
export const leavesVitrine = (href: string) =>
  /^https?:/.test(href) || isInternalExit(href);

/**
 * Sortie de la vitrine vers une page de cette meme application.
 *
 * La distinction compte au moment du depart : ces destinations savent revenir
 * d'un ecran noir (voir `armPageReveal`), un site tiers non.
 */
export const isInternalExit = (href: string) =>
  href === AUTH_HREF || href === JOBS_HREF;
