/**
 * Recettes de classes de la page de connexion (style « vitrine editoriale ») :
 * noir, blanc et echelle zinc, champs soulignes, boutons en pastille.
 */

// Mot d'accroche serif au-dessus d'un titre.
export const KICKER =
  "ml-[0.1em] block font-quote text-[clamp(1.1rem,3.5vw,2.5rem)] italic leading-none";

// Champ : filet bas, sans cadre ni arrondi.
export const FIELD =
  "h-12 w-full rounded-none border-0 border-b border-zinc-900/25 bg-transparent px-0 text-base text-zinc-900 placeholder:text-zinc-900/40 focus:border-zinc-900 focus:outline-none";

export const LABEL =
  "block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-900/50";

// Bouton principal.
export const PILL_PRIMARY =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-zinc-900 px-8 py-3 text-center text-sm font-semibold uppercase tracking-[0.2em] text-white transition-colors duration-300 hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-50";

export const PILL_SECONDARY =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-zinc-900 px-8 py-3 text-center text-sm font-semibold uppercase tracking-[0.2em] text-zinc-900 transition-colors duration-300 hover:bg-zinc-900 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900";

// Lien texte ; enfant TRACE pour le soulignement anime.
export const TEXT_LINK =
  "group relative inline-flex items-center gap-2 text-sm font-semibold text-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900";

export const TRACE =
  "absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-current transition-transform duration-500 ease-out group-hover:scale-x-100";

// Message d'erreur/info : monochrome, l'icone porte le sens.
export const MESSAGE =
  "flex items-start gap-3 border-l-2 border-zinc-900 py-1 pl-4 text-sm leading-relaxed text-zinc-900";
