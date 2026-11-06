/**
 * Contenu d'un article d'actualite : Markdown simplifie -> arbre de blocs.
 *
 * Le texte vient de la base et le site le rend en elements React construits un a un :
 * jamais de HTML brut, jamais de `dangerouslySetInnerHTML`. Un article ne peut donc pas
 * porter de script, quoi qu'on y colle. Les liens et les images ne sont retenus que pour
 * des adresses sures (https, chemins du site, mailto, tel) ; sinon ils restent du texte.
 *
 * Syntaxe reconnue, volontairement courte :
 *   # / ## Intertitre       ### Sous-intertitre
 *   - element de liste      1. element numerote
 *   > citation              ![texte alternatif](/Image/actualites/photo.jpg)
 *   ---  (separateur)       **gras**  *italique*  [lien](https://...)
 * Une ligne vide separe les paragraphes ; un simple retour a la ligne est conserve.
 * Une URL https nue devient un lien.
 */

export type NewsInline =
  | { type: "text"; text: string }
  | { type: "strong"; children: NewsInline[] }
  | { type: "em"; children: NewsInline[] }
  | { type: "link"; href: string; children: NewsInline[] };

export type NewsBlock =
  | { type: "heading"; level: 2 | 3; children: NewsInline[] }
  /** Une entree par ligne : le rendu les separe d'un saut de ligne. */
  | { type: "paragraph"; lines: NewsInline[][] }
  | { type: "list"; ordered: boolean; items: NewsInline[][] }
  | { type: "quote"; lines: NewsInline[][] }
  | { type: "image"; src: string; alt: string }
  | { type: "rule" };

/** Lien retenu : web, chemin du site, ancre, courriel, telephone. */
export function safeNewsHref(raw: string): string | null {
  const href = raw.trim();
  if (/^https?:\/\/[^\s]+$/i.test(href)) return href;
  if (/^\/(?!\/)[^\s]*$/.test(href)) return href;
  if (/^#[\w-]+$/.test(href)) return href;
  if (/^mailto:[^\s@]+@[^\s@]+$/i.test(href)) return href;
  if (/^tel:\+?[\d .-]+$/i.test(href)) return href;
  return null;
}

/** Image retenue : fichier du dossier public ou adresse https. */
export function safeNewsImageSrc(raw: string): string | null {
  const src = raw.trim();
  if (/^https:\/\/[^\s]+$/i.test(src)) return src;
  if (/^\/(?!\/)[^\s]+$/.test(src)) return src;
  return null;
}

const WORD_CHAR = /[\p{L}\p{N}]/u;

/** Fin d'une URL nue : la ponctuation finale appartient a la phrase, pas au lien. */
function bareUrlEnd(text: string, start: number) {
  let end = start;
  while (end < text.length && !/\s/.test(text[end])) end += 1;
  while (end > start && /[.,;:!?)\]»"']/.test(text[end - 1])) end -= 1;
  return end;
}

export function parseNewsInline(text: string): NewsInline[] {
  const out: NewsInline[] = [];
  let buffer = "";
  const flush = () => {
    if (buffer) out.push({ type: "text", text: buffer });
    buffer = "";
  };

  let index = 0;
  while (index < text.length) {
    // **gras**
    if (text.startsWith("**", index)) {
      const end = text.indexOf("**", index + 2);
      if (end > index + 2) {
        flush();
        out.push({ type: "strong", children: parseNewsInline(text.slice(index + 2, end)) });
        index = end + 2;
        continue;
      }
    }

    const char = text[index];

    // *italique* ou _italique_ — pas au milieu d'un mot pour « _ » (snake_case, URL).
    if (char === "*" || char === "_") {
      const end = text.indexOf(char, index + 1);
      const opensWord = index + 1 < text.length && !/\s/.test(text[index + 1]);
      const closesWord = end > index + 1 && !/\s/.test(text[end - 1]);
      const outsideWord =
        char === "*" ||
        (!WORD_CHAR.test(text[index - 1] ?? "") && !WORD_CHAR.test(text[end + 1] ?? ""));
      if (end > index + 1 && opensWord && closesWord && outsideWord) {
        flush();
        out.push({ type: "em", children: parseNewsInline(text.slice(index + 1, end)) });
        index = end + 1;
        continue;
      }
    }

    // [texte](adresse)
    if (char === "[") {
      const close = text.indexOf("](", index + 1);
      const end = close > index ? text.indexOf(")", close + 2) : -1;
      if (close > index + 1 && end > close + 2) {
        const href = safeNewsHref(text.slice(close + 2, end));
        if (href) {
          flush();
          out.push({ type: "link", href, children: parseNewsInline(text.slice(index + 1, close)) });
          index = end + 1;
          continue;
        }
      }
    }

    // URL nue, en debut de mot.
    if (
      (text.startsWith("https://", index) || text.startsWith("http://", index)) &&
      !/[^\s(«"']/.test(text[index - 1] ?? " ")
    ) {
      const end = bareUrlEnd(text, index);
      const href = safeNewsHref(text.slice(index, end));
      if (href) {
        flush();
        out.push({ type: "link", href, children: [{ type: "text", text: href }] });
        index = end;
        continue;
      }
    }

    buffer += char;
    index += 1;
  }

  flush();
  return out;
}

type OpenBlock =
  | { kind: "paragraph"; lines: string[] }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "quote"; lines: string[] };

export function parseNewsContent(content: string): NewsBlock[] {
  const blocks: NewsBlock[] = [];
  let open: OpenBlock | null = null;

  const flush = () => {
    if (!open) return;
    if (open.kind === "paragraph") {
      blocks.push({ type: "paragraph", lines: open.lines.map(parseNewsInline) });
    } else if (open.kind === "list") {
      blocks.push({ type: "list", ordered: open.ordered, items: open.items.map(parseNewsInline) });
    } else {
      blocks.push({ type: "quote", lines: open.lines.map(parseNewsInline) });
    }
    open = null;
  };

  for (const rawLine of content.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trim();

    if (!line) {
      flush();
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flush();
      // Le titre de la page est le seul h1 : « # » descend d'un niveau.
      blocks.push({
        type: "heading",
        level: heading[1].length === 3 ? 3 : 2,
        children: parseNewsInline(heading[2].replace(/\s+#+$/, "")),
      });
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flush();
      blocks.push({ type: "rule" });
      continue;
    }

    const image = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(line);
    if (image) {
      const src = safeNewsImageSrc(image[2]);
      if (src) {
        flush();
        blocks.push({ type: "image", src, alt: image[1].trim() });
        continue;
      }
    }

    const bullet = /^[-*•]\s+(.+)$/.exec(line);
    const numbered = bullet ? null : /^\d+[.)]\s+(.+)$/.exec(line);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      const item = (bullet ?? numbered)![1];
      if (open?.kind === "list" && open.ordered === ordered) {
        open.items.push(item);
      } else {
        flush();
        open = { kind: "list", ordered, items: [item] };
      }
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      if (open?.kind === "quote") {
        open.lines.push(quote[1]);
      } else {
        flush();
        open = { kind: "quote", lines: [quote[1]] };
      }
      continue;
    }

    if (open?.kind === "paragraph") {
      open.lines.push(line);
    } else {
      flush();
      open = { kind: "paragraph", lines: [line] };
    }
  }

  flush();
  // Une citation faite de lignes vides (« > » seul) ne rend rien.
  return blocks.filter((block) => block.type !== "quote" || block.lines.some((line) => line.length));
}

function inlineText(nodes: NewsInline[]): string {
  return nodes.map((node) => (node.type === "text" ? node.text : inlineText(node.children))).join("");
}

/** Texte brut de l'article, sans balisage : temps de lecture, chapo de secours. */
export function newsPlainText(blocks: NewsBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "heading":
          return inlineText(block.children);
        case "paragraph":
        case "quote":
          return block.lines.map(inlineText).join(" ");
        case "list":
          return block.items.map(inlineText).join(" ");
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join(" ");
}

/** Minutes de lecture, a 200 mots par minute, au moins une. */
export function newsReadingMinutes(blocks: NewsBlock[]): number {
  const words = newsPlainText(blocks).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Chapo de secours : le debut du premier paragraphe, coupe sur un mot. */
export function newsFallbackExcerpt(blocks: NewsBlock[], maxLength = 220): string {
  const first = blocks.find((block) => block.type === "paragraph");
  if (!first || first.type !== "paragraph") return "";
  const text = first.lines.map(inlineText).join(" ").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.]+$/, "")}…`;
}
