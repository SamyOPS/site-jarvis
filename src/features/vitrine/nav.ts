// Liens de navigation partagés par le menu (panneau latéral) et le footer :
// une seule source de vérité, pour qu'un renommage de section (ex. « Offres »
// devenue « Formations ») n'ait pas à être répercuté à deux endroits.

// Destinations hors du groupe (vitrine) : l'espace connecte et les offres d'emploi.
// Elles font partie de cette application — la vitrine, les offres et la console sont
// un seul deploiement — mais sous un autre layout (ni fondu de page, ni meme menu) :
// on les rejoint comme une sortie, voir `leavesVitrine` plus bas.
//
// Declarees AVANT `mainLinks`, qui s'en sert : une `const` lue avant sa ligne de
// declaration fait echouer le chargement du module.
export const AUTH_HREF = "/auth";
export const JOBS_HREF = "/offres";

export const mainLinks = [
  { label: "Accueil", href: "/" },
  // Sections de l'accueil, qui porte toute la vitrine (/decouvrir y redirige).
  { label: "Expertises", href: "/#expertises" },
  { label: "Formations", href: "/#formations" },
  /*
   * Mene directement a la PAGE des offres, et non au bandeau de l'accueil.
   *
   * /offres est hors du groupe (vitrine) : c'est une sortie. Le pied de page et le menu
   * testent tous deux `leavesVitrine` et l'empruntent avec le voile noir et une navigation
   * de document, comme « Acceder a mon espace ».
   */
  { label: "Offres d'emploi", href: JOBS_HREF },
  // Page du groupe (vitrine) : le menu et le pied de page y vont par `onNav`, avec le fondu.
  { label: "Actualités", href: "/actualites" },
  { label: "FAQ", href: "/#faq" },
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

// Colonne « Membre de Jarvis » du PIED DE PAGE seulement : le panneau du menu ne
// l'affiche plus (la connexion y reste par l'icone de la barre). « Voir toutes les
// offres » n'y figure plus non plus : l'entree principale « Offres d'emploi » mene
// desormais elle-meme a la page des offres.
export const memberLinks = [{ label: "Accéder à mon espace", href: AUTH_HREF }];

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
