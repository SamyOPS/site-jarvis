/**
 * Fondu d'entree sur les pages servies hors du groupe (vitrine).
 *
 * La vitrine sait couvrir l'ecran avant de partir — c'est `cover()` de
 * <PageTransition> — mais elle ne sait pas reveler la page d'arrivee : /auth et
 * /offres ont un autre layout, le composant qui portait le voile s'y demonte, et
 * le voile avec lui. La page surgissait donc d'un coup sur fond noir.
 *
 * Le relais se passe par le document. La vitrine arme un drapeau avant de
 * partir ; le script ci-dessous, execute avant la premiere peinture de la page
 * d'arrivee, repose le voile puis le dissipe. Les deux moities du fondu se
 * rejoignent sans que les deux layouts aient a se connaitre.
 *
 * TOUT EST EN JS NU, HORS DE REACT, et ce n'est pas un detail : un voile opaque
 * dont la disparition dependrait du montage d'un composant laisserait un ecran
 * noir definitif si l'hydratation echouait. Ici, seul un `setTimeout` peut
 * manquer a l'appel. Le voile est en outre `pointer-events: none` — meme
 * bloque, il ne rend pas la page inutilisable.
 */

/** Drapeau de passage, pose par la vitrine et consomme par la page d'arrivee. */
export const PAGE_REVEAL_STORAGE_KEY = "jc:reveal";

/**
 * Duree du fondu, en millisecondes.
 *
 * Doit rester egale a la transition CSS de `html[data-entering]` (globals.css,
 * section Vitrine) : c'est elle qui anime, ce delai ne fait que retirer
 * l'attribut une fois l'animation finie.
 */
export const PAGE_REVEAL_DURATION_MS = 500;

/**
 * Delai entre la premiere peinture et le debut de la revelation.
 *
 * Sans lui, le fondu commencerait sur une page a peine composee. Meme ordre de
 * grandeur que le temps de pose de <PageTransition> a l'arrivee (100 ms).
 */
const SETTLE_MS = 80;

/**
 * Arme le fondu pour la prochaine page.
 *
 * A appeler juste avant de quitter la vitrine, et seulement vers une page de
 * cette application : un drapeau pose avant un depart vers un site tiers
 * resterait en sessionStorage et declencherait un fondu parasite au retour.
 */
export function armPageReveal() {
  try {
    window.sessionStorage.setItem(PAGE_REVEAL_STORAGE_KEY, "1");
  } catch {
    // Stockage indisponible : on part sans fondu, ce qui reste correct.
  }
}

/**
 * Script pose en enfant de <body> par le layout racine, a la suite de celui de
 * la console.
 *
 * Volontairement en ES5, sans dependance, et enveloppe dans un try/catch : une
 * erreur ici bloquerait le rendu de toute l'application.
 */
export const PAGE_REVEAL_BOOTSTRAP_SCRIPT = `(function(){try{
var k=${JSON.stringify(PAGE_REVEAL_STORAGE_KEY)};
var armed=null;
try{armed=window.sessionStorage.getItem(k);window.sessionStorage.removeItem(k)}catch(e){}
if(!armed){return}
var r=document.documentElement;
r.setAttribute("data-entering","");
window.requestAnimationFrame(function(){window.requestAnimationFrame(function(){
window.setTimeout(function(){
r.setAttribute("data-entering","done");
window.setTimeout(function(){r.removeAttribute("data-entering")},${PAGE_REVEAL_DURATION_MS});
},${SETTLE_MS});
})});
}catch(e){}})();`;
