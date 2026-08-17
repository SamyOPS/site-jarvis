import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Logo en base64, pour l'incrustation dans les PDF generes.
 *
 * Le fichier etait relu du disque a chaque generation, dans quatre routes. Il ne change
 * jamais : une lecture par processus suffit.
 *
 * Deux de ces routes le lisaient AVANT de verifier le jeton d'acces : une requete non
 * authentifiee provoquait donc une lecture disque. Les routes migrees vers `withActor`
 * n'ont plus ce probleme, l'autorisation se faisant dans l'enveloppe.
 */
let cachedLogo: Promise<string> | null = null;

export function readPdfLogoBase64() {
  if (!cachedLogo) {
    cachedLogo = readFile(
      path.join(process.cwd(), "public", "logonoir-rgb120.b64"),
      "utf8",
    ).catch((error) => {
      // Un echec ne doit pas etre memorise : la tentative suivante doit pouvoir reussir.
      cachedLogo = null;
      throw error;
    });
  }
  return cachedLogo;
}
