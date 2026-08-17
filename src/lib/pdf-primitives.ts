/**
 * Briques bas niveau communes aux trois generateurs PDF (CRA, facture, demande de conge).
 *
 * Ces fonctions etaient recopiees a l'identique dans `cra-pdf.ts`, `invoice-pdf.ts` et
 * `leave-pdf.ts`. Les copies avaient deja commence a diverger — `binaryStringToBytes`
 * existait en deux versions, et `normalizePdfText` en trois — sans qu'aucun mecanisme ne
 * signale l'ecart.
 *
 * INVARIANT DE TOUT LE MODULE : le contenu d'un PDF genere ici est garanti ASCII, parce que
 * `normalizePdfText` remplace tout caractere hors \x20-\x7E et que le flux binaire du logo
 * est encode en hexadecimal ASCII. Les trois fonctions d'encodage ci-dessous en dependent :
 * introduire du contenu non ASCII sans repasser par `normalizePdfText` desynchroniserait
 * silencieusement les `/Length` et tous les offsets de la table xref.
 */

/** Taille en octets, sous l'invariant ASCII ci-dessus. */
export function byteLength(value: string) {
  return typeof Buffer !== "undefined" ? Buffer.byteLength(value, "binary") : value.length;
}

/** Decode le logo. `Buffer` cote serveur, `atob` en repli navigateur. */
export function base64ToBytes(value: string) {
  if (typeof Buffer !== "undefined") {
    return Uint8Array.from(Buffer.from(value, "base64"));
  }

  const decoded = atob(value);
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }
  return bytes;
}

/** Flux d'image PDF : hexadecimal ASCII, deux caracteres par octet. */
export function bytesToHex(value: Uint8Array) {
  return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

const pdfTextEncoder = new TextEncoder();

/**
 * Encodage octet a octet du document.
 *
 * `TextEncoder` est environ 150x plus rapide que `Uint8Array.from(value, charCodeAt)` et
 * produit exactement les memes octets — mais uniquement grace a l'invariant ASCII du
 * module : en UTF-8, un caractere ASCII tient sur un octet.
 *
 * `invoice-pdf.ts` et `leave-pdf.ts` utilisaient la variante lente ; elles rendent bien les
 * memes octets (verifie par comparaison d'empreintes sur 16 documents de reference).
 */
export function binaryStringToBytes(value: string) {
  return pdfTextEncoder.encode(value);
}

const EURO_TOKEN = "__EURO__";

/**
 * Rend un texte imprimable dans un flux PDF : sans accents, sans caractere hors ASCII, avec
 * les parentheses et antislashs echappes.
 *
 * `euroSign` traite le symbole euro comme le glyphe WinAnsi `\200` au lieu de le remplacer
 * par une espace. Seule la facture l'active. Ce n'est **pas** un detail d'implementation :
 * l'activer partout changerait le rendu des CRA et des demandes de conge des qu'une donnee
 * saisie contient un « € » — un espace aujourd'hui, un symbole ensuite. Uniformiser est une
 * decision produit, pas une factorisation.
 */
export function normalizePdfText(value: string, options?: { euroSign?: boolean }) {
  if (!options?.euroSign) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x20-\x7E]/g, " ")
      .replace(/[()\\]/g, "\\$&");
  }

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u20AC/g, EURO_TOKEN)
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/[()\\]/g, "\\$&")
    .replace(new RegExp(EURO_TOKEN, "g"), "\\200");
}

let cachedLogoSource: string | null = null;
let cachedLogoHex: string | null = null;

/**
 * Logo base64 -> hexadecimal ASCII, memoise sur la derniere source.
 *
 * Le CRA memoisait, la demande de conge recalculait a chaque appel. Meme sortie : le cache
 * ne change que le cout. Il est ici pour que les deux en beneficient.
 */
export function logoHexFromBase64(logoRgbBase64: string) {
  if (cachedLogoSource === logoRgbBase64 && cachedLogoHex) {
    return cachedLogoHex;
  }

  const hex = bytesToHex(base64ToBytes(logoRgbBase64));
  cachedLogoSource = logoRgbBase64;
  cachedLogoHex = hex;
  return hex;
}

/**
 * Assemble le document PDF complet : objets, table xref, trailer.
 *
 * Les trois generateurs en avaient chacun une copie de 37 lignes, identiques a deux
 * variations pres, toutes deux representees ici en options :
 *
 * - `logoRgbBase64` ajoute l'objet XObject image et la ressource `/XObject` a la page. Le
 *   CRA et la demande de conge s'en servent ; la facture n'a jamais de logo.
 * - `winAnsi` ajoute `/Encoding /WinAnsiEncoding` aux deux polices. C'est ce qui fait rendre
 *   le glyphe `\200` en symbole euro : cette option va donc **de pair** avec `euroSign` de
 *   `normalizePdfText`. Seule la facture active les deux.
 *
 * Les offsets de la table xref sont calcules avec `byteLength` sur la chaine deja assemblee,
 * d'ou la dependance a l'invariant ASCII decrit en tete de module.
 */
export function createPdfString(
  content: string,
  options?: { logoRgbBase64?: string | null; winAnsi?: boolean },
) {
  const logoHex = options?.logoRgbBase64
    ? `${logoHexFromBase64(options.logoRgbBase64)}>`
    : null;
  const encoding = options?.winAnsi ? " /Encoding /WinAnsiEncoding" : "";

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
    logoHex
      ? "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> /XObject << /Im1 7 0 R >> >> >>"
      : "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>",
    `<< /Length ${byteLength(content)} >>\nstream\n${content}\nendstream`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica${encoding} >>`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold${encoding} >>`,
  ];

  if (logoHex) {
    objects.push(
      `<< /Type /XObject /Subtype /Image /Width 120 /Height 120 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${logoHex.length} >>\nstream\n${logoHex}\nendstream`,
    );
  }

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return pdf;
}

/** Commande PDF « ecrire ce texte a cette position ». */
export function createTextCommand(
  text: string,
  x: number,
  y: number,
  font: "F1" | "F2",
  size: number,
  options?: { euroSign?: boolean },
) {
  return `BT /${font} ${size} Tf ${x} ${y} Td (${normalizePdfText(text, options)}) Tj ET`;
}
