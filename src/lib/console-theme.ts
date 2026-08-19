/**
 * Theme de la console interne.
 *
 * Contrat CSS (voir src/styles/console.css) :
 *   - [data-app="console"] sur <body> active les tokens de la console.
 *     Pose sur <body> et non sur le shell pour que les portails Radix
 *     (Dialog, Select, cmdk) heritent eux aussi des tokens.
 *   - [data-theme="dark"] sur <html> bascule la console en sombre.
 *     Clair par defaut : l'absence d'attribut vaut clair.
 */

export type ConsoleTheme = "dark" | "light";

export const CONSOLE_DEFAULT_THEME: ConsoleTheme = "light";
export const CONSOLE_THEME_STORAGE_KEY = "jarvis-console-theme";

/** Routes servies par le shell console. Etendre au fil des etapes. */
export const CONSOLE_ROUTE_PREFIXES = [
  "/dashboard/rh",
  "/dashboard/salarie",
] as const;

export function isConsoleTheme(value: unknown): value is ConsoleTheme {
  return value === "dark" || value === "light";
}

export function readConsoleTheme(): ConsoleTheme {
  if (typeof document === "undefined") return CONSOLE_DEFAULT_THEME;
  const attribute = document.documentElement.getAttribute("data-theme");
  return isConsoleTheme(attribute) ? attribute : CONSOLE_DEFAULT_THEME;
}

export function writeConsoleTheme(theme: ConsoleTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  try {
    window.localStorage.setItem(CONSOLE_THEME_STORAGE_KEY, theme);
  } catch {
    // Stockage indisponible (navigation privee, quota) : le theme reste
    // applique pour la session en cours.
  }
}

/**
 * Store minimal pour brancher la bascule de theme sur useSyncExternalStore.
 *
 * La source de verite est l'attribut data-theme du document, pose par le
 * script inline avant l'hydratation. getServerSnapshot renvoie le defaut,
 * ce qui evite tout mismatch d'hydratation sans passer par un useEffect.
 */
type ThemeListener = () => void;
let themeListeners: ThemeListener[] = [];

export const consoleThemeStore = {
  subscribe(listener: ThemeListener) {
    themeListeners.push(listener);
    return () => {
      themeListeners = themeListeners.filter((entry) => entry !== listener);
    };
  },
  getSnapshot: readConsoleTheme,
  getServerSnapshot: (): ConsoleTheme => CONSOLE_DEFAULT_THEME,
  set(theme: ConsoleTheme) {
    if (readConsoleTheme() === theme) return;
    writeConsoleTheme(theme);
    for (const listener of themeListeners) listener();
  },
};

/**
 * Script pose en premier enfant de <body> par le layout racine.
 *
 * Il s'execute avant la peinture, ce qui evite deux flashs :
 *   - le flash clair quand l'utilisateur a choisi le theme clair ;
 *   - le flash du fond vitrine sur les routes de la console.
 *
 * Volontairement en ES5, sans dependance, et enveloppe dans un try/catch :
 * une erreur ici bloquerait le rendu de toute l'application.
 */
export const CONSOLE_BOOTSTRAP_SCRIPT = `(function(){try{
var k=${JSON.stringify(CONSOLE_THEME_STORAGE_KEY)};
var d=${JSON.stringify(CONSOLE_DEFAULT_THEME)};
var t=null;
try{t=window.localStorage.getItem(k)}catch(e){}
if(t!=="dark"&&t!=="light"){t=d}
document.documentElement.setAttribute("data-theme",t);
var p=window.location.pathname;
var r=${JSON.stringify(CONSOLE_ROUTE_PREFIXES)};
for(var i=0;i<r.length;i++){
if(p===r[i]||p.indexOf(r[i]+"/")===0){document.body.setAttribute("data-app","console");break}
}
}catch(e){}})();`;
