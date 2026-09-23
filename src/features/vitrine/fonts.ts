import { DM_Sans, Geist, Instrument_Serif } from "next/font/google";

/**
 * Polices de la vitrine.
 *
 * Declarees ici et non dans un layout parce que deux endroits en ont besoin, et
 * qu'ils ne sont pas dans la meme branche de l'arbre : le layout du groupe
 * (vitrine), et le pied de page — monte aussi sur les offres d'emploi, qui
 * vivent hors de ce groupe. Un `next/font` appele deux fois sur la meme famille
 * produirait deux jeux de fichiers ; une seule declaration partagee, non.
 *
 * Elles restent absentes du layout racine a dessein : la console, qui compte le
 * plus de routes, n'en utilise aucune et n'a pas a les precharger.
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Police plus douce (humaniste arrondie), pour les pages de contenu.
const dmSans = DM_Sans({
  variable: "--font-soft",
  subsets: ["latin"],
});

// Serif editoriale, pour les citations / la section mission.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

/**
 * Classes a poser sur un element pour que la typographie de la vitrine soit
 * disponible dans son sous-arbre.
 *
 * `vitrine-type` (globals.css) accompagne les variables : elle redirige
 * `--font-sans` vers Geist, ce que `html[data-site="vitrine"]` fait deja sur la
 * vitrine mais pas ailleurs.
 */
export const VITRINE_FONT_VARS = `${geistSans.variable} ${dmSans.variable} ${instrumentSerif.variable} vitrine-type`;
