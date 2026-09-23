// Verrou de défilement à compteur : plusieurs sources peuvent verrouiller le
// scroll (le menu ouvert, la « porte » du hero…). On ne le déverrouille que
// lorsque toutes les sources ont relâché leur verrou.
let count = 0;

/*
  Largeur de la barre de défilement au moment du verrouillage, restituée en
  padding.

  Sur la vitrine elle vaut zéro : la barre native y est masquée, il n'y a rien à
  compenser. Mais le menu est aussi monté sur les offres d'emploi, qui gardent la
  barre du système. L'y faire disparaître d'un `overflow: hidden` élargirait la
  zone de rendu, et toute la page glisserait de sa largeur — un sursaut visible
  juste avant que le panneau ne la recouvre.

  Le padding va sur <html> et non sur <body> : les éléments du menu sont en
  `position: fixed`, donc calés sur la fenêtre et non sur cette boîte. Ils ne
  bougent pas, seul le contenu qui défilait reste en place.
*/
let gutterPx = 0;

export function lockScroll() {
  count += 1;
  if (count !== 1) return;

  const root = document.documentElement;
  gutterPx = window.innerWidth - root.clientWidth;
  root.style.overflow = "hidden";
  if (gutterPx > 0) root.style.paddingRight = `${gutterPx}px`;
}

export function unlockScroll() {
  if (count === 0) return;
  count -= 1;
  if (count !== 0) return;

  const root = document.documentElement;
  root.style.overflow = "";
  if (gutterPx > 0) root.style.paddingRight = "";
  gutterPx = 0;
}
